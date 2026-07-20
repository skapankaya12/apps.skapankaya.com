# apps.skapankaya.com — Business Model

**One-liner:** A curated marketplace for finished mini software apps. Buy once, download, run on your own machine — with AI-assisted setup so "run it locally" is a 5-minute promise, not a technical barrier.

**Why now:** AI coding tools mean thousands of makers are producing small, genuinely useful apps that are too small to market individually. They have no distribution channel. Buyers get one-time-purchase tools with no subscription and full local control. The marketplace is the missing middle.

---

## 1. Business model

| Element | Decision |
|---|---|
| Revenue model | **15% all-inclusive commission per sale** (no listing fees, no payout fees) |
| Seller pitch | "Keep 85% of every sale. Zero other fees." — cheaper than app stores (15–30%) and competitive with Gumroad (10% + processing) |
| Your net margin | ~10.5–11.5% of GMV after Stripe processing (~2% + €0.25/sale) |
| Pricing | Sellers set prices within a **$10–29 band** ($5 floor, higher allowed case-by-case) |
| Purchase type | One-time buy, personal license, free updates for the listed version line |
| Entity / payments | EU entity → **Stripe Connect (Express accounts)**: sellers onboard themselves, payouts automatic, your 15% collected as application fee at checkout |
| VAT | You are likely the **deemed supplier** for VAT on marketplace sales of digital goods in the EU. Use Stripe Tax + OSS registration. Budget VAT into displayed prices. ⚠️ Confirm with an accountant before launch. |

Why not 5%: on a $19 sale, 5% = $0.95 and payment processing = ~$0.70–0.85. You'd net pennies (negative under ~$12) and would need ~$20k/month GMV to earn $1,000/month. 15% all-in reaches the same revenue at ~$7k GMV.

**The overlooked profit engine:** you are also the marketplace's first seller. On your own apps you keep ~97% (everything but processing). For the first 6 months, expect **most profit to come from your own listings**, with commission revenue taking over as external sellers scale.

---

## 2. Delivery & logistics (the "how do buyers actually run it" answer)

This is the make-or-break UX. The answer is **standardization, not PDFs**.

### The App Package standard
Every listing is a zip with a required structure (enforced at upload):

```
my-app.zip
├── manifest.json      # name, version, runtime (node20/python3.12/binary/browser-ext), entry command
├── README.md          # what it does, screenshots
├── SETUP.md           # exact run steps — must work as (a) or (b) below
├── LICENSE.md         # standard personal-use license (platform-provided template)
└── src/               # the app
```

**The setup promise (every listing must satisfy at least one):**
- **(a) One command:** e.g. `npm install && npm start` or a double-clickable binary.
- **(b) AI-assisted:** "Open this folder in Claude Code (or Cursor) and say *'set this up and run it'*." SETUP.md is written for the AI to follow.

Option (b) is your differentiator — it makes non-technical buyers viable customers. The platform ships a one-page "How to run any app from this store" guide (install Claude Code once, then every purchase is the same 2 steps). Prefer **source + AI-run over compiled binaries**: unsigned binaries trigger macOS/Windows security warnings, which kills trust; source code doesn't.

### Purchase → delivery flow
1. Buyer hits Buy → Stripe Checkout (Connect destination charge, 15% application fee, Stripe Tax adds VAT).
2. Webhook grants entitlement in your DB.
3. Buyer lands in **My Library**: permanent re-downloadable access via short-lived signed URLs (Supabase Storage / Cloudflare R2 — files never publicly linkable).
4. Sellers upload new versions; buyers see an "update available" flag in their Library. This is the real meaning of the "maintenance" in your commission: the platform maintains delivery, versioning, and payments — sellers maintain their code.

