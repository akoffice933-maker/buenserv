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
a72db75 feat(ops): server-side rate limiting for public write endpoints
2f75f4d fix(contact): read providerId from query string, not dynamic route param
9175cb7 feat(admin-bot): operational alerts
6b0fa24 feat(admin-bot): support reply
90c78a9 feat(leads): explicit customer contact form
827e606 feat(leads): completion semantics
```
