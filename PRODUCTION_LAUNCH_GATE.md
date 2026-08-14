# BuenServ — Production Launch Gate

Версионированный чеклист для запуска. Разделяет **closed pilot**, **public launch** и **monetisation** — это разные gates.

## Оценка готовности

```text
Code foundation:                ~85%
Staging interaction readiness:  ~65–70%
Closed pilot readiness:         ~50–60%
Wide public production launch:  ~35–45%
Billing/monetisation:           отдельно, позже
```

## Фаза A — staging proof, P0

```text
[ ] Deploy latest GitHub HEAD on Vercel
[ ] Проверить Vercel deployment SHA
[ ] Проверить all required env vars
[ ] Проверить GitHub Actions scheduler (outbox-delivery.yml, */5)
[ ] Пройти native Telegram provider → customer message E2E
[ ] Пройти customer → provider reply E2E
[ ] Проверить terminal-state rejection
[ ] Проверить admin bot callbacks/RBAC
```

### Exit criteria

```text
Full Telegram bidirectional message loop works.
No manual DB correction.
No duplicate events/outbox.
No ownership bypass.
Real Telegram notifications received by internal accounts.
```

## Фаза B — missing interaction functionality, P0

```text
[ ] Customer contact form: explicit category + barrio  ✅ реализовано
[ ] Completion semantics: provider_service_completed → customer_completion_confirmed → success  ✅ реализовано
[ ] Admin support reply: support_request_messages → public bot → customer  ✅ реализовано
[ ] Admin operational notifications (/alerts)  ✅ реализовано
```

### Exit criteria

```text
Customer, provider and admin can all complete their necessary actions
without direct database intervention.
```

## Фаза C — operational safety

```text
[ ] Outbox failure monitoring
[ ] GitHub Actions failure alerts
[ ] Vercel Runtime Log review
[ ] Supabase backup/restore runbook
[ ] RLS/ownership negative smoke
[ ] Basic public endpoint rate limiting  ✅ реализовано (rate_limit_counters)
[ ] Sentry/PostHog, if product owner approves analytics/privacy setup
```

## Фаза D — launch infrastructure

```text
[ ] Canonical domain
[ ] NEXT_PUBLIC_APP_URL update
[ ] Webhook re-registration on canonical domain
[ ] Sitemap/robots/hreflang verification
[ ] CSP after final domain/origins
[ ] No public test/fake providers
[ ] Provider photo policy
```

## Photo worker: точная граница

Photo pipeline — реальный blocker только для:

```text
public provider photo uploads;
автоматическая publication;
массовый provider onboarding.
```

До его реализации допустим ограниченный pilot:

```text
photo sent via Telegram;
manual moderation;
private storage;
no public arbitrary upload endpoint.
```

Но нельзя включать без MIME verification / image decode / size limits / EXIF strip / variants / moderation:

```text
public image upload;
автоматическую public publication;
untrusted file processing.
```

## Legal/domain blockers (блокируют public launch)

```text
canonical HTTPS domain
Argentine legal review
Privacy / Terms / Cookies
data retention policy
marketplace liability wording
provider moderation policy
report/safety process
```

Legal draft pages должны оставаться `noindex`.

## Next.js / npm audit

Не делать blind upgrade только из-за `npm audit`. Правильный flow:

```bash
cd apps/web
npm audit --omit=dev
npm audit
```

Затем: определить production-reachable finding → проверить patched version → обновить Next.js + eslint-config-next согласованно → full release gate → native Telegram Mini App smoke.

## Что НЕ делать сейчас

```text
❌ Payments / PSP
❌ Crypto UI
❌ Wallet/escrow
❌ Ratings
❌ AI matching
❌ Favorites
❌ Large category expansion
❌ Public mass marketing
```

## Production launch gate

```text
[ ] Latest GitHub SHA deployed
[ ] All migrations applied once and verified
[ ] Provider/customer bidirectional native Telegram E2E passed
[ ] Customer contact form uses explicit category/barrio
[ ] Completion semantics implemented
[ ] Admin support reply works
[ ] Admin alert channel works
[ ] Outbox scheduler delivery proven
[ ] Admin RBAC negative tests passed
[ ] No fake/test providers public
[ ] Canonical domain configured
[ ] CSP configured
[ ] Legal review complete
[ ] Monitoring/backup/incident runbooks verified
```

