# Launch checklist

What's left to turn this from a working front-end demo into a live marketplace
that takes real money. Grouped by priority. Nothing here is styling; the UI and
all flows are built. This is the backend, money, legal, and content work.

Legend: **P0** = can't take a single sale without it · **P1** = needed before a
public launch · **P2** = soon after launch.

---

## P0 — Nothing works for real until these are done

### Backend (Firebase) — see FIREBASE_SETUP.md
- [ ] Create the Firebase project; enable Auth, Firestore, Storage.
- [ ] Replace the demo store in `lib/store.ts` with real Firestore reads/writes.
      Every function already maps 1:1 to a Firestore call (documented in the
      setup guide). This is the single biggest task.
- [ ] Real authentication (email link + Google). Replace the demo email login.
- [ ] Paste in the Firestore security rules (drafted in FIREBASE_SETUP.md §3).
- [ ] Make yourself the first admin (set `role: "admin"` on your user doc).
- [ ] **Remove the demo role switcher** in the header and the demo login hint.

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
- [ ] Wire the About-page contact form to a real send. **Right now it shows a
      success message but sends nothing** — a promise to users that isn't kept.
      Use Resend (EMAIL_SETUP.md).

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
- [ ] Loading and error states for the now-real async data.
- [ ] A quick accessibility pass (focus order, labels, contrast).
- [ ] Move the blog to a CMS or Firestore so you can publish without a deploy.

---

## Already done (for reference)
Design system, all buyer/seller/admin flows, cart + bookmarks, department
filtering, listing cards with hover-play video, About page with FAQ + contact
form, the Insights blog with Article structured data + sitemap entries, logo +
favicon, SEO metadata and `robots`/`sitemap`. The whole thing runs today on a
demo store with zero backend keys.
