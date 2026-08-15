# BuenServ Mini App — Product & Technical Specification

Status: proposed source of truth for the updated Mini App
Audience: product, design, frontend, backend, QA and operations
Primary language: Spanish Argentina (es-AR, voseo)
Supported languages: es-AR, ru, en
Current code baseline: f7150fe and its ancestors

## 1. Product purpose

BuenServ is a Telegram-first local-services marketplace for Buenos Aires.

The Mini App is not a second backend or an unauthenticated website. It is the authenticated product surface for:

- **Customer** → discover approved providers, choose service context, create and follow a request, exchange messages with provider, confirm outcome / ask for help
- **Provider** → onboard and manage provider status, receive and open requests, exchange messages with customer, mark a service completed
- **Shared user** → one Telegram identity may be both customer and provider

Public website responsibilities: SEO, public provider discovery, trust pages, public provider profiles.

Telegram bot responsibilities: entry point, notifications, support entry, language selection, Mini App launch.

Mini App responsibilities: authenticated discovery, account/dashboard, contact form, lead detail and message thread, provider onboarding, provider/customer actions.

Supabase/RPC responsibilities: canonical authorization, lead state machine, message persistence, outbox creation, moderation/audit.

## 2. Product boundaries

The Mini App must never show or implement: wallet addresses, custody, escrow, currency exchange, public crypto payment rails, provider direct Telegram identity disclosure, client-to-provider payment processing.

Public pricing is in ARS. Any USD/USDT arrangement is private between customer and provider and is not a BuenServ payment feature.

Primary contact CTA is always **Enviar solicitud**. Secondary Telegram CTA is **Escribir en Telegram** — it opens the BuenServ public bot, not a direct private provider chat.

## 3. Design system

### 3.1 Core tokens

| Token | Value | Use |
|-------|-------|-----|
| Primary | #0FA37F | Primary CTA, active state, success accents |
| Primary hover | #08735A | Pressed/hover state outside native Telegram theme |
| Canvas | #FAF9F6 | Default Mini App background |
| Ink | #1A1F1D | Main text |
| Muted | #66706B | Secondary text, metadata |
| Card | #FFFFFF | Cards/sheets |
| Card radius | 16px | Cards, bottom sheets, modal content |
| Card shadow | 0 13px 32px rgba(23,53,42,.07) | Elevated cards only |

### 3.2 Typography

- Headings: Manrope
- Body/UI: Inter
- Page title: 24–28px, Manrope, 700
- Section title: 18–20px, Manrope, 700
- Card title: 16px, Inter, 600
- Body: 15–16px, Inter, 400
- Metadata: 13–14px, Inter, 400

### 3.3 Telegram theme compatibility

Uses BuenServ tokens as default, but respects Telegram theme colors where necessary: `--tg-theme-bg-color`, `--tg-theme-text-color`, `--tg-theme-hint-color`, `--tg-theme-button-color`, `--tg-theme-button-text-color`.

Rules:
- Never render unreadable text in Telegram dark mode.
- Do not assume white canvas is always available.
- Primary buttons may use Telegram button theme when contrast is better.
- Minimum interactive target: 44×44px.

### 3.4 Interaction patterns

- Cards: 16px radius, white/elevated on canvas.
- Primary CTA: filled #0FA37F.
- Secondary CTA: outlined/soft green.
- Destructive CTA: separate visual treatment; never primary green.
- Status: text + icon/badge, never color alone.
- Loading: inline skeleton/spinner, no full browser reload.
- Errors: localized, actionable, no internal error names.

## 4. Information architecture

Bottom navigation: **Inicio · Buscar · Favoritos · Perfil**

| Tab | Route | Purpose |
|-----|-------|---------|
| Inicio | /mini-app | Dashboard, quick actions, active requests |
| Buscar | /mini-app/search | Approved provider discovery and filters |
| Favoritos | /mini-app/favorites | Saved providers; initially a safe empty state until persistence exists |
| Perfil | /mini-app/profile | Customer/provider account, locale, provider status |

Provider and customer lead details are shared: `/mini-app/leads/[leadId]`.

Other required routes: `/mini-app/contact/[providerId]`, `/mini-app/providers/[providerId]`, `/mini-app/onboarding`, `/mini-app/onboarding/...`.

No screen may trust URL IDs, query params, role fields, provider IDs or lead IDs from the client without server-side ownership/approval checks.

