# BuenServ — план до production и полной монетизации

**Версия:** 1.0  
**Дата:** 06.08.2026  
**Статус:** рабочий roadmap

## 1. Продуктовые принципы

- BuenServ — локальная площадка бытовых услуг для Buenos Aires, а не крипто-маркетплейс.
- Основной пользовательский сценарий проходит через Telegram.
- Сайт выполняет роль доверительной витрины, SEO-каталога и точки входа в бот.
- Основная отображаемая валюта — ARS.
- USD и USDT могут быть только вариантами договорённости клиента и исполнителя.
- Платформа не должна показывать публичные адреса кошельков, обменивать валюту, хранить средства или позиционироваться как платёжный сервис.
- Запуск начинается с ограниченного числа категорий и районов, где можно обеспечить плотность предложения.

---

## 2. MVP Scope

### Входит в MVP

1. Публичный сайт и SEO-каталог на Español (AR), Русском и English.
2. Категории, районы, карточки исполнителей, рейтинги, отзывы и публичные профили.
3. Telegram bot для поиска, контакта, регистрации исполнителя, отзывов и жалоб.
4. Веб-админка для модерации исполнителей, жалоб, категорий и районов.
5. Deep-link переходы в Telegram (`start=performer_[id]`, категории, источники трафика).
6. Legal, privacy, cookies, контактная форма и безопасность.

### Не входит в MVP

- Escrow и удержание средств;
- встроенный приём платежей;
- обмен ARS / USD / USDT;
- публичные кошельки и QR-коды оплаты;
- полноценные личные кабинеты;
- автоматическое ценообразование;
- запуск по всей Аргентине;
- большой набор неподтверждённых спросом категорий.

---

## 3. Запусковые категории и районы

### Категории

| Приоритет | Категория |
|---:|---|
| 1 | Limpieza / Уборка |
| 2 | Reparaciones / Ремонт |
| 3 | Electricidad / Электрика |
| 4 | Mascotas / Питомцы |
| 5 | Mudanzas / Переезды |
| 6 | Mensajería / Курьеры |
| 7 | Taxi y traslados / Такси и трансферы |

### Районы первой волны

Palermo, Recoleta, Belgrano, Caballito, Villa Crespo, Almagro, Núñez, San Telmo.

---

## 4. Этапы реализации

| Этап | Содержание | Срок | Критерий готовности |
|---|---|---:|---|
| 1. Foundation | MVP scope, data model, legal review, analytics plan | 2–3 недели | Утверждены правила продукта и оплаты |
| 2. Production design | Компоненты, токены, Next.js migration plan, i18n | 4–6 недель | Все ключевые сценарии готовы на ES/RU/EN |
| 3. Bot MVP | Поиск, профили, регистрация исполнителя, отзывы, жалобы | 4–6 недель | Рабочий Telegram-first flow |
| 4. SEO catalogue | ISR/SSG страницы категорий и профилей, schema.org | 3–5 недель | Индексируемые страницы и deep-links |
| 5. Supply acquisition | Рекрутинг и модерация первых исполнителей | 8–12 недель | 50–80 качественных профилей |
| 6. Soft launch | Закрытое тестирование, support, корректировки | 2–4 недели | Первые реальные обращения и отзывы |
| 7. Public launch | SEO, комьюнити, партнёрства, paid tests | после soft launch | Повторяемая воронка спроса |
| 8. Monetization pilot | Pro, featured, paid qualified leads | месяц 6+ | Подтверждённая готовность исполнителей платить |

---

## 5. Целевой production stack

```text
Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui + Radix UI
Motion: Motion + Anime.js + Lottie-web
Backend: Node.js / NestJS или Next.js API routes
Database: PostgreSQL + Prisma или Drizzle
Cache / rate limit: Redis
Bot: Telegram Bot API + webhooks
Analytics: PostHog или Plausible
Errors: Sentry
Admin: shadcn/ui / Mantine + TanStack Table + Tremor
```

### Ключевые компоненты

- Button, TelegramCTA, LanguageSwitcher;
- ProviderCard, CategoryCard, Rating, Avatar, Badge;
- FilterSheet, Pagination, Skeleton, EmptyState;
- FAQAccordion, FeedbackForm, ReportForm;
- Toast, Dialog, moderation table, audit log.

---

## 6. Многоязычность

### URL

```text
/es/...
/ru/...
/en/...
```

### Требования

- `hreflang`: `es-AR`, `ru`, `en`;
- Spanish copy — Rioplatense / voseo;
- ключи переводов в i18n-файлах;
- все ключевые экраны проверяются на ES/RU/EN;
- даты для Buenos Aires: `DD/MM/YYYY`;
- числовые форматы зависят от выбранной локали;
- никаких флагов как единственного обозначения языка.

---

## 7. Telegram flows

### Клиент

```text
Сайт / SEO
→ Telegram deep-link
→ категория
→ район
→ исполнитель
→ контакт
→ договорённость
→ отзыв или жалоба
```

### Исполнитель

```text
Telegram start
→ категория
→ районы
→ фото и описание
→ цены «от» в ARS
→ подтверждение правил
→ moderation queue
→ approval / corrections
→ опубликованный профиль
```

### Примеры tracking deep-links

```text
?start=performer_204
?start=category_limpieza
?start=source_seo_palermo
?start=source_instagram
```

---

## 8. Trust & Safety

### Модерация

Проверяются: фотография, описание, категории, район, цена «от», отсутствие запрещённого контента и публичных платёжных реквизитов.

