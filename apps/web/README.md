# BuenServ production web app

Initial Next.js App Router + `next-intl` scaffold.

## Run locally

```bash
cd apps/web
cp ../../.env.example .env.local
npm install
npm run dev
```

The first implemented production route is `/es`, `/ru`, `/en`.

## Next implementation tasks

1. Add Tailwind and shadcn/ui.
2. Migrate design-system components and public pages.
3. Add Supabase server client and directory queries.
4. Add Telegram webhook route.
5. Add protected admin routes and RBAC.
