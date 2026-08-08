# BuenServ — Security & dependency backlog

## Priority: before provider photo upload / Workstream D

### Next.js dependency upgrade

**Observed state:** dependency audit reports high-severity transitive findings associated with the current Next.js 15.x dependency chain, including image-processing related packages.

**Decision:** do not perform an unreviewed major upgrade during the static-to-Next migration. Upgrade and validate before user-provided images, storage uploads or public provider onboarding are enabled.

### Required upgrade procedure

1. Create a dedicated upgrade branch.
2. Upgrade Next.js to the supported patched major/version selected at that time.
3. Update React, `eslint-config-next` and compatible dependencies together.
4. Run:
   ```bash
   npm audit
   npm run lint
   npm run typecheck
   npm run build
   npm run check:bundle
   ```
5. Run route smoke tests for ES/RU/EN and webhook routes.
6. Test `next/image` remote/image policies using malicious, oversized and unsupported file fixtures.
7. Deploy to staging before production.

### Provider photo upload hardening

Before enabling uploads:

- Supabase Storage bucket must be private by default;
- only allow image MIME types through server-side validation;
- enforce file-size and pixel-dimension limits;
- generate server-controlled variants; never trust filename extensions;
- strip metadata/EXIF where appropriate;
- use signed upload URLs with short expiry;
- moderate uploaded photos before public publication;
- configure `next/image` remote patterns narrowly;
- log upload, moderation and deletion audit events.

## Ongoing controls

- Dependabot or scheduled dependency review;
- monthly `npm audit` review;
- pinned lockfile in all deployments;
- no `npm audit fix --force` in production branches;
- Sentry alerts for image transformation/API failures.

## Directory relation contract — before first provider onboarding

The provider directory relies on Supabase embedded many-to-one relations:

```text
provider_categories.categories → object | null
provider_barrios.barrios       → object | null
```

Before enabling the first moderated provider profile:

- run `/api/providers` against at least one approved provider with a category and barrio;
- verify category and barrio query filters return the profile;
- verify localized barrio output in ES/RU/EN;
- keep TypeScript relation shapes aligned with the Supabase select contract;
- add integration tests using a seeded Supabase staging project.

This protects against silent cardinality regressions in embedded relation handling.

## Public report boundary — before launch

Web profile reports are intentionally anonymous in the current MVP because public customers do not yet have a Supabase Auth identity. They are rate-limited server-side to **3 reports per hashed network key per hour** and must never auto-suspend a provider.

Before production launch:

- add a Telegram-first authenticated reporting path that records `reporter_profile_id`;
- preserve anonymous web reports only as lower-confidence signals;
- add moderator queue filters for repeated reports and reason categories;
- add Vercel/edge rate limiting when deployment infrastructure is configured;
- never surface reporter identity to the reported provider.

### Telegram-authenticated reports implemented

Public provider profiles now prefer a bot deep-link:

```text
https://t.me/<bot_username>?start=report_<provider_id>
```

The Telegram flow persists `reporter_profile_id` and bypasses the anonymous web-report trust limitation. The web endpoint remains rate-limited as a fallback when a bot username is not configured.

## Provider photo storage preparation

Migration `012_private_provider_photo_storage.sql` creates a private `provider-photos` bucket with a 5 MB limit and image MIME allow-list. It intentionally has no public URL policy and no browser upload policy.

Before any Telegram file is copied into this bucket, implement a server-only image worker that:

1. downloads the file using Telegram's API;
2. verifies actual file signature, MIME type, size and dimensions;
3. strips metadata/EXIF;
4. generates controlled WebP/AVIF variants;
5. records `provider_photos.status = pending`;
6. exposes a public variant only after moderator approval.

## HTTP security headers

Production Next.js applies baseline headers for all routes:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

A strict Content-Security-Policy should be added after the Vercel deployment, external asset origins and Supabase/Telegram domains are finalized. Do not ship an untested CSP that breaks Next.js hydration or authenticated flows.
