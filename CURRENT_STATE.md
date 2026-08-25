# CURRENT STATE

**Read this first, before touching anything.** It exists so a new session can be
useful in five minutes instead of re-deriving the project from the file tree.

**Update policy: do not update this file on your own initiative.** Sevval says
when it is time. If you notice something here that has gone stale, say so in
chat and leave the file alone until she asks. A doc that rewrites itself every
session is a doc nobody can trust.

Last updated: 24 August 2026 (native app packages built, see §8).

---

## 1. What this is

**The Solo Market** is a marketplace for small software tools. The promise is
*buy once, own forever, no subscription*. A solo maker uploads a zipped app
package, an admin reviews it by hand, and a buyer pays once and keeps it.

- Repo: `apps.skapankaya.com` (GitHub `skapankaya12/apps.skapankaya.com`)
- Production: `www.thesolomarket.com`
- Revenue: **15% all-inclusive commission.** No listing fees, no payout fees.
- Owner is EU (Portugal), so DAC7 applies.

Current phase: **seller-only soft launch.** Sevval is approaching solo builders
one at a time to seed listings. No buyers yet. Public launch September 2026,
which is also when payouts open. Production deliberately runs with no Stripe
keys until then.

---

## 2. How to work here

These are the rules that get broken most often. Two of them were learned by
breaking them.

### Do not delete copy you have not traced

**This is the one that has actually caused damage.** On 23 August a copy trim
removed the sentence *"Want to list higher? Contact us about premium listings"*
from the price hint in the listing form. It read like filler. It was the only
reference to premium listings anywhere in the codebase, and deleting it erased
a business concept from the product.

Before removing any user-visible sentence, grep the repo for its key nouns. If
the phrase is the only mention of something, it is load-bearing, however
decorative it looks.

### No em dashes or en dashes in user-visible copy

Sevval asked for this directly. A dash in product copy reads as AI-written, and
this is a marketplace whose whole pitch is a real person behind every tool.
Rewrite the sentence rather than swapping the dash for a comma.

Applies to JSX text and string literals. Code comments are exempt. As of
24 August the listing form and import panel are clean; roughly 138 remain
elsewhere, heaviest in `app/docs/selling` and `app/privacy`.

### Do not rewrite marketing copy to suit a layout

Verbatim instruction: *"do not touch the content."* The pitch in `lib/brand.ts`
and the seeded listing copy stay as written. Design around them.

### Design derives from the product, not from a style period

Eleven design directions were rejected in a row. The seven that were art
movements (Bauhaus, Swiss, De Stijl, and so on) were all rejected. The four that
were accepted came from facts about the marketplace. Start from a claim the
product already makes and let the layout follow.

### This is not the Next.js you know

Per `AGENTS.md`: this version has breaking changes. Read the relevant guide in
`node_modules/next/dist/docs/` before writing code. Currently Next 16.2.10,
React 19.2.4, Tailwind 4.

### Keep field hints short

The listing form was cut from 169 words of hint text to 82. Hints carry facts
only, no encouragement, no restatement of the label. Under about ten words.

---

## 3. Stack and environments

Next.js 16 App Router, Firebase (Auth, Firestore, Storage), Stripe Connect
Express, hosted on Vercel. No analytics, no trackers, no CSS framework beyond
Tailwind.

| | Staging | Production |
|---|---|---|
| Branch | `staging` | `main` |
| Domain | `staging.thesolomarket.com` | `www.thesolomarket.com` |
| Firebase project | `apps-marketplace-74a9a` | `thesolomarket` |
| Stripe | test keys | no keys yet, by choice |

`.env.local` mirrors staging. **Canonical origin is `https://www.thesolomarket.com`,
held in `brand.url`.** Every machine-readable URL (canonicals, sitemap, JSON-LD,
og:url) must use `brand.url`. `brand.domain` is display text only. The apex
308-redirects to www, and webhooks must use www because they do not follow
redirects.

There is **no `.firebaserc`**, deliberately. `--project` is mandatory on every
`firebase deploy` so a staging command cannot silently hit production.

