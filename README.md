# RunLocal

A curated marketplace for finished mini apps. **Buy once, download, run locally** —
with AI-assisted setup so it takes minutes, not expertise. The platform takes a
15% all-inclusive commission per sale.

> Working brand name is **RunLocal** — change it in one place: `lib/brand.ts`.

## Status
Fully working front-end demo. Every buyer / seller / admin flow runs on an
in-browser store (`lib/store.ts`) seeded with sample data — **no backend keys
needed to click through it.** Firebase + Stripe are scaffolded and documented
for going live.

## Run it
```bash
npm install
npm run dev        # http://localhost:3000
```

Sign in with **any email**. Use `admin@runlocal.app` for the admin view, or the
**“view as” switch** in the header to flip between buyer / seller / admin.

## The flows
- **Customer:** landing → `/browse` (search + filter) → `/app/[slug]` → checkout →
  `/library` (re-download + “update available” flags)
- **Seller:** `/sell` → `/dashboard` (listings, earnings) → `/dashboard/new`
  (App Package upload + submit for review)
- **Admin:** `/admin` (queue + GMV/revenue stats) → `/admin/[id]` (checklist,
  approve/reject with note)

## Tech
Next.js 16 (App Router) · TypeScript · Tailwind v4 · Firebase (Auth/Firestore/
Storage) · Stripe Connect. Clean light/dark design system in `app/globals.css`.

## Project docs
- [`BUSINESS_MODEL.md`](BUSINESS_MODEL.md) — economics, pricing, roadmap, risks
- [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) — wire real Firebase + Stripe
- [`EMAIL_SETUP.md`](EMAIL_SETUP.md) — transactional email (Resend)

## Where the demo store becomes production
`lib/store.ts` is the single seam. Each function maps 1:1 to a Firestore call
(and `recordPurchase` moves to the Stripe webhook). See `FIREBASE_SETUP.md §4`.
