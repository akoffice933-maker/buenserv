# BuenServ — план по эквайрингу и приёму оплат

**Версия:** 1.0  
**Дата:** 06.08.2026  
**Рынок:** Buenos Aires, Argentina

> Рабочая гипотеза: под «эквайрингом» понимается приём онлайн-оплат за продукты BuenServ. Этот документ не является юридической, налоговой или платёжной консультацией; до запуска нужен review аргентинского юриста, бухгалтера и выбранного PSP / acquiring partner.

---

## 1. Главный принцип

На MVP и ранних этапах BuenServ принимает оплату **только за собственные платформенные продукты**:

- Pro-подписка исполнителя;
- Featured-размещение;
- пакеты qualified leads;
- B2B / relocation-пакеты;
- возможные будущие SaaS-инструменты.

BuenServ **не принимает средства клиента за услугу исполнителя** и не удерживает/не распределяет оплату между сторонами.

```text
Клиент ───────────────→ Исполнитель
  оплата услуги напрямую, вне BuenServ

Исполнитель / B2B ───→ BuenServ
  оплата Pro, Featured, leads и B2B-продуктов через PSP
```

Это уменьшает юридическую, операционную и финансовую сложность MVP.

---

## 2. Что не входит в эквайринг BuenServ

- escrow;
- split payments между клиентом и исполнителем;
- удержание денег до завершения услуги;
- кошелёк пользователя;
- P2P-переводы внутри платформы;
- обмен ARS / USD / USDT;
- приём криптоактивов на публичном сайте;
- хранение карточных данных;
- ручной сбор реквизитов карты через Telegram.

USDT, если стороны используют его для частной договорённости об услуге, остаётся вне платёжной инфраструктуры BuenServ. На веб-сайте не показываются адреса кошельков, QR-коды или крипто-реквизиты.

---

## 3. Приоритет платёжных методов

## Фаза 1 — MVP / local-first

| Метод | Приоритет | Сценарий |
|---|---:|---|
| Карты в ARS через local PSP | Высокий | Pro, Featured, lead packs |
| Transfer / bank redirect в ARS | Высокий | B2B, invoices, крупные пакеты |
| Mercado Pago / local wallet rail через PSP | Высокий | Локальные исполнители |
| Payment link | Высокий | Telegram-first onboarding и invoice flow |
| Manual bank transfer with reconciliation | Средний | Только B2B, как временный fallback |

## Фаза 2 — после подтверждения спроса экспатов

| Метод | Приоритет | Сценарий |
|---|---:|---|
| International cards через одобренного PSP | Средний | B2B / international providers |
| USD invoice для B2B | Средний | Только после tax/legal review |
| Recurring card billing | Средний | Pro subscription |

## Фаза 3 — не ранее отдельного legal review

- любые crypto payment rails;
- marketplace payments;
- split settlement;
- escrow;
- выплаты исполнителям.

---

## 4. Критерии выбора PSP / acquiring partner

Не выбирать провайдера только по комиссии. Нужен scorecard.

| Критерий | Вес | Что проверить |
|---|---:|---|
| Легальная доступность для юрлица BuenServ в AR | 20% | Onboarding, KYC/KYB, разрешённые вертикали |
| Приём ARS и локальных методов | 15% | Cards, wallet, transfers, payment links |
| Webhook и API качество | 15% | Подписи, idempotency, event retries, sandbox |
| Recurring billing | 10% | Подписки, retries, cancel, dunning |
| Refund / dispute tools | 10% | Частичный refund, chargeback evidence, dashboard |
| Settlement и reporting | 10% | Payout schedule, CSV/API, reconciliation |
| Fraud tooling | 8% | 3DS, risk rules, velocity controls |
| Комиссия и FX | 7% | Transparent pricing, taxes, reserve policy |
| Support и SLA | 5% | Испанский support, escalation path |

### Shortlist process

1. Подготовить company profile, legal entity data и описание use case.
2. Направить один и тот же questionnaire 3–5 PSP-провайдерам.
3. Проверить допустимость marketplace / directory use case письменно.
4. Протестировать sandbox: card, decline, refund, duplicate webhook, timeout.
5. Выбрать primary PSP и payment-link fallback.
6. Согласовать finance reconciliation и dispute flow до первого платежа.