## 5. Language strategy

Source of truth: `profiles.locale`. Initial suggestion: Telegram `language_code`.

Rules:
- Saved `profiles.locale` always wins over Telegram `language_code`.
- New user sees explicit language choice on first /start.
- Language chip is available in Mini App header.
- Changing language updates `profiles.locale` server-side.
- No positional category translations; use canonical slug-keyed labels.

### 5.2 Locale chip

Header chip: ES / RU / EN. Tap → compact language sheet → save profile locale → refresh current UI copy → preserve current route/context.

## 6. Roles and authorization

A Telegram user is represented by one canonical `profiles` row. Mini App customer/provider authorization is derived exclusively through signed Telegram initData → Telegram user ID → `profiles.telegram_user_id` → canonical profile ID → lead/provider ownership check.

Client inputs must never authorize: `profile_id`, `provider_id`, `role`, `actor_type`, `recipient_profile_id`, `lead status`.

## 7. Session freshness policy

| Operation | Freshness policy |
|-----------|------------------|
| Dashboard read | 3600 seconds |
| Lead detail read | 3600 seconds |
| Discovery/contact read | 3600 seconds |
| Provider onboarding write | 600 seconds |
| Create contact/lead write | 600 seconds |
| Lead action write | 600 seconds |
| Lead message write | 600 seconds |

On a 401 caused by expired initData: show localized session-expired state → [ Volver al bot ] → `Telegram.WebApp.close()` → user opens fresh Mini App session from bot notification/menu. Do not extend write-route freshness merely to avoid UX friction.

## 8. Screen specifications

### 8.1 Home — Inicio
Route: `/mini-app`. Header: BuenServ, Hola, <first name> 👋, [ ES/RU/EN ].

Customer first-use: [ 🔎 Buscar un servicio ] [ 🧰 Ofrecer mis servicios ].
Customer active: Mis solicitudes (active lead cards, status badge, [ Ver solicitud ]).
Provider: Mi perfil profesional (Draft/Pending/Approved/Needs changes/Suspended), Solicitudes recibidas (every lead viewable regardless of terminal status; "Ver solicitud" is navigation, not lifecycle mutation).

Important rule: **view availability ≠ action availability**. Every participant-owned lead is viewable. The detail API decides which actions are currently valid.

### 8.2 Discovery Home — categories
Route: `/mini-app/search`. Category cards: 🧹 Limpieza, 🔧 Reparaciones, 🐾 Mascotas, 🚚 Mudanzas, 📚 Clases, 🛵 Mensajería, 🚕 Taxi y traslados. Card content: icon, localized category label, optional short description, provider count only if truthful/current. Do not show fake counts.

### 8.3 Provider catalogue
Route: `/mini-app/search?category=<slug>&barrio=<slug>`. Only show: `providers.status = approved`, provider with canonical Telegram identity, provider matches selected category and barrio. Provider card: photo (only from approved safe pipeline), name, category, barrio, price from ARS, [ Ver perfil ]. No direct Telegram username/ID disclosure.

### 8.4 Search and filters
Filters: Category, Barrio, Availability (only after provider availability model exists). Not P0: USDT filter, advanced price range, ratings filter, AI matching. Filter state must be URL-safe for read navigation but all data still comes from approved provider server query.

### 8.5 Provider profile
Route: `/mini-app/providers/[providerId]`. Content: safe provider photo, localized display name, services/categories, barrios, indicative price in ARS, provider description, moderation-safe trust label. Actions: Primary **Enviar solicitud** → `/mini-app/contact/[providerId]`; Secondary **Escribir en Telegram** → close/open public BuenServ bot, no direct provider chat.

### 8.6 Contact form
Route: `/mini-app/contact/[providerId]`. Required: Category offered by this provider, Barrio served by this provider. Optional: Description/request text, max 2000 characters. Submission transaction: `create_contact_lead` → lead → initial customer lead_message when description exists → customer_contacted → provider_notified → provider outbox notification. The description must be visible in provider detail as a message, not hidden in event metadata.

### 8.7 Lead detail and thread
Route: `/mini-app/leads/[leadId]`. Read model returns only participant-safe fields: lead category, lead barrio, provider public name for customer, status, immutable event timeline without raw internal metadata, lead messages without internal sender profile IDs, allowedActions.

