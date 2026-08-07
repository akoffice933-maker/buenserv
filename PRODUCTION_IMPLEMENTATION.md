# BuenServ — production implementation kickoff

## Confirmed decisions

| Area | Decision |
|---|---|
| Scope | Full production MVP |
| App | Next.js + TypeScript + Tailwind + shadcn/ui |
| Data/Auth/Storage | Supabase |
| Bot | New Telegram Bot |
| Public UX | ES-AR / RU / EN, Telegram-first |

## What is already prepared in this repository

- Optimised WebP photo set; hero image reduced from ~2.7 MB to ~90 KB.
- `supabase/schema.sql`: initial directory, provider, review, report and audit schema.
- `.env.example`: required server-side configuration names.
- Static UX prototype, design tokens, i18n copy references and product plans.

## Required account-side actions

These cannot be safely completed without the project owner:

1. Create a Supabase project in the desired region.
2. Create a Telegram bot through BotFather.
3. Create a Vercel project and connect this GitHub repository.
4. Add the values from `.env.example` as encrypted Vercel environment variables.
5. Run `supabase/schema.sql` in the Supabase SQL Editor.
6. Create a production domain and configure DNS when ready.
7. Obtain legal and tax review before enabling any paid BuenServ product.

**Never send `TELEGRAM_BOT_TOKEN`, Supabase service-role keys, or Vercel tokens through chat or commit them to Git.**

## Implementation sequence

### Workstream A — frontend migration

- Create Next.js app-router project.
- Migrate static pages to route components.
- Create a common shell, shared header/footer and design-system components.
- Use `next/image`, AVIF/WebP variants, lazy-loading and explicit dimensions.
- Set route-level metadata, sitemap, robots and `hreflang`.

### Workstream B — i18n

- Add `next-intl`.
- Create `messages/es-AR.json`, `messages/ru.json`, `messages/en.json`.
- Move every public content string out of HTML/JS.
- Add locale-prefixed routes: `/es`, `/ru`, `/en`.

### Workstream C — Supabase directory API

- Apply schema and seed categories/barrios.
- Implement public provider directory queries.
- Implement provider profile read routes.
- Add admin-only moderation mutations with Supabase RLS and server checks.

### Workstream D — Telegram bot

- Create webhook endpoint.
- Verify Telegram webhook secret.
- Implement customer search, provider onboarding and deep-link attribution.
- Implement review eligibility and report flow.

### Workstream E — admin and operations

- Implement Supabase Auth / Telegram-to-admin identity mapping.
- Add RBAC: admin, moderator, support.
- Build moderation queue, reports queue and immutable audit events.

## Non-negotiable boundaries

- No public wallet addresses.
- No client-to-provider escrow or payment custody in MVP.
- No currency exchange functionality.
- Platform billing only covers BuenServ products: Pro, Featured, lead packs and B2B plans after legal review.

## Performance budget

- Initial JS: ≤170 KB gzip target, 220 KB ceiling.
- Hero: ≤180 KB AVIF / ≤250 KB WebP fallback.
- Provider/category images: ≤80 KB target where possible.
- No third-party script on initial route unless strictly necessary.
- LCP ≤2.5s, CLS ≤0.1, INP ≤200ms.

---

## Directory migration status

The production scaffold currently has two public read APIs:

```text
GET /api/categories
GET /api/providers?category=&barrio=&usdt=&limit=
```

`/api/providers` validates input with Zod, reads only approved providers through the RLS-limited public Supabase client, and supports category, barrio, USDT and limit filters.

The initial locale category routes deliberately use the static allow-list in `apps/web/src/lib/categories.ts` so they can be statically generated and reviewed before Supabase credentials/data are available.

> **TODO(directory-sync):** when category CMS/admin management is introduced, migrate category route generation and catalogue cards to `GET /api/categories` / a server-side directory query. Remove the static allow-list only after slug stability and redirects have been defined.

---

## Telegram provider onboarding status

The provider flow now progresses through persisted session steps:

```text
/start provider
→ category
→ barrio
→ description
→ ARS price
→ Telegram photo file ID
→ explicit confirmation
→ providers.status = pending
```

On confirmation, the webhook creates/updates a pending `providers` record and its category/barrio relations, then removes the session. The supplied Telegram photo file ID remains private in `onboarding_payload`; it is **not** published as `photo_path`.

### Moderation boundary

The database now has a real pending-provider source for a moderation queue. The moderator-facing queue, approval/rejection actions, photo transfer to private Supabase Storage and notification workflow remain the next implementation task. Do not describe the admin moderation UI as complete until those routes and RBAC controls exist.