## Правильная последовательность до closed pilot

```text
1. Native bidirectional Telegram E2E.
2. Explicit customer contact form.  ✅
3. Completion semantics.  ✅
4. Admin support reply.  ✅
5. Admin operational notifications.  ✅
6. Outbox/admin failure monitoring.
7. Canonical domain.
8. Legal review.
9. 20–30 verified providers.
10. Closed pilot with real customers.
```

## Текущий source baseline

```text
5215b7d fix(P0/P1): generalize outbox, deliver support reply body, fix rate limit off-by-one
b7b023b docs: record P0/P1 corrective migrations and required staging smoke
74d3d2f fix(P1): atomic rate limit RPC, support reply immutable/audited/outbox-safe
b62fd7d fix(P0): contact description as initial message, completion notification types, admin push channel, escape alerts
362f1ed docs: add versioned production launch gate checklist
a72db75 feat(ops): server-side rate limiting for public write endpoints
9175cb7 feat(admin-bot): operational alerts
6b0fa24 feat(admin-bot): support reply
90c78a9 feat(leads): explicit customer contact form
827e606 feat(leads): completion semantics
```

## Корректирующие миграции — dependency order (НЕ numeric order!)

⚠️ **Не применять 032→041 по номеру.** Порядок определяется зависимостями:

```text
032_lead_completion_semantics.sql
033_admin_support_reply.sql
034_rate_limit_counters.sql
035_contact_lead_initial_message.sql
036_completion_notification_types.sql
040_generalize_notification_outbox.sql   ← ДО 037/039
037_admin_alert_delivery_channel.sql
038_atomic_rate_limit_rpc.sql
039_support_reply_outbox_and_immutability.sql
041_fix_atomic_rate_limit_return.sql
```

**Почему 040 раньше 037/039:** 037 и 039 вставляют outbox-строки с
`lead_id = null` / `lead_event_id = null`. Без 040 (drop NOT NULL) эти вставки
упадут с `null value in column lead_id violates not-null constraint`.

**Почему 041 после 038:** 041 заменяет `consume_rate_limit` из 038 (fix off-by-one).

**Почему 039 после 037:** 039 добавляет `customer_support_reply` в check constraint,
который 037 уже переопределяет; 039 должен идти последним из outbox-типов.

### Требуемый staging migration smoke (нельзя доказать build'ом)

После применения 032–039 на staging выполнить:

```sql
-- enum values present
select enumlabel from pg_enum join pg_type on pg_type.oid = pg_enum.enumtypid
where pg_type.typname = 'lead_event_type' order by enumlabel;

-- record_lead_event replaced (completion mapping)
select proname from pg_proc where proname = 'record_lead_event';

-- create_contact_lead persists initial message
call/branch: create_contact_lead(...) → verify lead_messages row exists;

-- completion enqueues correct notification type
provider_service_completed → notification_outbox.notification_type = 'customer_provider_completed';
customer_completion_confirmed → 'provider_customer_confirmed';

-- admin push channel
enqueue_admin_alert(...) → outbox row bot_kind = 'admin_bot';

-- atomic rate limit
consume_rate_limit(key, 3, 60) 4x → allowed=false on 4th;

-- support reply immutability
update support_request_messages → raises 'support_request_messages are immutable';
```

**Использовать `ENABLE REPLICA` on job runs if test harness is available.**

## Статус Фаз B–C (после P0/P1-исправлений)

```text
B1 explicit category/barrio + description visible: ✅ (create_contact_lead)
B2 completion lifecycle events + notification semantics: ✅ (migration 036)
B3 admin support reply persisted + durable outbox delivery + audit: ✅ (migration 039)
B4 admin notifications: push channel через outbox bot_kind=admin_bot ✅ (+ /alerts pull dashboard)
C rate limiting: ✅ atomic consume_rate_limit RPC
```

Не запускать broad pilot до native E2E и staging smoke.
