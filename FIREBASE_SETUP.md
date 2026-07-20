# Going live with Firebase

The app runs today on an in-browser store (`lib/store.ts`) seeded with demo data,
so every flow is clickable with zero backend. This guide swaps that for real
Firebase (Auth + Firestore + Storage) and Stripe. Do it in this order.

---

## 1. Create the Firebase project
1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Enable **Authentication** → Sign-in methods: **Email link (passwordless)** and **Google**.
3. Enable **Firestore Database** (production mode, region close to your buyers).
4. Enable **Storage** (this holds the app packages buyers download).
5. Project settings → **Your apps** → Web app → copy the config into `.env.local`
   (use `.env.example` as the template).

```bash
npm install firebase firebase-admin stripe
```

Then uncomment the init block at the bottom of `lib/firebase.ts`.

---

## 2. Firestore data model
Three collections mirror `lib/types.ts` exactly:

| Collection | Doc id | Written by |
|---|---|---|
| `users` | `uid` | Auth trigger on signup |
| `listings` | auto | Sellers (create), admins (status changes) |
| `purchases` | auto | **Stripe webhook only** — never the client |

## 3. Security rules (paste into Firestore → Rules)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAdmin() {
      return request.auth != null &&
        get(/databases/$(db)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /listings/{id} {
      // Buyers see only approved apps; sellers see their own; admins see all.
      allow read: if resource.data.status == 'approved'
                  || (request.auth != null && resource.data.sellerId == request.auth.uid)
                  || isAdmin();
      allow create: if request.auth != null
                    && request.resource.data.sellerId == request.auth.uid
                    && request.resource.data.status == 'pending';
      // Only admins change status; sellers can edit their own draft/pending fields.
      allow update: if isAdmin()
                    || (request.auth.uid == resource.data.sellerId
                        && resource.data.status in ['pending','rejected']);
    }
    match /purchases/{id} {
      allow read: if request.auth.uid == resource.data.buyerId || isAdmin();
      allow write: if false; // webhook uses the Admin SDK, which bypasses rules
    }
    match /users/{uid} {
      allow read: if request.auth.uid == uid || isAdmin();
      allow write: if request.auth.uid == uid; // role changes: admin via console/Admin SDK
    }
  }
}
```

Set the first admin (you) manually: create your `users/{uid}` doc and set
`role: "admin"` in the console.

## 4. Swap the store (`lib/store.ts`)
Each function has a direct Firestore equivalent. Replace the localStorage bodies:

| Store function | Firestore call |
|---|---|
| `getApprovedListings()` | `query(collection(db,'listings'), where('status','==','approved'))` |
| `getListingBySlug(slug)` | `query(... where('slug','==',slug))` → first doc |
| `createListing(input)` | `addDoc(collection(db,'listings'), {...input, status:'pending'})` |
| `reviewListing(id, decision, note)` | `updateDoc(doc(db,'listings',id), {status, reviewNote})` |
| `getPurchases(uid)` | `query(collection(db,'purchases'), where('buyerId','==',uid))` |
| `recordPurchase(...)` | **delete** — this happens server-side in the webhook |

For live updates, wrap reads in `onSnapshot` and push results into the existing
`emit()` mechanism — the `useStoreValue` hook needs no changes.

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