Provider view: Customer initial request, Thread, Timeline. Allowed actions: provider_opened, send provider message, provider_service_completed, cancellation only where allowed.
Customer view: Provider profile summary, Thread, Timeline. Allowed actions: send customer message, cancel while non-terminal, customer_completion_confirmed after provider_service_completed, open support.

Messages: composer max 2000 chars, no HTML rendering, inline send state, no browser reload after send, refetch/update thread after successful send, terminal leads reject new message with localized 409 state.

### 8.8 Favorites
Route: `/mini-app/favorites`. Until a server-side favorites model exists: safe empty state only. Do not fake persistence with local-only favorites that appear canonical.

### 8.9 Profile
Route: `/mini-app/profile`. Customer: name, language, support entry, active request count. Provider: provider status, public profile preview, onboarding continuation if draft, moderation reason if rejected, availability when model exists.

## 9. Lead lifecycle

### 9.1 Facts vs summary
`leads.status` → summary state; `lead_events` → immutable lifecycle facts; `lead_messages` → immutable conversation records.

### 9.2 Current intended sequence
`created → customer_contacted → provider_notified → provider_opened → provider_replied ↔ customer_replied → provider_service_completed → customer_completion_confirmed → success`. Terminal alternatives: cancelled, expired, no_response.

### 9.3 Completion policy
`provider_service_completed` → provider says the service was completed → customer receives completion notification. `customer_completion_confirmed` → customer confirms result → `leads.status = success` → provider receives confirmation notification. Provider cannot unilaterally mark final success.

## 10. Notification policy

All notifications are outbox-driven. No direct user notification is the canonical delivery path.

### 10.1 Public bot notifications
| Event/type | Recipient | Copy intent |
|------------|-----------|-------------|
| provider_lead_notification | Provider | New request |
| customer_provider_reply | Customer | Provider replied |
| provider_customer_reply | Provider | Customer replied |
| customer_provider_completed | Customer | Provider marked service complete |
| provider_customer_confirmed | Provider | Customer confirmed result |
| customer_support_reply | Customer | Support response body |

Each lead-linked notification includes a Web App button to reopen a fresh Mini App session.

### 10.2 Admin bot notifications
| Type | Recipient | Use |
|------|-----------|-----|
| admin_new_support_request | Admin bot | New customer support message |
| admin_new_report | Admin bot | New report |
| admin_outbox_failed | Admin bot | Permanently failed public outbox task |

Outbox routing: `bot_kind = public_bot` → TELEGRAM_BOT_TOKEN; `bot_kind = admin_bot` → TELEGRAM_ADMIN_BOT_TOKEN.

## 11. Support interaction

### 11.1 Customer
`/support` → initial support session → customer writes initial request → support request created → explicit support-reply session opened. Further customer text becomes a support message only when: `telegram_support_reply_session` exists and session is unexpired and support request is open/reviewing. Otherwise normal bot flows must continue untouched.

### 11.2 Admin
Admin bot → Support → take request → Reply → next text from admin becomes reply → support_request_message → audit event → customer_support_reply outbox → public bot delivery. Closing a support request: status = closed → delete customer reply session → further customer text must not enter closed thread.

## 12. Provider onboarding

Provider starts from `/start provider` or 🧰 Ofrecer mis servicios. Flow: category → barrio → description → price in ARS → Telegram photo flow → confirmation → pending moderation.

Approval policy: `provider.status = approved` only if `profiles.telegram_user_id is not null`. This ensures an approved provider is reachable for lead notifications. Public provider photo uploads remain disabled until the secure photo worker exists.

## 13. Admin bot requirements

Panel sections: 🧰 Moderation, 🚩 Reports, 💬 Support, 📋 Leads, 📊 Summary, 🚨 Alerts.

Security: separate admin bot token and webhook secret, callback identity must use callback.from, profiles.role is canonical RBAC source, expiring server-issued action tokens for destructive actions, callback replay protection, audit events for moderation/support/outbox operations, dynamic Telegram HTML always escaped.

Role policy:

| Action | Support | Moderator | Admin |
|--------|---------|-----------|-------|
| Reply support | Yes | Yes | Yes |
| Take/close support | Yes | Yes | Yes |
| Review provider | No | Yes | Yes |
| Approve/reject provider | No | Yes | Yes |
| Resolve report | No | Yes | Yes |
| Suspend provider | No | No | Yes |
| Retry failed outbox | No | No | Yes |

