# CURRENT STATE

**Read this first, before touching anything.** It exists so a new session can be
useful in five minutes instead of re-deriving the project from the file tree.

**Update policy: do not update this file on your own initiative.** Sevval says
when it is time. If you notice something here that has gone stale, say so in
chat and leave the file alone until she asks. A doc that rewrites itself every
session is a doc nobody can trust.

Last updated: 12 September 2026, at Sevval's request (**seller emails done for
the seller-only phase**, see "Emails: where they stand" in §8; the seller
welcome and how mail actually leaves the building, launch moved to November, the "fully
unlocked" listing rule, the "free AI assistant" wording removed, and what
shipped between 27 August and 6 September: signup asking buy or sell, the
homepage split, footer badges. See §8).

Before that: 26 August 2026 (seller experience, the /sell rebuild, the
AI-readiness fixes, /free, three articles), amended 6 September with four
scoping passes that built nothing.

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
one at a time to seed listings. No buyers yet. Public launch **November 2026**
(moved from September on 12 September), which is also when payouts open.
Production deliberately runs with no Stripe keys until then. The date appears
in user-facing copy in two places, the payouts notice in `app/dashboard` and
the waitlist confirmation in `components/WaitlistForm.tsx`; move both if it
moves again.

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
`PRODUCTHUNT_TOKEN`, `GITHUB_API_TOKEN`, the two optional welcome-email
switches `SELLER_WELCOME_EMAIL` (`off` stops it) and `SELLER_WELCOME_FROM`, and
the lifecycle cron's `CRON_SECRET` (required, or the cron refuses to run),
`LIFECYCLE_EMAILS` (`live` sends; anything else is a dry run) and the optional
`EMAIL_LINK_SECRET` (signs unsubscribe links; derived from the Admin key when
unset). Worth adding.

### Mail: three services, three jobs

Checked against public DNS on 12 September. DNS lives at **Namecheap**
(`registrar-servers.com`), not Vercel, so every mail record is edited there.

| Job | Who | Evidence |
|---|---|---|
| Sending | **Resend**, which runs on Amazon SES in eu-west-1 | `send` MX points at `feedback-smtp.eu-west-1.amazonses.com` |
| Receiving (anything @thesolomarket.com, including hello@) | **Google Workspace** | root MX is `smtp.google.com` |
| Images inside emails | Vercel, the site itself | plain files in `public/email/`, so a new one only shows in mail once deployed |

Firebase still sends the password-reset email, and the contact form goes to a
Google Sheet; neither touches Resend. **Email verification no longer comes
from Firebase** (since 12 September): its body cannot be designed in the
console, so the site asks the Admin SDK for the link alone
(`lib/verification.server.ts`) and sends it in its own email. A new seller gets
it inside the welcome ("first, confirm your email"); anyone else gets
`design/emails/verify.html` from `/api/auth/verification`, which is also what
the verify banner's "resend" calls. Firebase throttles link generation
project-wide after a burst (`TOO_MANY_ATTEMPTS_TRY_LATER`); the route answers
that as a 429. The link's "continue" address must be an Authorized domain in
Firebase Auth or Firebase refuses it, in which case the link is made without
one: on 12 September `staging.thesolomarket.com` was not authorized in the
staging project. Production's list was not checked.

Authentication records, all live as of 12 September: DKIM for Resend
(`resend._domainkey`) and for Google (`google._domainkey`); SPF for Resend on
`send` (`include:amazonses.com`) and for Google on the root
(`include:_spf.google.com`), the last two added that day; DMARC at
`_dmarc` with **`p=none`**, also added that day. Move DMARC to `p=quarantine`
after a few weeks of mail arriving normally. Do not accept Google Admin's
"naked domain redirect": it wants the root A record pointed at Google, and the
root A record is what keeps the apex redirecting to Vercel.

---

## 4. Directory map

### `lib/` is where the logic lives