**Env vars used in code but missing from `.env.example`:** `WAITLIST_WEBHOOK_URL`,
`PRODUCTHUNT_TOKEN`, `GITHUB_API_TOKEN`. Worth adding.

---

## 4. Directory map

### `lib/` is where the logic lives

| File | Purpose |
|---|---|
| `store.ts` | **The main data layer, 993 lines.** Firestore + Auth wrapped so components call synchronous getters (`getApprovedListings()`). `onSnapshot` listeners keep in-memory caches live and call `emit()` so subscribers re-render. Cart and bookmarks are localStorage, not Firestore. |
| `types.ts` | `Listing`, `AppUser`, `Purchase`, `CategoryDef`, `Role`, `Runtime`, `SetupMode`, plus `DEFAULT_CATEGORIES`. Read this before touching any data shape. |
| `listings.server.ts` | Admin SDK reads, memoized with React `cache()`. This is what makes listing pages server-render. Without it the catalogue was invisible to AI crawlers. |
| `firebase.ts` / `firebaseAdmin.ts` | Client SDK / Admin SDK (lazy, guarded on `adminConfigured`). |
| `storage.ts` | Uploads. Paths are **uid-scoped**: `submissions/{uid}/{listingId}.zip`, `public/shots/{uid}/…`, `public/demos/{uid}/…`. Sets long `Cache-Control` on public assets. |
| `media.ts` | File rules in one place: 40s and 150MB demo cap, 200MB package cap, QuickTime rejection. Mirrored in `storage.rules`. |
| `markdown.ts` | A deliberately tiny Markdown subset for seller descriptions: headings, lists, paragraphs, nothing else. No HTML parsed or emitted. Rendered by `components/RichText`. |
| `email.ts` / `emailTemplates.ts` | Resend REST, best-effort. **All email copy is in `emailTemplates.ts`,** one file to edit. |
| `rateLimit.ts` | In-memory fixed-window limiter, no deps. Per serverless instance, so it stops one script from one place, not a distributed flood. Cannot protect Storage uploads at all. |
| `stripe.ts` | Stripe client plus `siteOrigin(req)`. |
| `brand.ts` | Name, canonical URL, pitch copy. |
| `articles.ts` | The blog. Eight articles as a hardcoded array. Not a CMS. |
| `seed.ts`, `hooks.ts`, `utils.ts`, `categories.server.ts` | Seed data, `useUser`/`useStoreValue`, `safeHttpsUrl`/`isImageSrc`, server-side category labels. |
| `import/` | URL import feature (new, see §8). `safeFetch.ts` is the SSRF guard, `html.ts` parses OG and JSON-LD, `github.ts` and `producthunt.ts` are per-source adapters, `classify.ts` maps topics to categories. |

### `app/` routes worth knowing

- `/` `/browse` `/app/[slug]` are the public catalogue, all server-rendered.
- `/sell` is the seller pitch and the buyer to seller upgrade.
- `/dashboard` and `/dashboard/new` are the seller's listings and the listing
  form. `?edit=<id>` reuses the form to edit and resubmit.
- `/admin`, `/admin/[id]`, `/admin/[id]/edit`, `/admin/categories` are the
  review console. Gated on `role === "admin"`.
- `/library` is the buyer's purchases. `/saved` is bookmarks. `/cart` is still a
  placeholder.
- `/api/stripe/*` is checkout, Connect onboarding, status sync, webhook.
- `/api/download` is the gated signed-URL download.
- `/docs/*` is seller and buyer documentation. `/terms` `/privacy` `/refunds`
  are legal, all still marked draft.

### `components/`

`AppShell`, `Navbar`, `Footer` are the frame. `ListingCard`, `ListingMedia`,
`ListingDetail`, `ListingGallery` render listings. `ui/form.tsx` holds `Field`,
`FormSection` and `inputClass`. `Disclaimer.tsx` is the buyer trust copy.
`PreLaunchNotice.tsx` is temporary and must be removed at launch.

---

## 5. Data model and roles

Firestore collections: **`users`, `listings`, `purchases`, `categories`.**

`Listing` carries `status: "draft" | "pending" | "approved" | "rejected"`, a
`slug` capped at 60 characters, `priceCents`, `runtime`, `setupMode`,
`screenshots[]`, `demoVideo`, `posterImage`, `packagePath`, and `sellerId`.

