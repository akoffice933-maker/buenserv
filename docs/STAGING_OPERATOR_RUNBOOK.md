# STAGING Operator Runbook

Purpose
-------
Concise operator playbook to safely verify the staging interaction flow (lead messages + outbox delivery) without exposing secrets or PII. This document contains only commands, expected outputs, checklists, troubleshooting, and safe procedures. DO NOT place secrets, real IDs, or connection strings here.

Safety rules
------------
- Never share `PGCONN`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, or GitHub PAT in chat or checked-in files.
- Do NOT call `claim_notification_outbox()` in diagnostic runs — this RPC mutates outbox state and is reserved for worker delivery only.
- Use explicit `LEAD_SMOKE_*` env vars for all smoke runs; never auto-select production providers.
- All SQL verifiers run in a read-only transaction and explicitly `ROLLBACK;` at the end.

Files referenced
----------------
- `scripts/smoke/verify-lead.sql` — read-only verifier for a single lead (no secrets, needs `PGCONN` to run).
- `scripts/smoke/run-smoke.ps1` — PowerShell wrapper for `verify-lead.sql` (validates UUID, does not echo PGCONN).
- `apps/web/scripts/staging-provider-reply-smoke.mjs` — safe smoke script to create a test lead and provider reply (uses explicit `LEAD_SMOKE_*` env vars).
- `.github/workflows/outbox-delivery.yml` — scheduler workflow that triggers the protected Vercel route.

Runbook sections
-----------------
1) Deployment verification
2) GitHub Actions outbox verification
3) Read-only lead verifier
4) Provider → customer message smoke
5) Customer → provider message smoke
6) Admin panel smoke
7) Negative security tests
8) Terminal-state rejection
9) Incident / rollback notes

1) Deployment verification
--------------------------
Commands (no secrets in the command line):
- Check current local `main` SHA:

  git rev-parse --short HEAD

- Check last remote `main` SHA:

  git ls-remote origin refs/heads/main

Expected outputs:
- The local SHA should match the deployed Vercel commit SHA (verify in Vercel UI).
- `/api/health/deep` should respond 200.

Checklist:
- Vercel deployment = current `main` commit.
- `/api/health/deep` = 200 (manual curl from a safe environment).

Troubleshooting:
- If health route not 200, review Vercel runtime logs and recent env changes.

1b) Migration apply order (dependency order, NOT numeric)
---------------------------------------------------------
⚠️ Do NOT apply migrations 032–041 in numeric order. The order is dependency-driven:

```text
032_lead_completion_semantics.sql
033_admin_support_reply.sql
034_rate_limit_counters.sql
035_contact_lead_initial_message.sql
036_completion_notification_types.sql
040_generalize_notification_outbox.sql   ← BEFORE 037/039
037_admin_alert_delivery_channel.sql
038_atomic_rate_limit_rpc.sql
039_support_reply_outbox_and_immutability.sql
041_fix_atomic_rate_limit_return.sql
```

Why:
- 040 drops NOT NULL on `notification_outbox.lead_id` / `lead_event_id`. 037 and 039
  insert operational/admin/support rows with NULL lead columns; without 040 they fail
  with `null value in column lead_id violates not-null constraint`.
- 041 replaces `consume_rate_limit` from 038 (off-by-one fix).
- 039 adds `customer_support_reply` to the outbox check constraint that 037 already
  redefines; 039 must run after 037.

After applying, run the SQL smoke checks listed in `PRODUCTION_LAUNCH_GATE.md`
(enum values, create_contact_lead, completion mapping, admin channel, atomic rate
limit, support immutability).

2) GitHub Actions outbox verification
------------------------------------
Commands:
- Manually trigger workflow from GitHub Actions UI (Deliver Telegram outbox) using `workflow_dispatch`.
- After run completes, capture the run URL.
- Verify the workflow logs include a successful `curl` with `HTTP 200` from the protected outbox route.

Expected outputs:
- Action run = success (green).
- Logs show `curl` returned `200` and JSON `{"ok":true,"claimed":<n>,"sent":<m>}`.

Troubleshooting:
- If `401` from route: validate `OUTBOX_CRON_SECRET` is set in GitHub Secrets and matches `CRON_SECRET` in Vercel.

3) Read-only lead verifier
--------------------------
Purpose: run `verify-lead.sql` read-only checks for a single test lead.

Commands (operator provides `PGCONN` or `PGSERVICE` locally; DO NOT paste it in chat):

Credential guidance:

- Long-term: prefer a local `pg_service.conf` entry and use `PGSERVICE` to avoid passing full URLs on the command line. Example (operator-managed, NOT in repo):

  ```text
  PGSERVICE=buenserv_staging_readonly
  ```

  Then run the verifier with `PGSERVICE` set in the environment.

- Short-term / ad-hoc: set `PGCONN` locally from a secure credential store — do NOT paste the URL into chat, docs, or shell history. Do NOT use `Read-Host -AsSecureString` for `PGCONN` as that produces a PowerShell `SecureString` which is not a plain connection URL.

Example (preferred):

```powershell
$env:PGSERVICE = "buenserv_staging_readonly"
pwsh ./scripts/smoke/run-smoke.ps1 -LeadId <LEAD_UUID>
```

