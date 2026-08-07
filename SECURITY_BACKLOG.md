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
