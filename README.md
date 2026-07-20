# AppBazaar

A curated marketplace for finished mini apps. **Buy once, download, run on your
own computer**, with AI assisted setup so it takes minutes rather than
expertise. The platform takes a 15% all-inclusive commission per sale.

Domain: **appbazaar.dev**

## Status
Fully working front-end demo. Every buyer, seller and admin flow runs on an
in-browser store (`lib/store.ts`) seeded with sample data, so **no backend keys
are needed to click through it.** Firebase and Stripe are scaffolded and
documented for going live.

## Run it
```bash
npm install
npm run dev        # http://localhost:3000
```

Sign in with **any email**. Use `admin@appbazaar.dev` for the admin view, or the
**"view as" switch** in the header to flip between buyer, seller and admin.

## The flows
- **Customer:** landing (hero plus listings) → `/app/[slug]` → cart or buy now →
  `/library` with re-download and "update available" flags. Bookmarks included.
- **Seller:** `/sell` → `/dashboard` (listings, earnings) → `/dashboard/new`
  (package upload, up to 5 screenshots, required demo video) → review queue.
- **Admin:** `/admin` (queue plus GMV and revenue stats) → `/admin/[id]`
  (checklist, approve or reject with a note).
- **About:** `/about` holds why this exists, how it works, FAQs and the contact
  form, including the "request a tool" path.

## Tech
Next.js 16 (App Router), TypeScript, Tailwind v4, Firebase (Auth, Firestore,
Storage) and Stripe Connect. Design system lives in `app/globals.css`; the
listing card uses the gradient variant in `components/ui/card.tsx`.

## Project docs
- [`BUSINESS_MODEL.md`](BUSINESS_MODEL.md) for economics, pricing, roadmap, risks
- [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) to wire real Firebase and Stripe
- [`EMAIL_SETUP.md`](EMAIL_SETUP.md) for transactional email via Resend

## Where the demo store becomes production
`lib/store.ts` is the single seam. Each function maps 1:1 to a Firestore call,
and `recordPurchase` moves to the Stripe webhook. See `FIREBASE_SETUP.md` §4.

## Notes
- Brand name and domain live in `lib/brand.ts` and change in one place.
- `public/demos/*.mp4` are generated placeholder clips. Replace them with real
  screen recordings.
- The header role switcher is demo only and must be removed before launch.
