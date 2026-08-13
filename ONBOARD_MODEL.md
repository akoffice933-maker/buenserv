# BuenServ onboarding model

Краткий безопасный entry-point для операторов и новых участников проекта. Для подробных staging операций и runbook смотрите ссылку ниже.

## Current focus
Prove the native Telegram loop: customer → provider → provider reply → customer.

## Core invariants
- Telegram webhook and cron routes require secret verification.
- Profile ownership and authorization are enforced server-side.
- `lead_events` and `lead_messages` are designed to be immutable; outbox is worker-only. Never call `claim_notification_outbox()` for diagnostics.
- Smoke runs must use explicit internal `LEAD_SMOKE_*` IDs only; do not auto-select providers.
- Never expose secrets, Telegram IDs, or production lead/profile IDs in docs or chat.

## Operational documentation
For all staging deployment, smoke, outbox, operator and incident procedures see the operator runbook:

[Staging Operator Runbook](docs/STAGING_OPERATOR_RUNBOOK.md)

## Current source baseline (representative commits)
- 3a17dea fix(leads): harden bidirectional message invariants
- 192400d feat(leads): add immutable bidirectional lead messages
- 2ad2ec7 fix: send Telegram outbox notifications with web_app button to open mini-app

## Product backlog (high level)
1. Full native provider/customer message E2E.
2. Explicit customer category/barrio contact form.
3. Completion semantics (provider_service_completed, customer_completion_confirmed).
4. Admin support reply and admin notification channel.

---

This file is a short project entry point. Detailed operational commands, credential handling, and step-by-step runbooks are located in `docs/STAGING_OPERATOR_RUNBOOK.md`.
