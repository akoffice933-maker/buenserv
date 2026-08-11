# BuenServ Bot Architecture

BuenServ построен как **Telegram-first marketplace**, но бот не хранит собственную параллельную бизнес-логику. Он является входом, коммуникационным слоем и каналом уведомлений для единого backend в Supabase.

```
Website / Telegram Bot / Mini App
                │
                ▼
          Supabase + RPC
                │
                ▼
providers / leads / lead_events / outbox
```

---

## 1. Роли Telegram-слоя

В системе есть три Telegram-интерфейса.

1. **Public bot** `@BuenServ_bot`
   - клиентский вход
   - регистрация исполнителя
   - Mini App
   - поддержка
   - жалобы
   - уведомления по заявкам

2. **Telegram Mini App**
   - личный кабинет клиента
   - кабинет исполнителя
   - onboarding исполнителя
   - входящие и исходящие заявки
   - безопасные lifecycle-действия

3. **Admin bot**
   - очередь модерации
   - approve / reject исполнителей
   - жалобы
   - support requests

---

## 2. Главный public bot

### `/start`

Когда человек пишет `/start`, бот:
1. Telegram update → webhook secret validation
2. update idempotency check
3. Поиск / создание canonical profile
4. Приветствие + Mini App button + выбор языка + поддержка

Пользователь получает кнопку **Open Mini App**, которая открывает `/mini-app` — личный кабинет, где пользователь видит:
- свой статус как исполнителя, если есть provider profile
- заявки, созданные как клиент
- заявки, полученные как исполнитель

### Выбор языка

Inline-кнопки `Español` / `Русский` / `English` передают callback data `lang_es-AR` / `lang_ru` / `lang_en`. Webhook обрабатывает `callback_query`, сохраняет язык в `profiles.locale` и отправляет подтверждение на выбранном языке.

---

## 3. Регистрация исполнителя

Исполнитель начинает через `/start provider` или `/provider`.

Путь:
```
/start provider → provider_onboarding_session → Mini App onboarding
→ verified Telegram initData → canonical profile → provider draft
→ Telegram photo → submit_provider RPC → status = pending
→ admin moderation → approved / rejected / suspended
```

### Что делает Mini App onboarding

Исполнитель вводит: категорию, район, описание опыта, ориентировочную цену в ARS.

Mini App не создаёт provider напрямую. Она отправляет данные в `POST /api/mini-app/submit`. Backend:
1. initData HMAC validation → Telegram user identity
2. `profiles.telegram_user_id`
3. `provider_onboarding_sessions` draft → step = photo
4. Telegram prompt: отправьте фото в чат

Фото отправляется непосредственно в Telegram-чат, а не через публичную форму Mini App. Это уменьшает поверхность небезопасной загрузки файлов до появления отдельного secure photo worker.

После отправки фото и подтверждения данных бот вызывает канонический `submit_provider()`. Именно RPC переводит профиль в `pending`.

---

## 4. Кабинет клиента и исполнителя

Mini App не доверяет данным из браузера о роли или владельце заявки. Каждый запрос проходит:
```
Telegram WebApp initData → HMAC SHA-256 validation
→ auth_date freshness validation → Telegram user ID
→ profiles.telegram_user_id → canonical profile ID
→ server-side ownership / RBAC
```

Клиент не может передать `profile_id` другого пользователя, `provider_id` другого исполнителя, `role = provider` или `actor_type = admin` и получить доступ.

### Данные кабинета

`GET /api/mini-app/dashboard` возвращает только:
- `customerLeads` — leads, где `customer_profile_id = verified profile`
- `providerLeads` — leads provider profile пользователя
- `provider` — профессиональный профиль текущего пользователя, если он существует

---

## 5. Lead lifecycle

Lead — это не просмотр карточки исполнителя. `profile view ≠ lead`. Lead появляется только при настоящем contact flow.

### Модель
- `leads` — текущее summary-состояние
- `lead_events` — неизменяемая история фактов

### Lifecycle
```
created → customer_contacted → provider_notified → provider_opened
→ provider_replied → customer_replied → completed
```
Либо: `cancelled` / `expired`

### Summary статусы
```
created / contacted / provider_replied / success / no_response / cancelled
```