| File | Purpose |
|---|---|
| `store.ts` | **The main data layer, about 1,460 lines.** Firestore + Auth wrapped so components call synchronous getters (`getApprovedListings()`). `onSnapshot` listeners keep in-memory caches live and call `emit()` so subscribers re-render. The cart is localStorage; saves (bookmarks) moved to Firestore on 26 August, see §5. |
| `types.ts` | `Listing`, `AppUser`, `Purchase`, `CategoryDef`, `Role`, `Runtime`, `SetupMode`, plus `DEFAULT_CATEGORIES`. Read this before touching any data shape. |
| `listings.server.ts` | Admin SDK reads, memoized with React `cache()`. This is what makes listing pages server-render. Without it the catalogue was invisible to AI crawlers. |
| `firebase.ts` / `firebaseAdmin.ts` | Client SDK / Admin SDK (lazy, guarded on `adminConfigured`). |
| `storage.ts` | Uploads. Paths are **uid-scoped**: `submissions/{uid}/{listingId}.zip`, `public/shots/{uid}/…`, `public/demos/{uid}/…`. Sets long `Cache-Control` on public assets. |
| `media.ts` | File rules in one place: 40s and 150MB demo cap, 200MB package cap, QuickTime rejection. Mirrored in `storage.rules`. |
| `markdown.ts` | A deliberately tiny Markdown subset for seller descriptions: headings, lists, paragraphs, bold, italic, code, bare https links. No HTML parsed or emitted. Rendered by `components/RichText`. `parseBlocks(text, { images: true })` also reads `![alt](url)` lines as screenshots; only review notes ask for that, so descriptions render as before. |
| `reviewImages.ts` | Which image URLs a review note may show: only our own bucket under `public/review/`. Applied by both renderers, so a hand-typed link to another site or a tracking pixel shows as nothing. |
| `noteEmail.ts` | A review note as inline-styled email HTML, from the same blocks RichText draws. Escapes every piece of text and emits a fixed set of tags. |
| `email.ts` / `emailTemplates.ts` | Resend REST, best-effort. **All email copy is in `emailTemplates.ts`,** one file to edit, with one exception: the seller welcome, below. `sendEmail` takes an optional `from` (mail from a person rather than noreply) and inline `cid:` attachments. |
| `emails/sellerWelcome.ts` | **Generated, do not edit.** The seller welcome email as one HTML string, compiled from `design/emails/welcome.html` by `design/emails/build-template.mjs`. |
| `rateLimit.ts` | In-memory fixed-window limiter, no deps. Per serverless instance, so it stops one script from one place, not a distributed flood. Cannot protect Storage uploads at all. |
| `stripe.ts` | Stripe client plus `siteOrigin(req)`. |
| `brand.ts` | Name, canonical URL, pitch copy. |
| `xhandle.ts` | Pure rules for a seller's X handle: accepts a bare name, `@name` or a pasted x.com/twitter.com URL and hands back the bare handle. Separate from `handles.ts` because that file protects a URL on this site and this one only describes a name on someone else's platform. |
| `handles.ts` | Pure rules for a seller handle: format, length, reserved words, and a suggestion from a display name. No Firebase, so the form and the security rules can agree on what is valid. |
| `profiles.server.ts` | Admin SDK reads of the public half of a seller. Exists because `/users` is readable only by its owner, so a listing page cannot look a seller up. `resolveSellerProfile` falls back per field to the copy stored on the listing. `getPublicSellersFor` builds the sphere on `/sell` from whoever has an approved listing, ranked photo first. |
| `saves.ts` / `saves.server.ts` | The public save-count threshold, and the server-side aggregation that counts saves without exposing who made them. Split in two so a client component can read the threshold without importing the Admin SDK. |
| `uploads.ts` | The `Slot` type and `useUploadSlot`, behind the listing form's upload-on-pick. One shared id counter, because two slots with the same id make React drop one. |
| `articles.ts` | The blog. Nine articles as a hardcoded array. Not a CMS. `Block` now has an inline `Rich` form so a paragraph or list item can hold links; a bare string is still valid, which is why the older articles needed no edit. |
| `freeTools.server.ts` / `freeTools.ts` | The /free directory. Admin SDK reads for the public page, client SDK writes for the submit form and the review queue. Split for the same reason as `saves.*`. Not part of `store.ts`: one server component reads it and one admin screen edits it, so a live listener on every page would be a subscription nobody consumes. |
| `seed.ts`, `hooks.ts`, `utils.ts`, `categories.server.ts` | Seed data, `useUser`/`useStoreValue`, `safeHttpsUrl`/`isImageSrc`, server-side category labels. |
| `import/` | URL import feature (new, see §8). `safeFetch.ts` is the SSRF guard, `html.ts` parses OG and JSON-LD, `github.ts` and `producthunt.ts` are per-source adapters, `classify.ts` maps topics to categories. |

### `app/` routes worth knowing

- `/` `/browse` `/app/[slug]` are the public catalogue, all server-rendered.
- `/seller/[handle]` is a seller's public page: avatar, bio, join year, their
  tools. Server-rendered, in the sitemap, and what schema.org `author.url`
  points at. Deliberately under `/seller/` rather than the root so a future
  route can never collide with a handle somebody registered.
- `/sell` is the seller pitch and the buyer to seller upgrade. Server-rendered
  since the sphere needs the seller list; only the CTA is a client component.
- `/free` is the directory of free tools that live on other people's sites, and
  `/free/submit` is its short submission form. Server-rendered page, client
  form. See §5 for why it is not a `Listing`.
- `/dashboard` and `/dashboard/new` are the seller's listings and the listing
  form. `?edit=<id>` reuses the form to edit and resubmit.
- `/admin`, `/admin/[id]`, `/admin/[id]/edit`, `/admin/categories` are the
  review console. Gated on `role === "admin"`. `/admin/free` is the directory
  queue, deliberately a separate screen: a listing review asks whether software
  is safe, a directory review asks whether a link is real and belongs, and one
  queue holding both would blur two standards the /free page tells apart.
- `/library` is the buyer's purchases. `/saved` is bookmarks. `/cart` is still a
  placeholder.
- `/api/stripe/*` is checkout, Connect onboarding, status sync, webhook.
- `/api/download` is the gated signed-URL download.
- `/api/profile/x-avatar` fetches the photo on a seller's X profile and returns
  the bytes. It does not save anything: the browser uploads it through the same
  `uploadAvatar` a picked file goes through, because the Admin SDK ignores
  storage.rules and a server-side write would step around the uid binding that
  is the only control on that path. Same reasoning as `/api/import/asset`.
  Goes through unavatar.io, since X's own user lookup left the free tier.
  Answers signed-out callers too, because signup calls it before an account
  exists: it can only fetch one fixed host for a validated handle, so a token
  only decides whether the rate limit counts the account (20 an hour) or the
  IP (10). Sign in with X itself stays declined, see §8.
- `/api/seller/stats` answers with the caller's own saves, sales and earnings.
  Both underlying collections are private in the rules (a save belongs to the
  person who made it, a purchase to its buyer), so these aggregates exist
  server-side or not at all. Scoped to the caller: listing ids are read back
  from Firestore and purchases matched on `sellerId`, never taken from the
  request.
