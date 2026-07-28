# Launch checklist

What's left to turn this from a working front-end demo into a live marketplace
that takes real money. Grouped by priority. Nothing here is styling; the UI and
all flows are built. This is the backend, money, legal, and content work.

Legend: **P0** = can't take a single sale without it · **P1** = needed before a
public launch · **P2** = soon after launch.

---

## P0 — Nothing works for real until these are done

### Backend (Firebase) — see FIREBASE_SETUP.md
- [x] ~~Replace the demo store with real Firestore reads/writes.~~ **Done** —
      `lib/store.ts` is on Firestore with live `onSnapshot` listeners.
- [x] ~~Real authentication.~~ **Done** — email/password with email verification
      (`sendEmailVerification` + a verify banner) and password reset.
- [x] ~~Remove the demo role switcher.~~ **Done.**
- [x] ~~Draft the security rules.~~ **Done** — now version-controlled in
      `firestore.rules` / `storage.rules`, and the self-assign-admin hole is closed.
- [ ] **Create the Firebase project** and enable **Auth (Email/Password)**,
      **Firestore**, **Storage** (manual, console — see FIREBASE_SETUP.md §1).
- [ ] **Set the verification + password-reset email templates** (sender name),
      and add your production domain under Auth → Authorized domains at deploy.
- [ ] **Deploy the security rules**: `firebase deploy --only firestore:rules,storage`.
      Until this runs, the rules aren't live. **(Security-critical.)**
- [ ] **Make yourself the first admin** (set `role: "admin"` on your user doc).
- [ ] Do one **real end-to-end signup** and confirm the verification email arrives.

### Payments (Stripe Connect) — see FIREBASE_SETUP.md §6
- [ ] Stripe account; enable Connect with Express accounts.
- [ ] Seller onboarding: create account links, store `stripeAccountId` on the seller.
- [ ] Real checkout: swap the stub in `app/checkout/[slug]/page.tsx` for a
      Checkout Session with a 15% `application_fee_amount`.
- [ ] Stripe webhook that records the purchase server-side on
      `checkout.session.completed` (this is the *real* `recordPurchase`; the
      client version is only for the demo).
- [ ] Enable Stripe Tax for VAT.

### File delivery (Storage)
- [ ] Seller uploads (the `.zip` package, screenshots, demo video) go to Firebase
      Storage. The form currently only captures filenames.
- [ ] Buyer downloads use short-lived signed URLs, gated behind a check that the
      buyer actually owns the tool. Never a permanent public URL.

### Contact form
- [x] ~~Wire the contact form to a real send.~~ **Done** — it POSTs to
      `app/api/contact/route.ts`, which sends via Resend. It no longer fakes
      success: with no `RESEND_API_KEY` set it shows a mailto fallback instead.
- [ ] Add `RESEND_API_KEY` + `EMAIL_FROM` (verified domain) so it actually sends.

---

## P1 — Needed before you tell the public about it

### Email (Resend) — see EMAIL_SETUP.md
- [ ] Resend account; verify the domain (DKIM/SPF) so mail doesn't hit spam.
- [ ] Transactional emails: purchase receipt + download link (most important),
      submission received, approved/rejected, and a new-submission alert to you.

### Legal & compliance
- [ ] Terms of Service, Privacy Policy, Refund Policy. The footer links are
      placeholders (`#`). You are taking payments and hosting others' software,
      so these are not optional.
- [ ] Business entity + EU VAT / "deemed supplier" treatment. Talk to an
      accountant once (flagged in BUSINESS_MODEL.md). Stripe Tax handles the
      mechanics, but you need the treatment confirmed.
- [ ] A written seller agreement (what you list, payout terms, the 15% fee, the
      14-day guarantee, takedown rights).

### Trust & safety (you promise "reviewed & scanned")
- [ ] Define the actual review + malware-scan process for submissions. The site
      makes this promise on every listing; you need a real process behind it,
      even if it's manual at first.
- [ ] Implement the 14-day refund / "it runs or your money back" flow, including
      holding seller payout across that window.
- [ ] **Enable Firebase App Check** (reCAPTCHA v3) to stop bots abusing signup /
      Firestore. Init is already scaffolded in `lib/firebase.ts` and turns on
      automatically once `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set + registered in
      the console.
- [ ] Add a **name at signup** is done; consider a profile page so sellers can
      edit their public display name later.

### Supply & content (your side)
- [ ] Package your 4 apps as real App Packages (manifest, SETUP.md, LICENSE,
      readable source) with real screenshots and demo videos.
- [ ] **Replace `public/demos/*.mp4`** — they are generated colour-bar test
      patterns, not real recordings.
- [ ] Seed 20–50 quality listings for a curated launch (invite a few indie
      makers). Demand is the real constraint, but an empty store converts nobody.
- [ ] Read and edit the blog articles in your own voice before they're public;
      they were drafted by an assistant and take editorial positions.

### Deploy & domain
- [ ] Buy **apps-marketplace.com**.
- [ ] Deploy to Vercel; add all env vars (`.env.example` lists them).
- [ ] Point the domain, confirm SSL.
- [ ] Register the production Stripe webhook URL.

---

## P2 — Right after launch

- [ ] Analytics (Plausible or GA) + error monitoring (Sentry).
- [ ] Submit the sitemap to Google Search Console; verify indexing.
- [ ] Social share images (`og:image`) for the home page, listings and articles.
- [ ] A proper mobile nav menu — the header is getting full.
- [ ] Loading and error states for the now-real async data. *(Started: listing
      detail + checkout now show a loader instead of a false "not found" flash;
      extend to browse/library/dashboard.)*
- [ ] Per-listing SEO: `app/app/[slug]/page.tsx` still emits generic metadata.
      Read the listing server-side (Admin SDK) to emit a real title/description
      and Product JSON-LD — this is the long-tail traffic engine.
- [ ] A quick accessibility pass (focus order, labels, contrast).
- [ ] Move the blog to a CMS or Firestore so you can publish without a deploy.

---

## Already done (for reference)
Design system, all buyer/seller/admin flows, cart + bookmarks, department
filtering (right-side menu on /browse), listing cards with hover-play video,
About page with FAQ + contact form, the Insights blog with Article structured
data + sitemap entries, logo + favicon, SEO metadata and `robots`/`sitemap`.

**Backend now live in code** (needs a Firebase project + rule deploy to run):
Firestore-backed store with live listeners; email/password auth with email
verification, a verify-email banner, and password reset; name captured at signup;
seller "About the seller" info on listings; version-controlled security rules
(`firestore.rules`/`storage.rules`) with the admin-escalation hole closed;
contact form wired to a Resend route; App Check scaffolded.