---

## 5. Payment flows

## 5.1. Разовая покупка: Featured placement

```text
Исполнитель выбирает Featured placement
→ видит цену в ARS, срок и район
→ создаётся order со статусом pending
→ redirect / hosted checkout PSP
→ PSP отправляет signed webhook
→ backend проверяет подпись и idempotency
→ order = paid
→ включается featured placement
→ создаётся invoice / receipt reference
→ события аналитики отправляются в PostHog
```

### Статусы заказа

```text
created
pending_payment
paid
payment_failed
cancelled
refunded
chargeback_open
chargeback_lost
chargeback_won
```

## 5.2. Подписка Pro

```text
Исполнитель выбирает Pro
→ принимает условия и цену в ARS
→ hosted checkout / tokenized recurring payment
→ subscription active после confirmed payment
→ invoice и уведомление
→ renewal reminder за 5–7 дней
→ PSP retry / dunning при failed renewal
→ grace period
→ downgrade to Free без потери профиля
```

### Правило отказа

Отмена должна быть доступна в интерфейсе без обращения в поддержку. После отмены Pro остаётся активным до конца уже оплаченного периода.

## 5.3. Lead pack

```text
Исполнитель покупает 5 / 10 / 25 lead credits
→ payment confirmed
→ credits ledger увеличивается
→ подтверждённый qualified lead списывает 1 credit
→ disputed lead создаёт credit review case
→ approved credit возвращается в ledger
```

Не использовать плавающий баланс без аудита. Каждый credit должен иметь immutable ledger event.

---

## 6. Архитектура интеграции

## 6.1. Правило PCI

BuenServ не принимает номер карты, CVV или срок действия карты в собственный backend.

Использовать:

- hosted checkout;
- PSP payment link;
- official PSP SDK / payment fields;
- tokenized recurring billing, если разрешено PSP.

## 6.2. Компоненты

```text
Frontend
├── Pricing page
├── Checkout launch
├── Billing history
├── Subscription management
└── Invoice / receipt download link

Backend
├── Orders service
├── Subscriptions service
├── Credits ledger
├── PSP adapter
├── Webhook verification
├── Invoice/reconciliation export
└── Fraud/rate-limit layer
```

## 6.3. Минимальные таблицы

```text
orders
payment_attempts
psp_events
subscriptions
subscription_events
lead_credit_ledger
invoices
refunds
chargebacks
billing_customers
```

### Критические поля

- internal order ID;
- PSP payment ID;
- PSP customer ID / token reference — только если допустимо;
- amount ARS;
- tax amount;
- status;
- created / paid / refunded timestamps;
- idempotency key;
- invoice reference;
- user/provider ID.

---

## 7. Webhooks и безопасность

### Обязательные требования

- проверка подписи webhook;
- идемпотентная обработка каждого event;
- не считать redirect пользователя источником истины;
- source of truth — подтверждённый PSP webhook;
- raw webhook event сохраняется для аудита;
- события обрабатываются в queue;
- повторная доставка не создаёт второй order или второй credit;
- secrets хранятся в secret manager / environment variables;
- отдельные ключи для sandbox и production;
- webhook endpoint защищён rate limiting и logging.

### Fraud controls

- 3DS / equivalent там, где доступно;
- velocity limit по account, IP и payment attempt;
- запрет покупки до модерации исполнителя;
- ограничение количества lead pack purchases при подозрительной активности;
- manual review для необычно больших B2B платежей;
- audit log для refund, credit и ручной активации услуги.

---

## 8. Refund, disputes и support policy

## 8.1. Refund policy

| Продукт | Полный refund | Частичный refund |
|---|---|---|
| Pro subscription | До начала периода / при технической ошибке | Обычно нет после использования периода |
| Featured | Если размещение не активировалось | Pro-rata только при доказанной системной ошибке |
| Lead pack | Только за неиспользованные credits при технической ошибке | Credits для approved invalid leads |
| B2B package | По договору | По договору |

## 8.2. Dispute flow

```text
PSP dispute event
→ payment status = chargeback_open
→ service entitlement pause только при существенном риске
→ собрать invoice, consent, delivery evidence, usage logs
→ ответить в срок PSP
→ outcome записать в audit log
```