- `/login` doubles as signup. Signup is two columns and asks, beside the form,
  whether somebody is here to buy or to sell (above the Google button, because
  Google cannot tell signing up from signing in). It also takes an optional
  photo, uploaded straight after the account exists since the avatar path is
  scoped to a uid that does not exist until then. Choosing sell also shows an
  optional X handle with "Use my X photo", which fills that same photo slot and
  saves the handle to the new account.
- `/api/notify/welcome` sends the seller welcome email. See §6, flow 0.
- `/api/cron/lifecycle` is the daily lifecycle run, scheduled in `vercel.json`
  (09:00 UTC). See §6, flow 0b.
- `/api/email/unsubscribe` takes a signed link (`lib/emailLinks.server.ts`).
  GET only shows a confirm button and POST does it, because mail scanners open
  every link in a message; POST is also Gmail's one-click unsubscribe.
- `/docs/*` is seller and buyer documentation. `/terms` `/privacy` `/refunds`
  are legal, all still marked draft.

### `design/emails/`

Where emails are designed, outside the app so nothing in it ships as a page.
`welcome.html` (the seller welcome), `no-listing.html` (the lifecycle tip) and
`rejected.html` and `approved.html` (whose sample title, note and links sit in
slot markers the build swaps for placeholders, and whose optional blocks sit in
"if" markers the sender keeps or drops) are previewed with the `emailpreview` entry
in `.claude/launch.json` (a static server on port 4410; `img/` is a symlink to
`public/email/`). Two scripts:

- `build-template.mjs` compiles `welcome.html` into `lib/emails/sellerWelcome.ts`.
  **Re-run it after any edit to the HTML, or the site keeps sending the old
  design.**
- `build-illustrations.mjs` resizes Sevval's step illustrations from
  `source/*.png` into `public/email/step-*.jpg` at 720x480.

Email HTML is not web HTML: tables, inline styles, and coloured words done one
span per letter, because gradient text via `background-clip` goes invisible in
Gmail.

### `components/`

`AppShell`, `Navbar`, `Footer` are the frame. `ListingCard`, `ListingMedia`,
`ListingDetail`, `ListingGallery` render listings. `SellerAvatar` is a seller's photo or their initial. `ui/img-sphere.tsx` is the rotating sphere and `SellerSphere` fills it (photo, then initial, then a muted logo for the empty spots). `StartSellingButton` is the /sell CTA. `ui/form.tsx` holds `Field`,
`FormSection` and `inputClass`. `FreeToolCard` is one /free entry, a plain
server component because the card is a link out with nothing to hydrate.
`ui/InfoTooltip.tsx` opens on hover and on tap: hover and pin are separate
state, because one flag toggled by both means the click after `mouseenter`
closes what the hover just opened. `Disclaimer.tsx` is the buyer trust copy.
`PreLaunchNotice.tsx` is temporary and must be removed at launch.
`NoteEditor.tsx` is the review console's note editor: toolbar (bold, lists,
link, screenshot), screenshots uploaded the moment they are pasted, dropped or
picked, a Write/Preview toggle, and an Expand view with the text beside the note
as the seller will see it. `FooterBadges.tsx` is the strip of launch-board and directory badges under the
footer, a seamless marquee; adding one is a line in its `BADGES` array.

---

## 5. Data model and roles

Firestore collections: **`users`, `listings`, `purchases`, `categories`,
`handles`, `bookmarks`, `freeTools`, `emailLog`.**

`emailLog/{uid}` records which one-time emails an account has been sent
(`sellerWelcomeAt`, `noListingNudgeAt`) and whether it has unsubscribed from
lifecycle mail (`optOut`, `optOutAt`). **Server-only:** there is no rule for it, so
clients can neither read nor write it and nobody can clear it to be sent the
same email again. It is deliberately not a field on `users`, which its owner
can write. Any later lifecycle email records itself here too.

`freeTools` is the /free directory and is deliberately **not** a `Listing` with
a flag. Almost every field on `Listing` describes delivery (package, price,
version, runtime, setup mode, platform) and a free tool has none of them.
Sharing the type would have meant teaching checkout, download, the dashboard,
the admin console and the rules to ask "but is this the external kind?", and the
answer being wrong anywhere is either a tool nobody can download or a link
somebody can buy. Nothing existing had to change. A submitter may edit their own
entry only while it is `pending`: once approved, the record is the reviewed
thing, which is the opposite of the listings rule and on purpose, because nobody
owns a link except the site that vouched for it.

`Listing` carries `status: "draft" | "pending" | "approved" | "rejected" |
"unlisted"`, a `slug` capped at 60 characters, `priceCents`, `runtime`,
`setupMode`, `screenshots[]`, `demoVideo`, `posterImage`, `packagePath`,
`version`, and `sellerId`. `reviewNote` is the admin's note in the Markdown
subset above plus screenshots (`![screenshot](url)`, stored under
`public/review/{adminUid}/{listingId}/`), shown to the seller on their
dashboard and in the rejection email.

`unlisted` is a seller taking their own tool off sale. It vanishes from browse
and checkout, but **everyone who already bought it keeps downloading it**: see
the allowlist in `/api/download`. Relisting needs no new review.

`AppUser` carries the seller's public identity: `handle`, `bio`, `supportEmail`,
`website`, `xHandle`, `avatarUrl`. These used to sit on every `Listing`, which meant a
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

