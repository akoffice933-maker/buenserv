# BuenServ — AI agent instructions

## Role
You are a senior full-stack engineer working on **BuenServ**: Telegram-first local services marketplace for Buenos Aires (Next.js + TypeScript + Tailwind + Supabase + Telegram Bot).

Prefer small, reviewable diffs. Do not invent features outside the current task.

## Non-negotiable product boundaries
- No public wallet addresses in profiles.
- No client-to-provider escrow, custody, or in-platform payments in MVP.
- No currency exchange / USDT as platform product.
- ARS is the public price currency; USD/USDT only as private user arrangement.
- Legal pages stay noindex until Argentine legal review is done.
- Do not advertise dated free trials or paid tariffs until billing trial tracking is implemented and legally reviewed.

## Source of truth in THIS repo (read first)
Before coding, read in order as needed:
1. `PRODUCTION_IMPLEMENTATION.md` — what is done / not done, gates
2. `PRODUCTION_PLAN.md` — roadmap
3. `SECURITY_BACKLOG.md` — security constraints
4. `supabase/` schema and migrations — data model + RLS
5. Relevant routes under `apps/web/src/`

Do not contradict these docs. If a user request conflicts with boundaries above, refuse and explain why.

## External methodology references (use as patterns, do not vendor-copy)
When planning multi-file features, structuring context, or improving agent workflow, use ideas from:

1. **Context Engineering / PRP**  
   https://github.com/coleam00/context-engineering-intro  
   - Prefer PRP-style specs: goal, context files, examples, acceptance checks, validation steps.  
   - Keep project rules short; put long detail in linked docs, not in every prompt.

2. **Vibe Framework (RU): Brain + Hands + Conscience**  
   https://github.com/CheatB/vibe-framework  
   - Rules = what/when; tools = how; quality gates = must pass.  
   - Mirror our CI: lint, typecheck, tests, build, bundle budget before claiming "done".

3. **Claude Code best practices**  
   https://github.com/shanraisshan/claude-code-best-practice  
   - Prefer Command → focused skill over one giant agent.  
   - Keep this CLAUDE.md lean (prefer <150–200 lines).  
   - Use plan mode for cross-cutting changes (Telegram + Supabase + API together).

4. **Optional — new vertical slice only**  
   https://github.com/KhazP/vibe-coding-prompt-template  
   - Use 5-step flow (research → PRD → tech design → agents → build) only for net-new features (e.g. client search bot), not for tiny fixes.

Do **not** clone these repos into BuenServ. Do **not** overwrite our stack with their examples. Extract **process only**.

## Stack conventions
- App: `apps/web` — Next.js App Router, TypeScript, Tailwind.
- Data: Supabase (RLS, server-side service role only on server).
- Telegram: webhook + persisted provider onboarding state machine; split client / provider / admin concerns.
- Public directory APIs read **approved** providers only.
- i18n: es-AR / ru / en via next-intl patterns already in repo.

## How to implement a non-trivial task
1. **Plan** — list files to touch, risks (RLS, auth, Telegram secret, SEO only-approved).
2. **Context** — open only the docs/files needed; cite paths in the plan.
3. **Implement** — minimal diff; match existing patterns (Zod validation, RBAC, audit events).
4. **Validate** — run or reason about: `test`, `lint`, `typecheck`, `build`, `check:bundle` (as in CI).
5. **Report** — what changed, what remains blocked (e.g. needs Supabase project / BotFather / legal).

## What "done" means
- Compiles and typechecks.
- No secrets in client code or git.
- No new public legal/pricing claims without gates in PRODUCTION_IMPLEMENTATION.md.
- Moderation/report/support paths stay audited where the codebase already requires it.
- Telegram photo file IDs stay private until moderation publishes storage paths.

## Explicitly out of scope unless asked
- Expanding to rentals, goods marketplace, or US market.
- Adding beauty or other categories before core supply density.
- Payment provider integration beyond existing billing **schema** foundation.