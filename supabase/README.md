# BuenServ Supabase runbook

## Apply order

Apply SQL files in lexical order:

```text
schema.sql
seed.sql
migrations/002_*.sql
...
migrations/017_*.sql
```

Use a staging project first. Do not apply migrations selectively: later RPC functions rely on earlier tables, enums and RLS setup.

## Required production checks

1. Confirm all expected tables, functions and indexes exist.
2. Verify RLS is enabled on every application table.
3. Create the first internal admin through Supabase Auth magic link.
4. Map `auth.users.id` to `profiles.auth_user_id` and assign `role = 'admin'` through the SQL Editor.
5. Set environment variables in Vercel; never store service-role keys in client code.
6. Configure the Telegram webhook secret and test duplicate-update behavior.
7. Test one approved provider with category/barrio, one support request and one report in staging.
8. Keep `provider-photos` bucket private until the secure image worker and photo moderation flow are implemented.

## Rollback policy

Migrations are additive and should not be edited after staging/production application. Use a new forward migration for corrections, and record the reason in the commit message and audit documentation.

## Required live-staging directory smoke test

Run this after **any** of the following:

- a new foreign key pointing to `profiles`, `categories` or `barrios`;
- a changed PostgREST embedded `select(...)` contract;
- an RLS policy change;
- a Supabase migration that affects the public directory.

```bash
cd apps/web
NEXT_PUBLIC_SUPABASE_URL=... \
NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
npm run smoke:staging
```

Expected minimum result on the seeded staging database:

```json
{
  "categories": 7,
  "barrios": 4,
  "approvedProvidersRead": 0
}
```

After the first approved staging provider exists, repeat the smoke test and manually verify that `display_name`, category and barrio are embedded in the returned provider row. This is mandatory because unit tests cannot reproduce PostgREST relationship ambiguity (`PGRST201`) or real RLS behavior.
