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
