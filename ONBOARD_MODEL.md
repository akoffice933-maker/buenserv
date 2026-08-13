Цель

Краткое руководство для новой модели/агента: быстро понять статус проекта, правила безопасности и последовательность действий для верификации и реализации interaction layer (lead messages + bidirectional notifications).

Короткий контекст

- Проект: Telegram-first marketplace (Next.js app + Supabase).
- Текущий упор: доказать рабочую петлю customer → provider → provider reply → customer, через outbox + доставку ботом.
- Уже реализовано: transactional lead lifecycle, outbox таблица и GitHub Actions scheduler, protected Vercel cron route, Telegram deliver worker.
- Недостаёт: модель сообщений `lead_messages`, bidirectional Mini App UI, admin notification channel, completion semantics.

Ключевые файлы и места

- `buenserv/supabase/migrations/025_lead_notification_outbox.sql` — outbox table + RPCs
- `buenserv/supabase/migrations/027_admin_action_tokens.sql` … `029_*.sql` — административные миграции
- `buenserv/apps/web/scripts/staging-provider-reply-smoke.mjs` — безопасный smoke-скрипт (explicit LEAD_SMOKE_* IDs)
- `buenserv/apps/web/scripts/deliver-telegram-outbox.mjs` — local worker for outbox delivery
- `buenserv/.github/workflows/outbox-delivery.yml` — scheduler workflow
- Mini App routes: `apps/web/src/app/mini-app/...`

Безопасность и ограничители (обязательно)

- Никогда не вызывать `claim_notification_outbox()` для диагностики — это мутационный RPC, использующийся только worker-ом. Для проверки использовать только SELECT.
- Smoke-скрипты должны требовать явные `LEAD_SMOKE_*` env vars; ни в коем случае не авто-выбирать provider из approved set.
- Не публиковать `telegram_user_id` или реальные токены в чате.
- Outbox delivery может отправлять реальные сообщения — перед запуском scheduler убедиться, что recipient-ы — internal test accounts.

Короткий план действий (фазы)

Фаза 0 — стабилизация (текущая):
1. Deploy latest commit на staging/Vercel.
2. Применить миграции 027–029 (backup перед применением).
3. Проверить workflow scheduler и protected cron route.
4. Запустить safe smoke `staging-provider-reply-smoke.mjs` с explicit IDs и подтвердить pending outbox rows.

Фаза 1 — messages (P0):
1. Добавить миграцию `030_lead_messages.sql` (таблица + индексы + RLS).
2. Реализовать `send_lead_message` RPC: атомарно вставляет message, создает lead_event, и enqueue outbox для другой стороны.
3. Минимальный UI в Mini App для provider → reply, customer → reply.
4. Integration smoke: provider пишет → customer получает outbox → customer webapp показывает сообщение.

Фаза 2 — completion semantics + admin channel

- Реализовать `provider_service_completed` и `customer_completion_confirmed` events.
- Добавить `notification_outbox.bot_kind` и delivery через `TELEGRAM_ADMIN_BOT_TOKEN`.

Smoke- и тестовые процедуры

- Всегда использовать explicit LEAD_SMOKE_* env vars (в `.env.local`) для staging smoke.
- Диагностика outbox (read-only):
  - SELECT * FROM notification_outbox WHERE lead_id = '<lead_id>' ORDER BY created_at;
  - SELECT * FROM notification_outbox WHERE status = 'processing' ORDER BY locked_at DESC;
- Scheduler run: проверить GitHub Actions output (`claimed`, `sent`) и затем DB (status=sent, telegram_message_id IS NOT NULL).

## Staging operations

Перед любыми manual smoke, outbox delivery или Telegram E2E следуйте:

[Staging Operator Runbook](docs/STAGING_OPERATOR_RUNBOOK.md)

Примеры команд (psql / PowerShell)

- Backup:
  pg_dump --format=custom --file=backup_before_migrations.dump "$PGCONN"
- Apply migration:
  psql "$PGCONN" -v ON_ERROR_STOP=1 -f supabase/migrations/027_admin_action_tokens.sql

Контрольные точки и acceptance

- Для каждой миграции: backup → apply → smoke basic read-only checks.
- Для messages: unit tests for RPC ownership/validation + staging E2E smoke (internal accounts).

Кому писать при проблемах

- Если DB ошибки: сообщить администратору базы (контакт в README внутреннего проекта).
- Если delivery шлет реальные пользователи: немедленно disable GitHub Actions workflow и отменить pending тесты.

Примечание

Этот файл — краткая инструкция для новой модели/агента. Для детальных шагов (SQL, RPC спецификация, UI изменения) есть отдельные задачи в TODO list и миграции в `supabase/migrations/`.

Недавние изменения

- **Миграции 030–031 применены**: `030_lead_messages.sql` и `031_lead_message_immutability.sql` были применены к staging/тестовой базе. Перед применением сохранён дамп `backup_before_migrations.dump`.
- **`lead_messages` и `send_lead_message`**: таблица `lead_messages` присутствует, триггер неизменности включён, и доступен RPC `send_lead_message` (атомарно вставляет сообщение, создаёт `lead_event` и ставит запись в `notification_outbox`).
- **Staging smoke — результаты**: безопасный smoke-скрипт `staging-provider-reply-smoke.mjs` использует явные `LEAD_SMOKE_*` ID и показал корректное создание lead_events и pending записей в `notification_outbox` (пример lead: `e47af495-...`, также имеются проверки по `851117e5-...`). Некоторые ручные попытки доставки Telegram терпели неудачу из-за выбора бот-профилей — тесты скорректированы на internal non-bot профили.
- **Ограничения и предостережения**: ни в коем случае не использовать `claim_notification_outbox()` в диагностике (это мутационный RPC). Всегда проверять `telegram_user_id` и что профиль не является ботом перед попыткой отправки.

Краткие следующие шаги

- Запустить read-only проверки для конкретного internal lead (использовать placeholder `<INTERNAL_LEAD_ID>` в документации; реальный ID запускать только в Supabase SQL Editor) — выполнить SELECTы по `lead_messages`, `lead_events`, `notification_outbox`.
- Выполнить provider→customer flow через `send_lead_message` (с явными LEAD_SMOKE_* ID) и затем запустить доставку outbox (GitHub Action или `deliver-telegram-outbox.mjs`). Проверить, что `status = 'sent'`, `telegram_message_id IS NOT NULL`, `sent_at IS NOT NULL`.
- Применить миграции `027`–`029` в staging после бекапа, и добавить delivery для `TELEGRAM_ADMIN_BOT_TOKEN` (admin channel) как отдельную итерацию.
- Добавить минимальный UI в Mini App для provider/customer reply и покрыть критические RPC юнит тестами.