### Roles

Three roles: `buyer`, `seller`, `admin`.

- **Everyone signs up as `buyer`.** See `signUp` in `store.ts`.
- `/sell` calls `setRole("seller")` to upgrade. `setRole` refuses `admin`, so
  there is no privilege escalation path.
- Admin is set by hand on the user doc per Firebase project. Sevval
  (`kapankayasevval@gmail.com`) is the sole admin. Done on staging; **still to
  do on production after first signup.**
- Buying already requires an account: `/checkout/[slug]` redirects to
  `/login?next=…` when signed out.

---

## 6. The flows that matter

1. **Listing.** Seller fills `/dashboard/new`, files upload straight from the
   browser to Storage under their own uid, `createListing` writes the doc as
   `pending`, `/api/notify/listing` emails the admin.
2. **Review.** Admin approves or rejects at `/admin/[id]`, `/api/notify/review`
   emails the seller. An admin edit does **not** reset status, so a live tool
   stays live.
3. **Buying.** `/api/stripe/checkout` reads `priceCents` from Firestore, never
   from the client, and blocks non-approved listings, self-purchase, and sellers
   without `charges_enabled`.
4. **Webhook.** `checkout.session.completed` is the only wired event. Verifies
   the signature against the raw body, idempotent by session id, records the
   purchase and sends three emails.
5. **Download.** `/api/download` binds `packagePath` to the seller's own uid
   folder and checks buyer, seller or admin. Buyers can only download while the
   listing is approved.

---

## 7. Known gaps and unkept claims

- **The automated security scan does not exist.** `components/Disclaimer.tsx`
  and `/about` state as fact that every package gets an automated scan for
  network calls, obfuscation and exfiltration patterns. It has not been built.
  This is launch-gating and it is the single most important honesty issue open.
  **Do not add a second claim like it.** Note this collides with the native-app
  work in §8: that copy promises source scanning, and a closed-source DMG has no
  source. Whatever is written for binaries has to be true of binaries.
- **Zip contents are checked by hand, not by code.** Sevval downloads every
  package during review and confirms `manifest.json`, `README.md`, `SETUP.md`,
  `LICENSE.md` and `src/` are present, so a package missing them really is
  rejected. Nothing in the codebase opens a zip: the upload validates extension
  and size only. `/docs/app-package` describes this as happening "at the upload
  step" and "before it ever reaches review", which is the wrong mechanism for a
  real check. Do not read that callout as a promise nobody keeps, and do not
  build zip validation on the strength of it. **This is not the same as the
  security scan above**, which nothing and nobody performs.
- Legal pages are drafts. Need a lawyer and a real entity name, address and VAT
  number.
- Cart is a placeholder. Only single-item Buy works.
- No refund mechanism, though the site promises fourteen days.
- No App Check, which is the only remaining control on direct-to-Storage uploads.
- Rate limiting resets on redeploy and is per instance.

---

## 8. Upcoming work

The full prioritised backlog lives in Claude's memory
(`thesolomarket-next-tasks`), not here. These are the items raised most recently.

### Next up, ahead of everything else

**Native app packages (the DMG blocker). BUILT 24 August, not yet committed.**
Raised by the TeraConvert maker: signed and notarized Mac DMG, closed source,
drag to Applications, no terminal and no `SETUP.md`. The App Package contract
assumed source-available software, so he could not list.

What shipped:

- `SetupMode` gained `"installer"`, and a `Platform` type was added
  (`macos | windows | linux | cross`). **Setup-mode copy now lives in exhaustive
  `Record<SetupMode, ...>` maps in `lib/types.ts`** rather than in ternaries. The
  four `mode === "one-command" ? a : b` reads scattered across the seller form,
  listing page and admin console would each have silently labelled installers as
  "AI-assisted". A Record makes the next mode a compile error.
- `platform` is asked for only when `runtime === "binary"`, and now drives
  schema.org `operatingSystem`. Previously every desktop app published
  "Windows, macOS, Linux", so a Mac-only DMG was advertised to Google, and to
  buyers, as running on Windows.