- **Every account document is created as `buyer`,** because firestore.rules
  allows no other role on create. Signup asks buy or sell; choosing sell calls
  `becomeSeller()` straight after, which reads the uid from Firebase Auth
  (the store's `currentUser` is still null at that moment) and promotes a
  buyer only, never an admin.
- `/sell`'s Start selling button calls `setRole("seller")` for someone already
  signed in. `setRole` refuses `admin`, so there is no privilege escalation
  path.
- Both promotions fire the seller welcome email. See §6, flow 0.
- Admin is set by hand on the user doc per Firebase project. Sevval
  (`kapankayasevval@gmail.com`) is the sole admin. Done on staging; **still to
  do on production after first signup.**
- Buying already requires an account: `/checkout/[slug]` redirects to
  `/login?next=…` when signed out.

---

## 6. The flows that matter

0. **Becoming a seller.** `becomeSeller` or `setRole("seller")` writes the role,
   then calls `/api/notify/welcome`, which sends the welcome email **once per
   account, ever**. The client only says "now". The server reads the role from
   Firestore, takes the address from Firebase Auth rather than the user doc
   (which its owner can write, so anyone could otherwise aim a welcome at a
   stranger), and claims `emailLog/{uid}` in a transaction before sending, so
   two tabs cannot both send. A Resend failure releases the claim, so it is
   retried on the next promotion rather than lost. It comes from
   `The Solo Market <hello@thesolomarket.com>`, replies to hello@,
   subject "guess what? happy to have you!". Accounts that were already sellers
   before 12 September never trigger it. While the address is unverified the
   welcome carries the confirm-your-email block, and says so in its response;
   the signup form sends the standalone verification email only when it did
   not (a buyer, or a seller whose welcome could not go). Google accounts are
   verified already and get neither.
0b. **The daily lifecycle run.** Vercel Cron calls `/api/cron/lifecycle` once
   a day with `CRON_SECRET`. Today it sends one email, the no-listing tip
   (`design/emails/no-listing.html`): to a seller three days past becoming one
   (dated by `emailLog.sellerWelcomeAt`, else the account's `createdAt`) with no
   document in `listings` under their sellerId in any status, who has not had
   it and has not unsubscribed. Every fact is read at run time, so submitting a
   listing is what cancels it. **It is a dry run unless `LIFECYCLE_EMAILS=live`**:
   nothing goes to sellers and the admin is emailed the list of who would have
   been sent it. Live, each send is claimed in `emailLog` first and released on
   failure, capped at 50 a run, and carries List-Unsubscribe headers. The admin
   email only goes out on days somebody is due. **Live since 12 September**
   (`LIFECYCLE_EMAILS=live` in Production): the first run was triggered by
   hand that afternoon and sent the tip to 15 sellers, none failed; since then
   it runs by itself each morning. Ryan (ryan@registermysite.com) was put on a
   3-day hold the same day because he had been welcomed by hand that morning.
   Admin controls on the same secret: `GET ?list=1` shows who is due without
   sending, `POST {"skip":[...],"hold":[...],"holdDays":n}` opts test accounts
   out for good or holds someone. `CRON_SECRET` was created from the CLI and is
   readable with `vercel env pull --environment=production`; the Firebase Admin
   keys are marked sensitive and are not, which is why these controls exist.
1. **Listing.** Seller fills `/dashboard/new`. **Every file uploads the moment
   it is picked**, with its own progress bar, straight from the browser to
   Storage under their own uid. The listing id is reserved at mount so the
   uploads have somewhere to go, and it lives in the saved draft along with the
   resulting paths, so coming back tomorrow costs no re-upload. Submit is just
   the Firestore write. Preview renders the real listing page from form state
   before any of it is sent. `/api/notify/listing` emails the admin.
2. **Review.** Admin approves or rejects at `/admin/[id]`, writing the note in
   `NoteEditor`, and `/api/notify/review` emails the seller. A rejection sends
   the designed email (`design/emails/rejected.html`, subject "a quick note on
   {title}", from hello@) with the note as its body and an "Edit your listing"
   button to `/dashboard/new?edit={id}`. An approval sends
   `design/emails/approved.html` (subject "{title} is live!"): a button to the
   live listing, share links that open X, Bluesky, Threads or LinkedIn with
   "hey! now you can find me on thesolomarket.com" and the listing link already
   filled in (plain share URLs, no API or login; `shareLinks` and `SHARE_TEXT`
   in `lib/emailTemplates.ts`), the review note only if one was written, and a
   builders-wall photo nudge only if the seller has no photo. Nothing is sent
   for decisions made before 12 September. An admin edit does **not** reset status, so a live tool
   stays live.
2b. **Seller edits.** A seller can edit a live listing. Whether that costs them
   their place on the marketplace depends on what changed: presentation (title,
   description, price, screenshots, demo) saves in place and stays live, while
   anything in `REVIEW_CRITICAL_FIELDS` (package, **price**, runtime, setup
   mode, platform, version) goes back to the queue. The form says which before
   they press the button, and the admin is only emailed when something actually
   entered the queue. **firestore.rules is the control here, not the client.**

   Price is in that list deliberately (Sevval, 26 August): every listing is
   approved by hand, so a price that could move afterwards would mean the number
   reviewed was not the number charged. Separately, the $15 to $250 band is now
   enforced in the rules on every seller write, which it never was before, and
   is a lower backstop rather than a substitute for the review.
2c. **Takedown.** A seller takes a tool off sale from the dashboard. Status only:
   the rules refuse a visibility change that moves any other field.
3. **Buying.** `/api/stripe/checkout` reads `priceCents` from Firestore, never
   from the client, and blocks non-approved listings, self-purchase, and sellers
   without `charges_enabled`.
4. **Webhook.** `checkout.session.completed` is the only wired event. Verifies
   the signature against the raw body, idempotent by session id, records the
   purchase and sends three emails.
5. **Download.** `/api/download` binds `packagePath` to the seller's own uid
   folder and checks buyer, seller or admin. Buyers can download while the
   listing is approved or `unlisted` (a seller's own takedown), not once it is
   `rejected`.

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
- **`REVIEW_CRITICAL_FIELDS` exists twice**, in `lib/types.ts` and again inside
  `reviewedPartsIntact()` in `firestore.rules`, because rules cannot import
  TypeScript. `scripts/check-review-fields.mjs` compares them and runs as
  `prebuild`, so a drift fails the build here and on Vercel rather than quietly
  letting the form promise a review the rules do not enforce.
- **Nothing ever deletes an unreferenced upload.** Replacing an avatar, a
  screenshot or a demo leaves the old file in the bucket forever, because the
  paths are deliberately timestamped so the `immutable` cache header stays
  honest. With 150MB demos and 500MB installers this adds up. Packages are
  exempt: they overwrite at a stable path.
- `/dashboard` and `/account` briefly render their signed-out state before
  Firebase answers, because `!user` means both "signed out" and "not heard back
  yet". `getAuthResolved()` in `lib/store.ts` tells the two apart; `/saved`,
  `/free/submit` and `/admin/free` use it, and those two have not been changed.
- The buyer download path for an `unlisted` listing has been reasoned through
  but never actually run: it needs a buyer account holding a purchase.
- **The /free write path has never been exercised.** The page, the cards and the
  markup are verified in served HTML on production. Submitting an entry and
  approving one are both gated on a signed-in account, so neither has been run
  end to end by anyone. The rules for it are deployed.
- **The security-scan claim now has a second problem.** A /free entry is a link
  to somebody else's server, so it cannot be scanned by anyone, ever. /free says
  plainly what it does and does not check, which is what keeps it honest, but it
  sits four clicks from copy promising that every submission is scanned. See the
  first item in this section: fixing that copy got more urgent, not less.
- **The welcome email's automatic path is barely exercised.** The design has
  reached real inboxes through `scripts/send-seller-email.ts` (test mode
  attaches images inline, `--live` sends exactly what the site sends; neither
  writes to Firestore), and Ryan, the one seller from before it existed, was
  sent it by hand with `--live` on 12 September. Promotion to seller on
  production then a delivered welcome is worth confirming once in Resend's
  log. Because the hand send wrote nothing, **the lifecycle cron dates Ryan
  from his account's `createdAt`**, so a live run would send him the
  no-listing tip straight away if he still has none; the dry run will show it.
- **Production sent no email at all until 12 September.** `EMAIL_FROM` had never
  been set in Vercel Production (only Preview), and `lib/email.ts` sends only
  when both it and `RESEND_API_KEY` exist, silently. So no new-listing notice,
  review decision or welcome ever left the live site. Added and redeployed that
  day. **`CONTACT_WEBHOOK_URL` is still missing from Production**, so the
  contact form on the live site answers "not configured" and nothing reaches
  the Google Sheet.
  `vercel env ls production` lists what is set; this folder is linked to the
  Vercel project (`.vercel/`, gitignored) as of 12 September.
- **`/privacy` was brought up to date on 12 September.** It now names the
  emails (account emails, and tips to sellers with an unsubscribe) and their
  basis, the seller photo and X handle, and corrects two things that had gone
  false: saved items live with the account since 26 August, not in the
  browser, and a listing's files upload before it is submitted. Still a draft
  awaiting a lawyer, like the rest of the legal pages.
- **"Fully unlocked" is now a listing rule** (no in-app payments, license keys,
  or an account needed to use it), stated in the `/docs/selling` table, the
  `/sell` lists and the welcome email. Nothing checks it but review.

---

## 8. Upcoming work

The full prioritised backlog lives in Claude's memory
(`thesolomarket-next-tasks`), not here. These are the items raised most recently.

### Queued, not started

**A stats strip for /sell** (visitors, sellers, listings, themed "the
marketplace is growing"). Scoped 26 August and **deliberately deferred by
Sevval as not a priority.** Two of the three numbers are free: the seller and
listing counts fall out of `getApprovedListings()`. Visitors do not exist and
are the reason this is parked. There is no analytics and no middleware in the
project, every page is cached so a counter in a server component would count
cache rebuilds rather than people, and `/privacy` states as fact in two places
that there is no analytics on this site. The clean build is a client beacon to
an `/api/hit` route incrementing one Firestore counter, which is cookieless and
filters bots for free because crawlers do not run JavaScript. **It needs a
one-sentence change to `/privacy` first, and that is Sevval's call.**

Note the small-numbers problem is sharper here than for the sphere: a sphere is
ambiguous, but "2 sellers" under "the marketplace is growing" argues against
joining. A "founding sellers" framing works honestly at any size.

### Emails: where they stand (12 September 2026)

**Done for the seller-only phase, by Sevval's call. Revisit before the external
(buyer) launch.** Every designed email lives in `design/emails/*.html`, is
previewed with `emailpreview`, compiled by `build-template.mjs`, and can be sent
to anyone by hand with `scripts/send-seller-email.ts`.

| # | Email | To | Trigger | State |
|---|---|---|---|---|
| 1 | Welcome (with "confirm your email" while unverified) | new seller | becoming a seller | designed, live |
| 2 | Confirm your email | buyer; anyone pressing resend | signup, verify banner | designed, live |
| 3 | No listing yet tip | seller 3 days in, nothing submitted | daily cron | designed, live |
| 4 | Rejected, with the review note | seller | admin rejects | designed, live |
| 5 | Approved, with share links and photo nudge | seller | admin approves | designed, live |
| 6 | New listing to review | admin | seller submits | plain, live |
| 7 | Receipt | buyer | purchase | plain, never sent (no buyers yet) |
| 8 | You made a sale | seller | purchase | plain, never sent |
| 9 | New sale | admin | purchase | plain, never sent |

Also the lifecycle run's own summary to the admin (plain), and Firebase's
password-reset email (undesigned, Firebase's).

**To do before the external launch:**
- Redesign 7, 8 and 9 in the same style; they are the first emails a buyer ever
  gets, and they still carry em dashes. 6 is admin-only and can stay plain.
- Password reset: the same trick as verification
  (`generatePasswordResetLink`) if it should look like the rest.
- The launch email to the waitlist, which `/privacy` limits to exactly one
  message.
- Payout setup incomplete, and first sale as its own email, once Stripe is live.
- Buyer lifecycle: day 3 "did it run?", update available, day 11 refund window.
- Seller lifecycle still unchosen: rejected and not resubmitted. The Monday
  digest to Sevval was chosen and not built.
- Firebase Auth authorized domains (§3), and DMARC from `p=none` to
  `p=quarantine`.

### Next up, ahead of everything else

**Seller emails and notifications.** Six emails exist: the five transactional
ones in `lib/emailTemplates.ts` (new listing to the admin, review decision to
the seller, receipt to the buyer, sale to the seller, sale to the admin) and,
since 12 September, **the seller welcome** (see §6, flow 0, and the Shipped
section below). The remaining gaps, roughly in order of value: payout setup
incomplete (Stripe Connect drop-off is silent today, and an approved listing
that cannot take money is invisible failure; it cannot fire before November,
when production gets Stripe keys); first sale, as its own email rather than the
same one as the fortieth; payout sent; a weekly or monthly digest of sales,
views and saves.

The plan these come from is "Send When Stuck" (23 August):
<https://claude.ai/code/artifact/5f0f19bc-b60f-4b72-8408-2e18a96c2b88>.
Each nudge fires only while a seller is stuck at a step and cancels itself when
they move, read from live Firestore state by one daily cron. Decided on 12
September: **a Monday digest to Sevval** is the next one wanted; lifecycle mail
comes from hello@; the engine runs **dry for a week** (logging what it would
send) before it sends anything. **Built 12 September: the engine (§6, flow 0b)
and its first email, the "no listing after 3 days" tip,** written as helpful
listing tips with a single button, at Sevval's request. Not yet chosen: the
"rejected, not resubmitted" nudge. `/privacy` covers it as of the same day, and it
went live that afternoon (§6, flow 0b). Not possible as scoped: "stuck in
draft", because drafts live in the seller's localStorage and the server never
sees one. Anything recurring needs a working unsubscribe first; the welcome
has none because it is one-time.
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

### Shipped 12 September 2026: the seller welcome email, and copy

- **The welcome email.** Designed with Sevval over a long iteration and her own
  words kept as written (lowercase included). Layout: a greeting with "hi
  there," and the brand name in the logo's gradient and her photo captioned
  "your fellow admin"; a box stating the three rules every listing must meet
  (self-hosted, no subscription, fully unlocked) with example kinds of tool;
  four steps, each with one of her illustrations and a button; a signature of
  the logo, hello@ and the tagline. How it sends is §6, flow 0; how it is built
  is §4 under `design/emails/`. **Rejected along the way, so do not bring them
  back:** a four-colour band from the logo tiles, the dark night-sky hero, page
  screenshots as step images, a logo in the header, and the photo in the
  signature.
- **Launch moved to November**, in the two user-facing places listed in §1.
- **"Fully unlocked"** added as a listing rule: a row in the `/docs/selling`
  table and a line on each side of the `/sell` can and can't lists.
- **"a free AI assistant" became "an AI assistant"** on every page that said it
  (about, docs, how-to-run, llms.txt, listing detail), at Sevval's request.
  Do not reintroduce "free" there.
- **Homepage split.** Two buttons under the hero, "I'm a buyer" (jumps to the
  catalogue) and "I'm a seller" (to /sell).
- DNS: SPF for Resend and Google, and DMARC, added. See §3.

### Shipped 27 August to 6 September 2026

- Signup asks buy or sell and takes an optional photo; the signup page went two
  columns around that question. See `/login` in §4.
- Footer badges moved into their own marquee strip (`FooterBadges.tsx`), with
  the Nick Launches badge added.
- The admin console's two side screens (/admin/free, /admin/categories) moved
  below the review queue rather than being deleted, since nothing else links
  to them.
- The avatar size error rounds up, so it can no longer say "2.0MB, the limit
  is 2MB".
- The /sell hero names who it is for: solo developers with self-hosted
  products, buyers done paying monthly.

### Shipped 26 August 2026: the AI-readiness fixes

An outside scan (Ryan Lenk) read the site as raw served source and found one
real problem, which was not a markup gap: **the machine-readable layer said the
marketplace was open for business while the homepage said pre-launch.** "launch"
appeared zero times in `llms.txt`, in the FAQ markup and in the JSON-LD.

- **The status now lives once**, as `STATUS_NOTE` in `lib/brand.ts`, read by the
  JSON-LD `Organization` and `WebSite` nodes and by the /browse heading. Deleting
  that constant at launch makes the other three a compile error, which is the
  point. `llms.txt` opens with it, and its three purchase claims are written as
  how buying will work. /about answers "Can I buy a tool today?" in visible copy,
  which the `FAQPage` markup picks up because both render from one array.
- **`offers` came off the `SoftwareApplication` nodes.** An `Offer` with
  `availability: InStock` is a machine-readable claim the tool can be bought now,
  and it was the one place the markup promised what the site cannot do. `PreOrder`
  would be no better: a notify list is not an order. **Every pre-launch string to
  remove is now listed in `LAUNCH_CHECKLIST.md`,** because the machine-readable
  half is the half that looks fine on screen when it goes stale.
- Smaller, from the same scan: an `ItemList` on /browse generated from the query
  that renders the cards and referencing each tool by `@id`; real `datePublished`
  and `dateModified` on listing pages; the root URL and the seller pages added to
  `llms.txt`; seller sitemap entries carrying their most recent listing date
  instead of the static build date.
- **`/seller/[handle]` emitted no structured data at all**, which the scan could
  not have seen because the page shipped after it ran. It now emits `ProfilePage`
  and `Person` sharing an `@id` with the `author` already on every listing, so a
  tool and its maker resolve to one entity rather than two strangers with the
  same name. Same-host URLs are filtered out of `sameAs`: it asserts two URLs are
  the same thing, so a seller typing thesolomarket.com into their website field
  would otherwise publish that they and the marketplace are one and the same.

Verified in production's served HTML, not just locally.

Worth keeping in mind about the scan's own advice: FAQ rich results have been
restricted to government and health sites since 2023, and `ItemList` of
`SoftwareApplication` is not a Google rich result type. Neither is a reason not
to do the work, because both make the content quotable by answer engines, but
nobody should expect a search feature from either.

### Shipped 26 August 2026: /free, the directory

A curated list of free and open source tools that live on **other people's
sites**. We describe them, show a preview and link out. Nothing is hosted,
delivered or sold. See §5 for the collection and §4 for the routes.

- **One page, no per-item routes.** A page whose whole substance is a paragraph
  and an outbound link is what search engines punish directories for. Per-item
  pages become worth adding when the descriptions can carry one.
- **Submissions reuse the existing URL import.** `/api/import` needs only a
  signed-in user, so pasting a link fills the name, blurb, category and preview
  with no new route. The description arrives **to be rewritten**: publishing a
  fetched meta description verbatim is duplicate content pointing at a stronger
  original.
- **The preview image is stored, not hotlinked, and only on submit.** Hotlinked,
  the image approved at review can become a different image later. Uploading at
  paste time would orphan a file every time somebody wandered off, since nothing
  here deletes unreferenced uploads. New path `public/free/{uid}/`.
- Search wiring: `ItemList` of `SoftwareApplication` with `downloadUrl` rather
  than an `Offer` we cannot honour (the `price: 0` offer inside each **is**
  genuine, these really are available now), a Free tools section in `llms.txt`,
  a sitemap entry, nav and footer links, and /browse and /free now link to each
  other.

**This collides with a decision recorded below** ("Rejected, deliberately: or
provide a download link"). Two of that rejection's three reasons die for a free
link-out (nothing was sold, so "own forever" does not apply, and there is no
library entry to version). The third survives untouched: a link is reviewed once
and mutable forever. Sevval accepted that knowingly, on the basis that /free is
a visibly separate section with its own page, form and standard.

### Shipped 26 August 2026: header and blog

- Nav reordered to About, Browse, Free / Open Source tools, Blogs, seller button
  last. **The desktop nav moved from `md` to `lg`:** five items including a label
  that long do not fit at 768px, where it wrapped to two lines and the button ran
  under the saved icon. Tablets get the hamburger, which holds every link anyway.
- "Insights" is now "Blogs" everywhere it is a navigation label. The `/blog`
  metadata title keeps its descriptive half, because "Blogs" alone is not a
  phrase anybody searches.
- Three articles added: getting found by AI (using this site's own status/markup
  mismatch as the worked example), outbid.lol and what it says about
  distribution, and how to judge a free tool.
- **`Block` gained an inline link form.** Article bodies previously had no way to
  express a link, so every article was a dead end and no ranking authority moved
  through them. `Rich = string | Inline[]` keeps a bare string valid, so no older
  article needed editing, and the links added to the existing ones wrap words
  already on the page rather than rewriting any copy. Headings and pull quotes
  stay plain deliberately. Only `/` and `https://` hrefs become anchors, so a
  `javascript:` href never reaches the DOM once these move to a CMS.

### Shipped 26 August 2026: the /sell rebuild

Recruiting-page work, on `staging` and `main`. No rules change, so nothing to
deploy to Firebase.

- **Seller sphere on the /sell hero.** A slowly turning sphere of the makers
  already here, adapted from a component Sevval found. Positions are a
  deterministic Fibonacci lattice rather than the upstream `Math.random()`, so
  it renders in the server HTML instead of a grey loading box; rotation writes
  transforms straight to the DOM rather than calling setState sixty times a
  second; and the upstream O(n^2) collision pass is gone in favour of depth.
  Pauses off-screen and under `prefers-reduced-motion`.
- **Three-tier fill, which is the whole design.** Photo, then the seller's
  initial, then a muted brand mark for the empty spots. Tier two means the
  sphere reads as people from the first seller onwards, and each photo added
  upgrades a node with no deploy. **Sevval accepted the small-numbers optics
  knowingly**: with one seller it is mostly placeholders, and the plan is to
  ask sellers for photos rather than to hide the sphere until it fills.
- **X handles.** `xHandle` on `AppUser`, asked for in `/account`, shown on
  `/seller/{handle}`, and a "Use my X photo" button that pulls the profile
  photo into the existing avatar picker. It is a prefill, not a sign-in:
  **Sign in with X was scoped and declined** because X does not return an email
  address without elevated permission, and every template in
  `emailTemplates.ts` plus Stripe onboarding assumes one exists.
- **Hero copy.** "Someone out there needs the thing you already built", the
  chip is now "No listing fees", and the CTAs are "Start selling" plus "How it
  works" pointing at `/docs`, which `/sell` linked to nowhere before. The
  20 minute claim is now 10 in both places.
- **`/sell` became a server component**, and `app/sell/layout.tsx` was deleted:
  it existed only to hold metadata a client component could not export.
- **Mobile nav** shows "Sell your tool" where "Sign in" was, with Sign in moved
  into the hamburger panel so it stays reachable.

Three bugs fixed on the way, two of them pre-existing. The sphere drew its first
frame from the server's width guess before the ResizeObserver had reported the
real one, and below the fold the IntersectionObserver stopped the loop before it
could correct itself, so nodes sat 120px outside their box over the buttons
above. `buttonClass` in `components/ui/index.tsx` concatenated class strings
instead of merging them, so a `hidden` passed to a button lost to the
`inline-flex` already in `buttonBase`: both nav buttons rendered and squeezed the
logo to 3px. **Now fixed**: it merges with `cn()`, which was audited across all
37 call sites (every one passes only `mt-*` or `w-full`, neither of which
collides with anything in the base, variants or sizes, so nothing else moved).
And the header overlapped itself at 360px, the most common Android width.

### Shipped 26 August 2026: seller experience

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
- **More blog articles.** Nine exist in `lib/articles.ts`, AI-written, and the
  standing task is to rewrite them in Sevval's own voice. The three added on
  26 August are grounded in checkable specifics (real figures, a named person,
  this site's own markup mistake) rather than general advice, which narrows the
  gap but does not close it: they are still not her voice.

### Scoped, awaiting decisions

Premium listings, watermark disclosure, and upvotes. Scoping document with four
open questions:
<https://claude.ai/code/artifact/88aea4e5-6ab0-4491-b9a0-15bc5505b607>

Headlines: premium should be an assurance tier rather than a paid one, since
there are no listing fees and a higher price already pays more commission.
Watermark disclosure closes a real refund-liability gap. Per-buyer
fingerprinting would reverse the piracy position already written in
`BUSINESS_MODEL.md` §7.

### Scoped 5 and 6 September 2026, nothing built

Four scoping passes, none of them started, none of them agreed. Recorded here
so the reasoning is not lost, not because any of them is next.

**Seller funnel: fourteen gates.** The one with evidence behind it, and the
most useful of the four.
<https://claude.ai/code/artifact/2e393a5b-7172-4370-b580-8807c84e746b>

The `missing` array in `app/dashboard/new/page.tsx` is the literal list of what
blocks submit. Fourteen entries. Twelve cost about forty minutes together and
two cost three and a half hours: the app package and the demo video. Everything
shipped for sellers so far (upload on pick, preview, edit and relist, URL
import) improved the twelve cheap ones. Findings worth keeping:

- **The demo video is required and screenshots are optional**, which inverts the
  effort. `lib/media.ts` also rejects QuickTime, correctly, but that is what the
  macOS screen recorder produces, so the default Mac path is record, get
  rejected, learn to re-export. And no 40 second film exists for a CLI tool or a
  library, so those makers never start. Accepting three screenshots in place of
  a demo is one entry in `missing` and half a day.
- **The package contract is checked by a human, days later.** Reading the zip
  client side at pick time would name the missing file in one second, needs no
  server, and works at 200MB because only the central directory is read. Note
  this is structure, not safety, and must never be described as the security
  scan in §7.
- **A package scaffolder** is the biggest single lever on listing count: six
  questions, out comes a valid package.
- **Widening splits in two.** Plugins and extensions (Raycast, Obsidian, Figma,
  VS Code), self-hosted deployables, and Windows and Linux installers are
  excluded by the *contract*, not by the position: they are owned, they run on
  the buyer's machine, they fit "own forever". Templates, courses and SaaS are
  excluded by the *position*. Plugins are the biggest population and would need
  a host app field and a `plugin` `SetupMode`. Templates would need their own
  type, for the same reason `freeTools` is not a `Listing` (§5).

**Per-buyer licence keys.**
<https://claude.ai/code/artifact/0705ca0b-9aea-4dcd-a6df-7737dfebe681>
A certificate (proof of ownership, gates nothing) and an enforcement key (DRM)
are different products that look identical. The second reverses §7. Two things
worth keeping regardless: `/refunds` says a refund ends the licence and the
tool leaves the library, and **nothing implements either**, since
`/api/download` only checks that a purchase row exists. And a per-buyer
watermark is impossible for installers, because changing bytes in a notarized
`.dmg` invalidates the signature `scripts/verify-package.ts` exists to check.

**A seller badge programme.**
<https://claude.ai/code/artifact/21fd49fc-77fa-4f96-a99e-838f7a252d11>
A launch board badge commemorates a day; a marketplace badge can carry a live
price and a working checkout. `components/FooterBadges.tsx` is the receiving
end of this and the emitting end does not exist. The claim has to be **"human
reviewed", never "verified" or "scanned"**: a badge sits on domains we do not
control, and would be a fourth surface asserting the scan in §7.

**Access passes for hosted tools.**
<https://claude.ai/code/artifact/36cbe7aa-b181-4630-8c12-c8bbe4c58d7d>
Blocked on one sentence: hosted software cannot be owned forever, so admitting
it means either a stated term ("access passes run for the term shown") or a
promise nobody can keep. Also holds the honest economics: on a $29 tool a
seller keeps $28.17 through their own checkout, $24.65 through us, and $19.72
with a 20% marketplace discount. That is a good trade on a buyer they would
never have reached and a bad one on a buyer they already had.

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