Expected outputs (summary only):
- `lead_found: yes|no`
- `messages_count: <n>`
- `provider_messages: <n>`
- `customer_messages: <n>`
- `message_event_metadata_safe: yes|no`
- `latest_status` rows per expected notification types
- `lead_messages_immutable_trigger: present|missing`

Troubleshooting:
- If `lead_found: no` — ensure the LEAD UUID is the test lead created by smoke script.
- If verifier errors: check `ON_ERROR_STOP` usage and re-run with `--set=ON_ERROR_STOP=1`.

4) Provider → customer message smoke
------------------------------------
Purpose: verify provider can open lead and send a reply which enqueues customer outbox.

Steps:
- Set explicit env vars in a local `.env.local` for the smoke runner (only `LEAD_SMOKE_*` placeholders; do not store secrets):
  - `LEAD_SMOKE_PROVIDER_PROFILE_ID` (internal test provider)
  - `LEAD_SMOKE_CUSTOMER_PROFILE_ID` (internal test customer)
  - Other `LEAD_SMOKE_*` as required by `staging-provider-reply-smoke.mjs`

- Run the smoke script from the expected working directory so `.env.local` and relative paths resolve correctly:

```bash
cd apps/web
node scripts/staging-provider-reply-smoke.mjs
# or if there is an npm script
# npm run smoke:provider-reply
```

Expected outputs (script may print internal lead UUIDs for evidence; DO NOT paste real provider/customer IDs into tickets, docs, or chat):
- Test lead created → outputs `lead_id: <uuid>`.
- `provider_replied` event created and a `notification_outbox` row created with `notification_type = customer_provider_reply` and `status = 'pending'`.

After script:
- Optionally run `verify-lead.sql` against returned `lead_id` to confirm outbox pending.

Troubleshooting:
- If script fails with `provider not found` — ensure `LEAD_SMOKE_*` IDs are internal test accounts and not bot profiles.

5) Customer → provider message smoke
------------------------------------
Purpose: verify customer replies produce `provider_customer_reply` outbox.

Steps:
- Use Mini App or smoke script variant to send customer reply; ensure `send_lead_message` RPC is used.
- Confirm `notification_outbox` contains `provider_customer_reply` for provider profile.

Expected outputs:
- Outbox row with `notification_type = 'provider_customer_reply'` and `status = 'pending'`.

6) Admin panel smoke
--------------------
Purpose: validate admin can view leads and support tickets; do NOT perform destructive moderation without sign-off.

Steps:
- Login to admin panel with staging admin account.
- Inspect sample lead and support ticket list.
- Confirm admin panel shows `lead_events` timeline and `notification_outbox` summary (safe; no PII exported).

Expected outputs:
- Admin UI renders lead timeline and outbox status.

Admin Bot smoke (Telegram)
--------------------------
Purpose: validate the Telegram admin surface (admin bot) used for operational moderation and support.

Steps (run from admin/staging operator account):
1. Start the admin bot by sending `/start` in Telegram to the admin bot account.
2. Open moderation menu (e.g. `🧰 Модерация`) and confirm menu items render.
3. Open `🚩 Жалобы` (reports) and inspect a sample ticket.
4. Open `💬 Поддержка` (support) and verify support tickets display correctly.
5. Open `📋 Заявки` (leads) and inspect a lead summary/timeline.
6. Open `📊 Сводка` (summary) to verify operational metrics.
7. Use refresh/update action to confirm live updates.
8. Verify a non-admin account is denied admin actions.
9. Verify support role cannot approve/reject/suspend providers (attempt and expect a safe denial).
10. Verify expired/reused admin action tokens are rejected safely.

Expected outputs:
- Admin bot responds with menus and data.
- Access denied responses for non-admin accounts.
- Support replies persist and appear in admin UI / audit logs.

7) Negative security tests
--------------------------
List (run in staging only):
- Call `deliver-outbox` route without `Authorization` header → expect `401`.
- Call `deliver-outbox` with malformed token → expect `401`.
- Attempt to run diagnostic `claim_notification_outbox()` — DO NOT run; confirm it exists but never call.

8) Terminal-state rejection
---------------------------
Test that closed leads reject new messages:
- Using `send_lead_message` RPC attempt to send message on a `success` lead → expect `lead_closed` error.

9) Incident / rollback notes
----------------------------
- If outbox delivery caused real user messages to be sent unintentionally: immediately disable GH Actions workflow (GitHub UI) and remove `OUTBOX_CRON_URL` from secrets; then investigate logs and, if needed, notify affected users.
- To stop tracking a sensitive file accidentally committed (e.g., a dump):

  git rm --cached <file>
  git commit -m "chore: stop tracking sensitive file"

Checklist before performing E2E delivery to real users
-----------------------------------------------------
- Internal test profiles verified (non-bot, internal only).
- Cron route secrets confirmed and stored in secret stores (Vercel/GitHub).
- Smoke scripts use explicit `LEAD_SMOKE_*` env vars and do not auto-select providers.
- Operator has read-only verifier ready and knows how to run it.

Appendix: Quick commands reference (no secrets)
---------------------------------------------
- Run read-only verifier:
  pwsh ./scripts/smoke/run-smoke.ps1 -LeadId <LEAD_UUID>
- Trigger GH workflow manually: use Actions UI `Deliver Telegram outbox` → `Run workflow`.
- Check Vercel health route (from safe environment):
  curl -i https://<staging-domain>/api/health/deep


---

# End of runbook