## 8.3. Support SLA

| Запрос | SLA первого ответа |
|---|---:|
| Не прошёл платёж | до 1 рабочего дня |
| Дублированное списание | до 4 часов |
| Refund request | до 2 рабочих дней |
| Chargeback / dispute | immediate internal escalation |

---

## 9. Tax, invoicing и reconciliation

До production необходимо подтвердить с местным бухгалтером:

- юридическую форму BuenServ;
- обязательства по регистрации и налогам;
- вид invoice / receipt для B2C и B2B;
- налоги на платформенные комиссии;
- требования к хранению финансовых записей;
- правила работы с ARS и международными оплатами;
- требования PSP к KYC/KYB и описанию бизнеса.

### Ежедневная reconciliation

```text
PSP settled transactions
− PSP fees
− refunds
− chargebacks
= expected settlement

expected settlement
↔ bank statement
↔ internal orders ledger
```

Любое расхождение создаёт finance exception и не должно исправляться вручную без audit log.

---

## 10. Rollout plan

| Фаза | Срок | Результат |
|---|---:|---|
| 0. Legal and PSP discovery | 1–2 недели | Проверенный use case, shortlist, questionnaire |
| 1. Sandbox | 1–2 недели | Hosted checkout, webhook, failed payment, refund test |
| 2. Internal pilot | 1 неделя | 5–10 тестовых сотрудников / исполнителей |
| 3. Featured pilot | 2–4 недели | Разовые платежи в одной категории |
| 4. Pro pilot | 4–6 недель | Подписка для ограниченной группы |
| 5. Lead credits | после value proof | Credits ledger и dispute policy |
| 6. B2B invoicing | после legal/tax review | Контрактные пакеты и reporting |

---

## 11. KPI эквайринга

### Reliability

| Метрика | Цель |
|---|---:|
| Checkout success rate | 90%+ |
| Webhook processing success | 99.9%+ |
| Duplicate-charge incidents | 0 |
| Reconciliation match rate | 100% |
| Time to resolve payment support | < 2 business days |

### Economics

| Метрика | Цель |
|---|---:|
| PSP fee as % of GMV | контролируется по продукту |
| Refund rate | < 3% |
| Chargeback rate | < 0.75% |
| Failed renewal recovery | 15–25%+ |
| Paid conversion after Pro trial | 20–35% |

---

## 12. Go-live checklist

### Legal / finance

- [ ] Legal and tax review completed.
- [ ] PSP contract and allowed-use-case confirmed.
- [ ] Terms, refund policy and privacy policy updated.
- [ ] Invoice / receipt process documented.
- [ ] Finance owner assigned.

### Engineering

- [ ] Hosted checkout or official PSP SDK only.
- [ ] Webhook signature verified.
- [ ] Idempotency implemented.
- [ ] Sandbox scenarios passed.
- [ ] Orders, payments and credits have audit logs.
- [ ] Refund and dispute admin controls are role-restricted.
- [ ] Sentry alerts for failed webhooks / payment errors.

### Product

- [ ] Price shown clearly in ARS.
- [ ] Featured is labelled as paid placement.
- [ ] No auto-renewal dark patterns.
- [ ] Cancellation flow exists.
- [ ] Support FAQ covers payment failures and refunds.
- [ ] No public wallet addresses or crypto checkout surfaces.

---

## 13. Первые 10 действий

1. Утвердить границу: платформа принимает только оплату за собственные продукты BuenServ.
2. Получить legal/tax review в Аргентине.
3. Составить PSP questionnaire и shortlist из 3–5 кандидатов.
4. Проверить recurring billing, payment links, refunds, disputes и settlement в sandbox.
5. Выбрать primary PSP и fallback payment-link provider.
6. Спроектировать `orders`, `psp_events`, `subscriptions` и `lead_credit_ledger`.
7. Реализовать hosted checkout и signed webhooks.
8. Запустить internal payment pilot.
9. Включить Featured pilot для ограниченной группы исполнителей.
10. Вводить Pro и lead packs только после подтверждённой ценности и стабильной payment reconciliation.