### Support & refunds (must be defined before launch)
- **14-day "it runs or your money back"** guarantee, platform-enforced.
- Seller must respond to "won't run" reports within 48h; no fix → automatic refund (Stripe Connect claws back the seller's share).
- Platform supports the buying/downloading experience only — app functionality is the seller's job. This split goes in the seller agreement.

---

## 3. Trust & curation (the risk you can't skip)

You are selling code that strangers execute on their machines. **One malicious or broken listing ends the marketplace.** Hence the curated model:

**Review checklist per listing (timebox: 30 min):**
1. Fresh-machine test: does it run in ≤5 minutes following its own SETUP.md?
2. No obfuscated or minified-only code — human/AI-readable source required.
3. All external network calls and dependencies disclosed in the manifest.
4. Quick AI-assisted code scan (have Claude review the source for red flags — cheap and effective).
5. Listing quality: real screenshots, honest description.

Approved apps get a **"Verified — runs in 5 minutes"** badge. That badge *is* the brand.

**Capacity reality:** 200 reviews ≈ 100–150 hours of your time. This is the strongest argument for the curated-seed path: 30–50 excellent listings at launch, open submissions with a review queue from month 2, and automate parts of review (sandboxed run + AI scan) before scaling toward 200.

---

## 4. Supply plan: 4 → 200 listings

| Phase | Timeframe | Listings | How |
|---|---|---|---|
| Seed | Weeks 1–4 | 8–12 | Your 4 apps + 1–2 new ones/week (you're already building them) |
| Invited sellers | Weeks 3–8 | 30–50 | Personal outreach: indie hackers on X, r/SideProject, Product Hunt makers, Gumroad sellers of code products. Pitch: "you built it, it's too small to market — list it in 20 minutes, keep 85%." Target 100 invites → ~30 listings. |
| Open submissions | Month 2–3 | 80–120 | Self-serve upload + review queue. Every seller with a sale becomes a recruiter (add a "sell yours" link on every listing page). |

**Honest note on 200 in 3 months:** it requires ~15 approved external submissions/week — possible, but 200 listings is a *supply* metric and marketplaces die from missing *demand*, not thin supply. A stronger MVP definition:

> **50+ verified listings · 300+ total sales · 25+ sellers with at least one sale.**

Hit those and 200 listings follows naturally in months 4–6, because sellers go where sales happen.

---

## 5. Demand plan (the actual constraint)

Nothing in the original idea addressed buyers. Channels, in priority order:

1. **Your own apps as marketing.** Each solves a real problem → each gets a "show the problem, show the 5-minute fix" post (X, Reddit, TikTok/Shorts). The app is the ad; the store is the destination.
2. **SEO on problem queries.** Every listing page targets "tool to [specific problem]" long-tails. 50–200 listing pages = 50–200 lottery tickets on high-intent searches.
3. **Launches:** Product Hunt + Hacker News ("a marketplace for finished mini apps you run locally — AI handles setup") — the concept itself is launch-worthy, likely your single biggest traffic spike.
4. **Seller-driven traffic:** sellers promote their own listings; give them clean listing pages and (later) referral tracking that discounts their commission on self-sourced sales (e.g. 15% → 10%).

---

## 6. Profitability model

Assumptions: avg sale $19, net platform take ~11% of GMV after processing, your own apps net ~$18/sale, fixed costs below.

| | Month 1–2 | Month 3 | Month 6 | Month 12 |
|---|---|---|---|---|
| Listings | 10–30 | 80–120 | 150–250 | 300+ |
| Traffic /mo | 1,500 | 6,000 | 20,000 | 60,000 |
| Conversion | 1.5% | 1.8% | 2.0% | 2.2% |
| Sales /mo | ~22 | ~110 | ~400 | ~1,300 |
| GMV /mo | ~$420 | ~$2,100 | ~$7,600 | ~$25,000 |
| Commission net | ~$45 | ~$230 | ~$830 | ~$2,750 |
| Own-app profit | ~$180 | ~$450 | ~$700 | ~$1,500 |
| **Total /mo** | **~$225** | **~$680** | **~$1,530** | **~$4,250** |

**Fixed costs:** domain ~$1/mo · Vercel $0–20 · Supabase $0–25 · email (Resend) $0 · Stripe Tax ~0.5%/txn · accounting for OSS/VAT ~€50/mo → **~€100/month all-in. No staff, no inventory, no ad budget required.**

- **Break-even:** ~month 2 — roughly 6 own-app sales or ~45 marketplace sales per month.
- **Sensitivity:** revenue scales linearly with traffic × conversion; take rate is the multiplier. At 5% these same numbers would be roughly $75/mo at month 3 — this is why the take-rate correction mattered more than any other decision.
- Traffic figures assume the launches in §5 land reasonably; they are the model's biggest uncertainty.

---

## 7. Risks & accepted trade-offs

| Risk | Position |
|---|---|
| Piracy (zips get shared) | Accept it. $10–29 price + convenience + updates in Library beats hunting for a shared zip. DRM would destroy the UX. |
| Malicious code | Curation + AI scan + disclosure rules + refund guarantee (§3). Non-negotiable. |
| Platform leakage (buyers go direct to sellers) | Ignore at this scale; the Library/updates/refund experience is the retention moat. |
| Review bottleneck | Curated seed now; automate sandbox-run + AI scan before opening the floodgates. |
| VAT deemed-supplier complexity | One accountant conversation before launch. Stripe Tax does the mechanics. |
| "AI-assisted setup" fails for non-technical buyers | Test the flow with 3 non-developer friends before launch; the promise must be real. |

---

## 8. 3-month roadmap

**Weeks 1–2 — Build:** Next.js + Supabase + Stripe Connect storefront: listing pages, checkout, webhook entitlements, My Library with signed downloads, minimal admin. Package your 4 apps in the App Package format. *(Buildable with Claude Code in this timeframe.)*

**Weeks 3–4 — Soft launch:** Live with 8–12 own listings. First 10 sales via your network + first problem/solution posts. Begin seller outreach (target: 10 committed).

**Month 2 — Open supply:** Seller self-serve upload + Stripe Express onboarding + review queue. 30–50 listings. Product Hunt / HN launch. SEO foundations on every listing page.

**Month 3 — Scale:** 80–120 listings, 25+ active sellers, 300+ cumulative sales. Automate review steps. Decide on the push to 200 based on demand data, not the vanity number.

---

## Open items (your to-do, not buildable)
1. Accountant: confirm deemed-supplier VAT treatment + OSS registration for the EU entity.
2. Seller agreement + buyer license template (start from a Gumroad-style template, adapt).
3. Decide whether apps.skapankaya.com is the launch brand or a working title — a brandable name is easier to market at PH/HN launch, and migrating later costs SEO.