- `.dmg` uploads: `lib/media.ts` owns the rules (`validatePackage`,
  `packageAccept`, `maxPackageBytes`), installers cap at 500MB against 200MB for
  source, `storage.rules` raised to match, `uploadPackage` stores the real
  extension, and `/api/download` names the file from the stored path instead of
  hardcoding `.zip`. Switching setup method drops a package that no longer fits.
- **`scripts/verify-package.ts`** is the source-review substitute for installers:
  `codesign` + `spctl` + `xcrun stapler validate`, writing a
  `packageVerification` verdict onto the listing. **It has to run on macOS**, so
  it cannot run on Vercel or in a Linux container. The admin review page shows
  the verdict and shouts when it is missing or stale (a re-upload changes
  `packagePath`, which invalidates an older pass).

  ```
  npx tsx --env-file=.env.local scripts/verify-package.ts <listingId>
  ```

- `/docs/app-package` gained a "Two kinds of package" fork and an Installers
  section with the three commands a seller can run themselves.

**Still open on this.** The seller form says "We check the signature before it
goes live", which is only true if the admin runs the script. The intended fix is
a `macos-latest` GitHub Actions runner (free, the repo is public) triggered by
`repository_dispatch` on submission, posting the verdict back to a callback
route. **The dispatch payload must carry the listing id only, never a signed
download URL:** workflow logs are public on a public repo. Needs two secrets,
`GH_DISPATCH_TOKEN` and `NOTARIZE_CALLBACK_SECRET`.

**Rejected, deliberately: "or provide a download link".** A link is reviewed once
and mutable forever, which is the package-overwrite hole reintroduced through the
front door. It also breaks delivery, "own forever" when a link dies, and the
version tracking behind the Library's "update available" flag.

### In flight

- **URL import for the listing form.** Paste a website or Product Hunt link and
  the form fills itself. Shipped to `staging` and `main` on 24 August
  (`9e1a0f2`) and confirmed working by a real seller, who called the Product
  Hunt import the best part of the flow. `PRODUCTHUNT_TOKEN` is set in Vercel
  and worth having; `GITHUB_API_TOKEN` is marginal because a repo that is for
  sale is usually private, and GitHub falls back to unauthenticated on a 401 so
  an expired token degrades rather than breaks.

### Requested 24 August

- **Buyer accounts for external launch.** Accounts and the buyer path already
  work, but the experience is seller-shaped: the login copy, the funnel and the
  onboarding all assume a maker. Needs a buyer-facing reason to have an account
  before checkout. *Confirm with Sevval exactly what is missing before building.*
- **User count in the admin console.** `/admin` currently shows three stats:
  Pending review, Live listings, Total GMV. Add a registered-user count next to
  them. Firebase already tracks it, so this is a read, not new bookkeeping.
- **More blog articles.** Eight exist in `lib/articles.ts`, AI-written, and the
  standing task is to rewrite them in Sevval's own voice.

### Scoped, awaiting decisions

Premium listings, watermark disclosure, and upvotes. Scoping document with four
open questions:
<https://claude.ai/code/artifact/88aea4e5-6ab0-4491-b9a0-15bc5505b607>

Headlines: premium should be an assurance tier rather than a paid one, since
there are no listing fees and a higher price already pays more commission.
Watermark disclosure closes a real refund-liability gap. Per-buyer
fingerprinting would reverse the piracy position already written in
`BUSINESS_MODEL.md` §7.

---

## 9. Where else to look

| Source | What it holds |
|---|---|
| `AGENTS.md` | The Next.js warning. Short and mandatory. |
| `BUSINESS_MODEL.md` | Commission maths, pricing bands, accepted risks. **§7 records the decision to accept piracy and reject DRM.** Note its $10 to $29 price band is stale; the form enforces $15 to $250. |
| `LAUNCH_CHECKLIST.md` | Launch gating. |
| `FIREBASE_SETUP.md`, `EMAIL_SETUP.md` | Service configuration. |
| `firestore.rules`, `storage.rules` | Security rules. Read before changing any path or data shape. |
| Claude memory | Environment details, the full backlog, debugging lessons, design feedback. |
