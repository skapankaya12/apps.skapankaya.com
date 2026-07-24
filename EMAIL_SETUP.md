# Email setup

You need transactional email (receipts, download links, review notifications).
Firebase itself doesn't send custom email, so pair it with a dedicated provider.

## Recommended: Resend
Cleanest developer experience, generous free tier (3,000 emails/mo), and it
plays well with Next.js route handlers.

### Steps
1. Sign up at [resend.com](https://resend.com).
2. **Verify your domain** (`apps-marketplace.com` or your final domain): add the DKIM +
   SPF DNS records Resend gives you. This is what keeps you out of spam, so do it
   before sending anything real.
3. Create an API key → put it in `.env.local` as `RESEND_API_KEY`.
4. Install and send from a server route (never the client):

```bash
npm install resend
```

```ts
// app/api/email/route.ts (or call this helper from your Stripe webhook)
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: process.env.EMAIL_FROM!,          // "Apps Marketplace <hello@apps-marketplace.com>"
  to: buyerEmail,
  subject: "Your Apps Marketplace purchase is ready",
  html: `<p>Thanks! Download <b>${appName}</b> and setup steps in your library.</p>`,
});
```

## The emails you actually need (in priority order)
1. **Purchase receipt and download link**, sent from the Stripe webhook after
   `checkout.session.completed`. Most important; it's the delivery moment.
2. **Submission received**, to sellers when they submit for review.
3. **Approved or rejected**, to sellers when an admin decides (include the note).
4. **New submission in queue**, to you (admin), so you don't have to poll.
5. **Update available**, to buyers when a seller ships a new version (later).

## Two things to get right
- **Login email links** are separate: those are sent by **Firebase Auth** itself
  (Email link sign-in), not Resend. You configure the sender + template in the
  Firebase console → Authentication → Templates.
- **From-domain alignment:** the `EMAIL_FROM` domain must match the domain you
  verified in Resend, or deliverability tanks.

## Alternatives
- **Postmark**: best-in-class deliverability for pure transactional, slightly
  pricier. Good if receipts ever land in spam.
- **Firebase "Trigger Email" extension**: sends via your own SMTP by writing to
  a Firestore collection. Zero code, but you still need an SMTP provider behind
  it, so Resend/Postmark is usually simpler.
