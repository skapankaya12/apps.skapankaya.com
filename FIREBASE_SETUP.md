# Going live with Firebase

**Status:** the data layer is already migrated — `lib/store.ts` reads and writes
Firestore live (via `onSnapshot`), auth is real email/password with email
verification + password reset plus Google sign-in, and `lib/firebase.ts` is initialised from
`NEXT_PUBLIC_*` env vars. What's left is project setup, deploying the rules,
Storage-backed file delivery, and Stripe. Do it in this order.

---

## 1. Create the Firebase project
1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Enable **Authentication** → **Sign-in method** → turn on **Email/Password**
   and **Google**. The app offers both; Google accounts arrive already verified,
   so they skip the verification banner and have no password to manage.
   - **Templates → Email address verification**: set the sender name / wording.
     The app calls `sendEmailVerification` on signup and shows a "verify your
     email" banner until the user confirms (see `components/VerifyEmailBanner.tsx`).
   - **Templates → Password reset**: the "Forgot password?" flow uses this.
   - **Settings → Authorized domains**: add your production domain at deploy time
     (`localhost` is already allowed for dev). Google sign-in opens a popup on
     this domain, so it fails with `auth/unauthorized-domain` until the live
     domain is listed.
3. Enable **Firestore Database** (production mode, region close to your buyers).
4. Enable **Storage** (this holds the app packages buyers download).
5. Project settings → **Your apps** → Web app → copy the config into `.env.local`
   (use `.env.example` as the template). `firebase` is already installed; add
   `firebase-admin` and `stripe` when you build the webhook:

```bash
npm install firebase-admin stripe
```

---

## 2. Firestore data model
Three collections mirror `lib/types.ts` exactly:

| Collection | Doc id | Written by |
|---|---|---|
| `users` | `uid` | Auth trigger on signup |
| `listings` | auto | Sellers (create), admins (status changes) |
| `purchases` | auto | **Stripe webhook only**, never the client |

## 3. Security rules — now version-controlled
The rules live in the repo as **`firestore.rules`** and **`storage.rules`**, wired
up by **`firebase.json`**. They already close the important hole (a user could
previously self-assign `role: "admin"` — now `users` updates only allow
`buyer`/`seller`, and admins are set out-of-band). Deploy them:

```bash
npm i -g firebase-tools   # once
firebase login
firebase deploy --only firestore:rules,storage
```

Or paste the contents of `firestore.rules` into Firestore → Rules and
`storage.rules` into Storage → Rules in the console.

Set the first admin (you) manually: open your `users/{uid}` doc in the console
and set `role: "admin"`.

## 4. The store (`lib/store.ts`) — done ✅
Already migrated to Firestore. Reads use `onSnapshot` and push through the
existing `emit()` mechanism; writes (`createListing`, `reviewListing`, `setRole`)
call Firestore directly. `recordPurchase` remains client-side **only for the demo**
and must be replaced by the Stripe webhook (below) before taking money — the
`purchases` collection is not client-writable under the rules.

## 5. Storage (downloads & uploads)
- Sellers upload their `.zip` to `storage: submissions/{listingId}.zip`.
- On approval, an admin action (or a Cloud Function) copies it to
  `apps/{listingId}/{version}.zip`.
- Buyer downloads use **short-lived signed URLs** generated server-side
  (`getDownloadURL` gated behind a route that checks the purchase). Never expose
  a permanent public URL.

## 6. Stripe Connect (payments + your 15%)
1. Stripe Dashboard → enable **Connect**, use **Express** accounts.
2. Seller onboarding: `stripe.accountLinks.create(...)` → store `stripeAccountId` on the user.
3. Checkout (replace the stub in `app/checkout/[slug]/page.tsx` with a call to a
   route handler): create a **Checkout Session** with a destination charge and
   `application_fee_amount = round(price * 0.15)`.
4. **Webhook** (`app/api/stripe/webhook/route.ts`): on
   `checkout.session.completed`, use the Admin SDK to write the `purchases` doc
   and increment `salesCount`. This is the real `recordPurchase`.
5. Enable **Stripe Tax** for automatic EU VAT (see the deemed-supplier note in
   `BUSINESS_MODEL.md`).

---

**Deploy:** push to GitHub → import on **Vercel** → add all env vars → deploy.
Point your domain at Vercel. Add the Stripe webhook URL in the Stripe dashboard.