## 14. Security and privacy requirements

- No client-authorized role/profile/provider/lead IDs.
- No wallet/payment rails.
- No direct provider Telegram identity disclosure.
- No raw event metadata in customer/provider API responses.
- No message text duplicated in lead_events.metadata.
- Lead messages immutable in database.
- Support messages immutable in database.
- Webhook secrets verified with timing-safe comparison.
- Telegram updates idempotent.
- Outbox claims worker-only.
- Support/customer/provider writes use explicit idempotency keys.
- Public endpoints require server-side abuse controls: rate limit, input validation, ownership checks, approved provider checks, safe error messages.

## 15. Error states

| Situation | User-facing behavior |
|-----------|----------------------|
| Expired write session | Localized session-expired state + close to bot |
| Invalid/forged initData | Generic session error, no implementation details |
| Lead not owned | Generic unavailable/not found state |
| Terminal lead message attempt | Localized "conversation no longer available" state |
| Provider not reachable | Do not create false success; explain request could not be delivered |
| No providers in filtered search | Empty state + clear filters action |
| Network failure | Retry action; preserve typed unsent message locally only in current session |

## 16. Empty states

- No search results: "No encontramos profesionales con estos filtros." [ Limpiar filtros ] [ Ver todas las categorías ]
- No customer requests: "Todavía no tenés solicitudes." [ Buscar un servicio ]
- No provider requests: "Todavía no recibiste solicitudes. Completá tu perfil y mantené la disponibilidad actualizada."
- No favorites: "Todavía no tenés favoritos." [ Buscar servicios ]

## 17. Accessibility requirements

All cards that navigate are keyboard accessible. Enter and Space activate interactive cards. Buttons have clear labels. Color is never the only status indicator. Focus is visible. Touch target minimum 44px. Messages and status changes use semantic text.

## 18. Data/API requirements

Required Mini App APIs:
- GET /api/mini-app/dashboard
- GET /api/mini-app/search
- GET /api/mini-app/providers/[providerId]
- GET /api/mini-app/contact/[providerId]
- POST /api/mini-app/contact
- GET /api/mini-app/leads/[leadId]
- POST /api/mini-app/leads/[leadId]/action
- POST /api/mini-app/leads/[leadId]/message
- GET /api/mini-app/profile
- POST /api/mini-app/profile/locale

Every route must: validate signed initData, apply route-specific freshness window, resolve canonical profile, apply ownership/role policy server-side, return only participant-safe fields.

## 19. Testing requirements

Unit tests: initData freshness per route, ownership checks, lead action policy, terminal state rejection, message validation, idempotency, notification payload copy, admin RBAC, HTML escaping.

Database/staging smoke: create contact lead, initial customer message visible, provider reply → customer outbox, customer reply → provider outbox, completion → confirmation outbox, support reply outbox, admin alert outbox, outbox dedup invariant, identity-before-approval guard.

Native Telegram E2E: Internal Customer, Internal Provider, Internal Admin. Real Bot API delivery, Real Mini App initData, Real lead detail, Real messages in both directions, Real support reply, Real admin alert.

## 20. Non-goals before closed pilot

Payments, PSP integration, Wallets, Escrow, Public crypto rails, Ratings/reviews, Favorites persistence, AI matching, Public photo upload, Automated provider approval, Broad public advertising.

## 21. Closed pilot gate

- [ ] Latest GitHub commit deployed to staging/canonical environment
- [ ] All applicable migrations applied once, in documented dependency order
- [ ] Public/main/admin webhook secret checks pass
- [ ] Provider/customer bidirectional native Telegram E2E passes
- [ ] Admin support conversation passes
- [ ] Admin report/moderation flow passes
- [ ] Scheduler delivery and dedup evidence passes
- [ ] No test providers are publicly visible
- [ ] Provider identity-before-approval guard passes
- [ ] Backup/restore/operator runbook reviewed

## 22. Public launch gate

- [ ] Canonical HTTPS domain configured
- [ ] NEXT_PUBLIC_APP_URL points to canonical domain
- [ ] Main/admin webhooks re-registered on canonical domain
- [ ] CSP configured for final origins
- [ ] Secure photo pipeline completed before public uploads
- [ ] Legal review complete
- [ ] Monitoring and incident ownership configured
- [ ] 20–30 verified real providers across initial liquidity cells
- [ ] Closed pilot metrics reviewed
