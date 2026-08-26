# CURRENT STATE

**Read this first, before touching anything.** It exists so a new session can be
useful in five minutes instead of re-deriving the project from the file tree.

**Update policy: do not update this file on your own initiative.** Sevval says
when it is time. If you notice something here that has gone stale, say so in
chat and leave the file alone until she asks. A doc that rewrites itself every
session is a doc nobody can trust.

Last updated: 26 August 2026 (seller experience: profiles, handles, listing
control, saves, upload rework, preview. See §8).

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
| `handles.ts` | Pure rules for a seller handle: format, length, reserved words, and a suggestion from a display name. No Firebase, so the form and the security rules can agree on what is valid. |
| `profiles.server.ts` | Admin SDK reads of the public half of a seller. Exists because `/users` is readable only by its owner, so a listing page cannot look a seller up. `resolveSellerProfile` falls back per field to the copy stored on the listing. |
| `saves.ts` / `saves.server.ts` | The public save-count threshold, and the server-side aggregation that counts saves without exposing who made them. Split in two so a client component can read the threshold without importing the Admin SDK. |
| `uploads.ts` | The `Slot` type and `useUploadSlot`, behind the listing form's upload-on-pick. One shared id counter, because two slots with the same id make React drop one. |
| `articles.ts` | The blog. Eight articles as a hardcoded array. Not a CMS. |
| `seed.ts`, `hooks.ts`, `utils.ts`, `categories.server.ts` | Seed data, `useUser`/`useStoreValue`, `safeHttpsUrl`/`isImageSrc`, server-side category labels. |
| `import/` | URL import feature (new, see §8). `safeFetch.ts` is the SSRF guard, `html.ts` parses OG and JSON-LD, `github.ts` and `producthunt.ts` are per-source adapters, `classify.ts` maps topics to categories. |

### `app/` routes worth knowing

- `/` `/browse` `/app/[slug]` are the public catalogue, all server-rendered.
- `/seller/[handle]` is a seller's public page: avatar, bio, join year, their
  tools. Server-rendered, in the sitemap, and what schema.org `author.url`
  points at. Deliberately under `/seller/` rather than the root so a future
  route can never collide with a handle somebody registered.
- `/sell` is the seller pitch and the buyer to seller upgrade.
- `/dashboard` and `/dashboard/new` are the seller's listings and the listing
  form. `?edit=<id>` reuses the form to edit and resubmit.
- `/admin`, `/admin/[id]`, `/admin/[id]/edit`, `/admin/categories` are the
  review console. Gated on `role === "admin"`.
- `/library` is the buyer's purchases. `/saved` is bookmarks. `/cart` is still a
  placeholder.
- `/api/stripe/*` is checkout, Connect onboarding, status sync, webhook.
- `/api/download` is the gated signed-URL download.
- `/api/seller/saves` answers with save counts for the caller's own listings.
  The listing ids are read back from Firestore, never taken from the request.
- `/docs/*` is seller and buyer documentation. `/terms` `/privacy` `/refunds`
  are legal, all still marked draft.

### `components/`

`AppShell`, `Navbar`, `Footer` are the frame. `ListingCard`, `ListingMedia`,
`ListingDetail`, `ListingGallery` render listings. `SellerAvatar` is a seller's photo or their initial. `ui/form.tsx` holds `Field`,
`FormSection` and `inputClass`. `Disclaimer.tsx` is the buyer trust copy.
`PreLaunchNotice.tsx` is temporary and must be removed at launch.

---

## 5. Data model and roles

Firestore collections: **`users`, `listings`, `purchases`, `categories`,
`handles`, `bookmarks`.**

`Listing` carries `status: "draft" | "pending" | "approved" | "rejected" |
"unlisted"`, a `slug` capped at 60 characters, `priceCents`, `runtime`,
`setupMode`, `screenshots[]`, `demoVideo`, `posterImage`, `packagePath`,
`version`, and `sellerId`.

`unlisted` is a seller taking their own tool off sale. It vanishes from browse
and checkout, but **everyone who already bought it keeps downloading it**: see
the allowlist in `/api/download`. Relisting needs no new review.

`AppUser` carries the seller's public identity: `handle`, `bio`, `supportEmail`,
`website`, `avatarUrl`. These used to sit on every `Listing`, which meant a
maker with three tools typed their bio three times. The old listing fields are
still there and still read as a per-field fallback for anything written before
26 August 2026. **Do not delete them.**

`handles/{handle}` is how a handle is resolved to a seller, and the document id
*is* the handle, because Firestore cannot enforce that a field is unique. A
renamed handle is kept and marked `active: false` rather than freed, so an old
link redirects instead of one day resolving to a different person. **Never
delete one.**