### record_lead_event() RPC
1. Проверяет idempotency
2. Lock-ит lead row
3. Проверяет допустимость перехода
4. Добавляет immutable event
5. Атомарно обновляет summary status
6. Создаёт notification outbox record, когда policy требует notification

Прямой `UPDATE leads.status` запрещён trigger-ом. `lead_events` immutable — нельзя изменить или удалить.

---

## 6. Действия в Mini App

`POST /api/mini-app/leads/<lead-id>/action` принимает закрытый набор действий:
- `provider_opened`
- `provider_replied`
- `customer_replied`
- `completed`
- `cancelled`

Сервер определяет actor сам:
- Клиент: `customer_replied`, `cancelled`, `completed`
- Исполнитель: `provider_opened`, `provider_replied`, `completed`

Затем вызывается `record_lead_event()` с idempotency key: `lead_id + verified profile_id + action + client idempotency UUID` → `external_id`. Повтор одного действия возвращает уже существующий event, а не создаёт новый.

---

## 7. Notification outbox

Когда lifecycle-событие требует уведомления, Telegram не вызывается прямо из database transaction. Вместо этого `record_lead_event()` в одной транзакции:
1. `lead_events` insert
2. `leads` update
3. `notification_outbox` insert

### Policy
```
provider_notified → provider_lead_notification → recipient = provider.profile_id
provider_replied → customer_provider_reply → recipient = lead.customer_profile_id
```

### Worker
`node scripts/deliver-telegram-outbox.mjs`:
1. `claim_notification_outbox()`
2. Telegram `sendMessage`
3. `complete_notification_outbox()` или `fail_notification_outbox()` → retry with backoff

### Почему нужен outbox
Если Telegram временно недоступен:
- lead ✓ сохранён
- lead_event ✓ сохранён
- outbox task ✓ сохранена
- Telegram message ✗ будет повторена позже

Это безопаснее, чем: создать lead → отправить Telegram message → Telegram error → rollback / потерянная заявка.

Гарантия: database events идемпотентны, Telegram delivery at-least-once.

---

## 8. Поддержка и жалобы

### Поддержка
`/start support` или Support callback → `telegram_support_sessions` → пользователь пишет сообщение → `submit_support_request` RPC → `support_requests` → admin/support queue. Rate limit: 5 authenticated support requests / profile / hour.

### Жалоба на исполнителя
Public provider profile → report flow, или `/start report_<provider_uuid>` → `telegram_report_sessions` → причина → детали → `reports` → moderation queue.
- Authenticated profile: 5 reports / hour
- Anonymous public fallback: 3 reports / hashed network key / hour

---

## 9. Admin bot

Admin bot отделён от public bot: отдельный token, отдельный webhook secret, отдельная update idempotency table.

Команды: `/start`, `/help`, `/pending`, `/approve <provider-id>`, `/reject <provider-id> <reason>`, `/reports`, `/support`.

Авторизация:
1. Telegram webhook проверяется через `x-telegram-bot-api-secret-token` → `timingSafeEqual`
2. Server-side: `profiles.telegram_user_id` → `role in admin / moderator`

---

## 10. Защита webhook-ов

У public и admin bot используются разные secrets: `TELEGRAM_WEBHOOK_SECRET` и `TELEGRAM_ADMIN_WEBHOOK_SECRET`.

Каждый incoming update:
1. `x-telegram-bot-api-secret-token` validation → timing-safe compare
2. Telegram update idempotency
3. Business processing
4. `processed_at`

Повтор Telegram update не должен повторно: создать onboarding draft, отправить provider, создать жалобу, создать support request, изменить moderation state.

---

## 11. Что ещё не завершено

Кодовая архитектура готова, но следующие внешние проверки ещё важны:
1. Реальная Telegram delivery outbox worker-ом
2. Provider получает notification в настоящем Telegram
3. Provider reply создаёт customer outbox notification
4. Customer получает Telegram notification
5. Completion semantics: `provider_service_completed` → `customer_completion_confirmed` → `success`
6. Admin bot token и первый admin bootstrap
7. Vercel deployment, canonical domain, production webhooks
8. Secure public photo processing pipeline

---

### Коротко
- **Bot** → вход, onboarding, support, reports, notifications
- **Mini App** → личные кабинеты и marketplace actions
- **Supabase RPC** → единственная business source of truth
- **Lead events** → immutable lifecycle facts
- **Outbox worker** → надёжная Telegram delivery вне DB transaction