### Жалобы

- профиль не соответствует услуге;
- исполнитель не отвечает;
- спам;
- агрессивное поведение;
- возможное мошенничество;
- некорректный контент;
- неверный район.

### SLA

| Приоритет | Реакция |
|---|---:|
| Безопасность / возможное мошенничество | до 4 часов |
| Жалоба на контент | до 24 часов |
| Некорректный профиль | до 48 часов |

---

## 9. Growth plan

### Supply: исполнители

Каналы: Telegram-группы BA, Facebook- и WhatsApp-комьюнити, Instagram, районные сообщества, релокационные партнёры, рефералы и офлайн-рекрутинг.

| Период | Цель активных профилей |
|---|---:|
| До public launch | 50–80 |
| Месяц 1 | 150 |
| Месяц 3 | 300–400 |
| Месяц 6 | 700–1 000 |
| Месяц 12 | 2 000+ |

### Demand: клиенты

Каналы: Google Search, SEO, Instagram, TikTok, Telegram/WhatsApp/Facebook-группы, expat-комьюнити, coworking, relocation agencies и реферальные рекомендации.

### SEO priority

- limpieza en Palermo;
- electricista en Belgrano;
- traslado a Ezeiza desde Palermo;
- pet sitter en Belgrano;
- handyman for expats in Buenos Aires;
- русскоязычные гайды по бытовым услугам в BA.

---

## 10. Монетизация

### Фаза A — ликвидность, месяцы 0–6

- Клиенты: бесплатно.
- Исполнители: 0% первые шесть месяцев.
- Цель: качественный supply, быстрые ответы, реальные отзывы и повторные обращения.

### Фаза B — pilot, месяцы 6–9

1. **Featured placement** — ограниченные и явно маркированные рекламные позиции.
2. **Pro profile** — расширенная видимость, больше районов, аналитика, приоритетный review.
3. **Paid qualified leads** — пилот только в 1–2 категориях с понятным спросом.

### Фаза C — scale, месяцы 9–12

```text
Free profile
Pro monthly subscription
Paid qualified leads
Featured placement
B2B / relocation partnerships
```

Платные функции нельзя вводить до подтверждения, что исполнитель получает регулярные релевантные обращения.

---

## 11. KPI

### Клиентская воронка

| Метрика | Ранняя цель |
|---|---:|
| Landing → Telegram CTR | 12–25% |
| Каталог → профиль | 15–30% |
| Профиль → Telegram CTR | 20–35% |
| Ответ исполнителя в течение 1 часа | 70%+ |
| Ответ в течение 24 часов | 90%+ |
| Повторное обращение за 90 дней | 20%+ |
| Жалобы на 100 контактов | < 3 |

### Исполнительская воронка

| Метрика | Цель |
|---|---:|
| Start onboarding → completed profile | 55%+ |
| Submitted → approved | 70%+ |
| Approved → first inquiry in 30 days | 60%+ |
| Active providers after 30 days | 65%+ |
| Active providers after 90 days | 45%+ |

**North Star Metric:** число успешно состоявшихся и положительно оценённых контактов между клиентом и исполнителем.

---

## 12. Soft Launch checklist

### Product

- [ ] 50–80 проверенных исполнителей;
- [ ] 5+ категорий и 4+ района;
- [ ] стабильные Telegram deep-links;
- [ ] каталог связан с базой данных;
- [ ] отзывы, жалобы, empty/loading/error states;
- [ ] ключевые страницы доступны в ES/RU/EN;
- [ ] `/admin` закрыт от индексации;
- [ ] публичные кошельки отсутствуют во всех web-screen'ах.

### Legal

- [ ] Terms;
- [ ] Privacy;
- [ ] Cookies;
- [ ] правила исполнителей;
- [ ] review policy;
- [ ] legal review формулировок ARS/USD/USDT;
- [ ] процедура удаления и обработки персональных данных.

### Growth

- [ ] первые testimonials;
- [ ] analytics: source → Telegram → outcome;
- [ ] onboarding исполнителей;
- [ ] referral mechanics;
- [ ] SEO pages и партнёрские каналы.

---

## 13. План на 12 месяцев

| Период | Главный результат |
|---|---|
| Месяц 1 | Product foundation, legal review, data model |
| Месяц 2–3 | Production MVP: сайт, каталог, bot, admin |
| Месяц 3 | 50–80 проверенных исполнителей |
| Месяц 4 | Soft launch и первые реальные отзывы |
| Месяц 5–6 | 300+ активных профилей, поиск PMF |
| Месяц 7–8 | SEO growth и relocation partnerships |
| Месяц 8–9 | Pro / featured / paid leads pilot |
| Месяц 10–12 | 1 000+ исполнителей и масштабирование дохода |

---

## 14. Ближайшие 10 действий

1. Зафиксировать MVP-категории и районы.
2. Привлечь аргентинского юриста для review payment/legal copy.
3. Утвердить Telegram onboarding и data model.
4. Перенести prototype в Next.js + Tailwind + shadcn/ui.
5. Поднять PostgreSQL и API профилей.
6. Реализовать moderation queue и жалобы.
7. Подготовить 50 первых качественных профилей.
8. Подключить PostHog/Plausible и Sentry.
9. Запустить закрытый soft launch.
10. Измерять подтверждённый outcome, а не только клики.

> Главный риск BuenServ — marketplace liquidity. В первые месяцы приоритетом должны быть плотность предложения, качество профилей, скорость ответа и доверие, а не агрессивная монетизация.