`bookmarks/{uid}_{listingId}` is one save. The id binds the pair, which is what
stops one person saving the same tool twice to inflate the count. A save is
private: only its owner can read it, and the public number is counted
server-side. Below five, a listing shows no count at all.

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

1. **Listing.** Seller fills `/dashboard/new`. **Every file uploads the moment
   it is picked**, with its own progress bar, straight from the browser to
   Storage under their own uid. The listing id is reserved at mount so the
   uploads have somewhere to go, and it lives in the saved draft along with the
   resulting paths, so coming back tomorrow costs no re-upload. Submit is just
   the Firestore write. Preview renders the real listing page from form state
   before any of it is sent. `/api/notify/listing` emails the admin.
2. **Review.** Admin approves or rejects at `/admin/[id]`, `/api/notify/review`
   emails the seller. An admin edit does **not** reset status, so a live tool
   stays live.
2b. **Seller edits.** A seller can edit a live listing. Whether that costs them
   their place on the marketplace depends on what changed: presentation (title,
   description, price, screenshots, demo) saves in place and stays live, while
   anything in `REVIEW_CRITICAL_FIELDS` (package, runtime, setup mode, platform,
   version) goes back to the queue. The form says which before they press the
   button, and the admin is only emailed when something actually entered the
   queue. **firestore.rules is the control here, not the client.** Price is
   editable on a live listing, with the $15 to $250 band enforced in the rules.
2c. **Takedown.** A seller takes a tool off sale from the dashboard. Status only:
   the rules refuse a visibility change that moves any other field.
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
  **Do not add a second claim like it.** Note there is a third place it appears:
  the acknowledgment checkbox on the listing form has the seller affirm that
  "every submission is scanned and human-reviewed before it goes live". That one
  is arguably the worst of the three, because it asks the seller to attest to it. Note this collides with the native-app
  work in §8: that copy promises source scanning, and a closed-source DMG has no
  source. Whatever is written for binaries has to be true of binaries.
- **Zip contents are checked by hand, not by code.** Sevval downloads every
  package during review and confirms `manifest.json`, `README.md`, `SETUP.md`,
  `LICENSE.md` and `src/` are present, so a package missing them really is
  rejected. Nothing in the codebase opens a zip: the upload validates extension
  and size only. `/docs/app-package` describes this as happening "at the upload
  step" and "before it ever reaches review", which is the wrong mechanism for a
  real check. **A rewording was drafted and Sevval reverted it on 24 August; she
  will revisit the copy herself.** Do not re-edit that callout, do not read it as
  a promise nobody keeps, and do not build zip validation on the strength of it. **This is not the same as the
  security scan above**, which nothing and nobody performs.
- Legal pages are drafts. Need a lawyer and a real entity name, address and VAT
  number.
- Cart is a placeholder. Only single-item Buy works.
- No refund mechanism, though the site promises fourteen days.
- No App Check, which is the only remaining control on direct-to-Storage uploads.
- Rate limiting resets on redeploy and is per instance.
- **Nothing ever deletes an unreferenced upload.** Replacing an avatar, a
  screenshot or a demo leaves the old file in the bucket forever, because the
  paths are deliberately timestamped so the `immutable` cache header stays
  honest. With 150MB demos and 500MB installers this adds up. Packages are
  exempt: they overwrite at a stable path.
- `/dashboard` and `/account` briefly render their signed-out state before
  Firebase answers, because `!user` means both "signed out" and "not heard back
  yet". `getAuthResolved()` in `lib/store.ts` tells the two apart and `/saved`
  already uses it; the other two have not been changed.
- The buyer download path for an `unlisted` listing has been reasoned through
  but never actually run: it needs a buyer account holding a purchase.

---

## 8. Upcoming work

The full prioritised backlog lives in Claude's memory
(`thesolomarket-next-tasks`), not here. These are the items raised most recently.

### Next up, ahead of everything else

**Seller emails and notifications.** Five templates exist in
`lib/emailTemplates.ts`: new listing to the admin, review decision to the
seller, receipt to the buyer, sale to the seller, sale to the admin. The gaps,
roughly in order of value: welcome as a seller; payout setup incomplete (Stripe
Connect drop-off is silent today, and an approved listing that cannot take money
is invisible failure); first sale, as its own email rather than the same one as
the fortieth; payout sent; a weekly or monthly digest of sales, views and saves.
An in-app notification centre is deliberately **not** in this: a bell needs a
collection, read state and a listener, and for fewer than twenty sellers email
plus an honest dashboard does the same job.

One thing to be careful of: `lib/email.ts` is best-effort Resend with no retry.
Fine for a review notice, not fine for "your payout was sent". Anything
financial has to be visible in the dashboard too, so the email is a convenience
rather than the record.

