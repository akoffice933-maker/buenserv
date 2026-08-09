# BuenServ — production readiness status

**Code status:** production MVP foundation implemented; external infrastructure and legal gates remain.

## Implemented in repository

- Next.js + TypeScript + Tailwind + next-intl public app;
- ES / RU / EN locale routes, metadata, hreflang, sitemap and robots;
- public category directory, category/profile routes, filters and SEO JSON-LD;
- Telegram provider onboarding state machine with idempotency;
- pending-provider moderation, suspend flow, reports and support queues;
- Supabase RLS and service-role-only security-definer RPC restrictions;
- admin RBAC, audit log, analytics, dark mode and sign-out;
- public report and authenticated Telegram report flows with rate limits;
- image security storage foundation, not yet enabled for public provider photos;
- CI quality gate, unit tests and bundle budget checks.

## External gates before real public launch

| Gate | Owner action | Status |
|---|---|---|
| Supabase project | Create project, apply schema/seed/migrations in order | Required |
| Telegram Bot | Create bot, set webhook secret and username | Required |
| Vercel | Import `apps/web` as project root, add environment variables | Required |
| Canonical domain | Set `NEXT_PUBLIC_APP_URL` to owned HTTPS domain | Required |
| First admin | Magic-link login + SQL role mapping | Required |
| Argentine legal review | Approve Privacy/Terms/Cookies before user data collection | Required |
| Photo worker | Validate, strip EXIF, create variants, moderation approval | Required before public uploads |
| Billing/PSP | Legal/tax review + trial activation + invoice/webhook flow | Required before monetization |

## Required production environment variables

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
TELEGRAM_BOT_USERNAME
REPORT_RATE_LIMIT_SALT
NEXT_PUBLIC_APP_URL
```

## Release command gate

```bash
cd apps/web
npm ci
npm run test
npm run lint
npm run typecheck
npm run build
npm run check:bundle
```

No public launch should proceed until the commands above are green in CI and the external gates are complete.
