# BuenServ

> Local services marketplace for Buenos Aires — a Telegram-first experience with a public, SEO-friendly catalogue.

## Current prototype

This repository contains the UX/UI prototype, multilingual public pages, core marketplace screens, motion specification, generated visual assets, and launch plans.

### Available pages

| Page | File |
|---|---|
| Landing | `index.html` |
| Service catalogue | `catalogo.html` |
| Provider profile | `perfil.html` |
| Taxi & transfers profile | `perfil-taxi.html` |
| How it works | `como-funciona.html` |
| For providers | `prestadores.html` |
| Pricing | `precios.html` |
| FAQ | `faq.html` |
| Safety | `seguridad.html` |
| Contact | `contacto.html` |
| Admin prototype | `admin.html` |
| 404 state | `404.html` |
| UI Kit | `ui-kit.html` |

## Product principles

- Spanish (Argentina), Russian and English user experience.
- Mobile-first, Telegram-first conversion path.
- Public profiles never display wallet addresses or sensitive payment details.
- ARS is the primary public price currency.
- USD/USDT may only be private arrangement options between users; BuenServ is not an exchange, wallet, escrow, or custodial payment service.

## Run locally

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Open `http://localhost:8080`.

## Documentation

- [`PRODUCTION_PLAN.md`](./PRODUCTION_PLAN.md) — roadmap to production.
- [`MONETIZATION_PLAN.md`](./MONETIZATION_PLAN.md) — monetization model and experiments.
- [`ACQUIRING_PLAN.md`](./ACQUIRING_PLAN.md) — payment acceptance / PSP plan.
- [`MARKETING_PLAN.md`](./MARKETING_PLAN.md) — go-to-market and growth plan.
- [`ANIMATION_SPEC.md`](./ANIMATION_SPEC.md) — motion specification.

## Production direction

```text
Next.js + TypeScript + Tailwind CSS + shadcn/ui + Radix UI
Motion + Anime.js + Lottie
PostgreSQL + Prisma/Drizzle + Telegram Bot API
```

## Status

UX/UI and strategy prototype. Production implementation, legal review, PSP selection and security testing are required before launch.