**Native app packages (the DMG blocker). Built and committed 24 August.**
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

**Automate the signature check: WANTED, deferred (Sevval, 24 August).** The
seller form says "We check the signature before it goes live", which today is
true only while the admin remembers to run `scripts/verify-package.ts`. She was
offered the cheap alternative of softening that copy to "during review" and
**declined it: the copy stays as it is and the automation gets built instead.**
Until it exists, running the script on every installer submission is not
optional, and the admin review page going orange is the reminder.

The design, agreed but not built:

- A `macos-latest` GitHub Actions runner. Free, because this repo is public, and
  it has to be macOS because `codesign`, `spctl` and `stapler` exist nowhere
  else.
- Triggered by `repository_dispatch` from the submit path, which already calls
  `/api/notify/listing` and is the natural place to fan out from.
- **The dispatch payload carries the listing id and nothing else. Never a signed
  download URL:** workflow logs are public on a public repo, so a URL in the
  payload hands an unreviewed seller package to anyone who looks. The runner
  authenticates and fetches the URL itself.
- The runner posts the verdict to a callback route, which writes
  `packageVerification` exactly as the script does. Do not put Firebase Admin
  credentials in Actions secrets; the callback route owns the write.
- 🔑 Two secrets from Sevval: `GH_DISPATCH_TOKEN` (Vercel calls GitHub) and
  `NOTARIZE_CALLBACK_SECRET` (shared, so a stranger cannot POST a fake pass).

**Windows and Linux installers: wanted, not yet accepted.** `.dmg` is the only
format `INSTALLER_EXTENSIONS` allows, because Apple notarization is the only
signal the platform can actually verify. Windows has Authenticode signing and
SmartScreen reputation, Linux has detached GPG signatures on AppImage, and both
are checkable in principle, but neither has a story as clean as `stapler
validate` and neither can be checked from a Mac or a Linux runner as simply.
Widening `INSTALLER_EXTENSIONS` without bringing a verification story is the
thing not to do: `/sell` and `/docs/app-package` both now promise buyers that a
native app is signed and verified. Revisit when a Windows or Linux maker
actually asks.

**Rejected, deliberately: "or provide a download link".** A link is reviewed once
and mutable forever, which is the package-overwrite hole reintroduced through the
front door. It also breaks delivery, "own forever" when a link dies, and the
version tracking behind the Library's "update available" flag.

### Shipped 26 August 2026

Six commits, on `staging` and `main`, rules deployed to both Firebase projects.

- **Seller identity.** `bio`, `supportEmail`, `website`, `avatarUrl` and
  `handle` moved from every `Listing` onto `AppUser`, with a public page at
  `/seller/{handle}`. See §5 for the handle rules, which matter.
- **Seller control of their own listings.** Editing a live listing is possible
  at all now (it wasn't), and no longer pulls it off sale to fix a typo.
  Takedown and relist. A version field, which had never existed, so every
  listing was `1.0.0` forever and the Library's update-available flag could
  never fire.
- **Saves moved off localStorage** into Firestore, so they follow the person
  rather than the browser and can be counted. Seller sees the true count on
  their dashboard.
- **Upload on pick.** The form used to push every file inside the submit
  handler; a 500MB installer meant minutes on a dead button and any failure lost
  the lot. Now each file goes up as it is chosen, with a progress bar, and the
  references live in the draft.
- **Preview.** The seller can look at their own listing page before an admin
  does.

Two pre-existing bugs fixed on the way: the "has this form been touched" check
compared two object literals whose key order differed, so it never matched and
every visit to `/dashboard/new` autosaved a blank draft and armed the leave
dialog over nothing; and dashboard earnings were summed over approved listings
only, so taking a tool off sale would have erased the money it had made.

### In flight

- **URL import for the listing form.** Paste a website or Product Hunt link and
  the form fills itself. Shipped to `staging` and `main` on 24 August
  (`9e1a0f2`) and confirmed working by a real seller, who called the Product
  Hunt import the best part of the flow. `PRODUCTHUNT_TOKEN` is set in Vercel
  and worth having; `GITHUB_API_TOKEN` is marginal because a repo that is for
  sale is usually private, and GitHub falls back to unauthenticated on a 401 so
  an expired token degrades rather than breaks.

### Requested 24 August

- **Buyer accounts for external launch. Parked, 26 August: seller accounts
  only for now.** Accounts and the buyer path work, but the experience is
  seller-shaped: the login copy, the funnel and the onboarding all assume a
  maker. Part of it is already answered, incidentally: saving a tool now needs
  an account, which is the buyer-facing reason to have one before spending
  anything. Do not pick the rest of this up without asking Sevval first.
- **User count in the admin console. Done, `5fde757`.**
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
