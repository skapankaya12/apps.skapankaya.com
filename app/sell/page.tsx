import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { getApprovedListings } from "@/lib/listings.server";
import { getPublicSellersFor } from "@/lib/profiles.server";
import { SellerSphere } from "@/components/SellerSphere";
import { StartSellingButton } from "@/components/StartSellingButton";
import { Section, ButtonLink, Badge } from "@/components/ui";

const KEEP_PCT = Math.round((1 - brand.commissionRate) * 100);

/**
 * One of the two pages we actually want to rank for: "where can I sell the
 * small tool I built". It used to be a client component in its entirety, which
 * meant this metadata had to live in a layout beside it; now only the CTA runs
 * in the browser, so it belongs here with the page it describes.
 */
export const metadata: Metadata = {
  title: "Sell the tool you built",
  description: `Sell small software you already built to people who need it. List it once, keep ${KEEP_PCT}% of every sale, no subscription and no store fees. For solo builders, indie makers and anyone who fixed their own problem with code.`,
  alternates: { canonical: "/sell" },
};

/** Matches the homepage, so a new seller joins the sphere within minutes. */
export const revalidate = 300;

// The marketplace is software-only: self-contained tools a buyer downloads and
// runs on their own machine. This spells out the boundary for makers.
const CAN_SELL = [
  "Scripts & CLI tools- Node.js, Python, shell, and the like",
  "Desktop or browser-based apps a buyer runs locally",
  "Automations, agents, converters, generators, scrapers, dashboards, utilities",
  "Your own original code (or code you're licensed to resell)",
  "Self-contained tools that disclose their network calls, shipped as readable source or as a signed installer",
];
const CANT_SELL = [
  "SaaS, subscriptions, or anything that runs on your servers",
  "Non-software goods like ebooks, courses, templates, presets, graphics, music",
  "Physical products or freelance services",
  "Code that isn't yours, or that breaks someone's license",
  "Malware, data harvesters, or anything that hides what it actually does",
  "Anything illegal, or that phishes buyers for credentials or keys",
];

export default async function SellPage() {
  // The sphere is drawn from whoever actually has something on sale, so the
  // listings are read here and handed on rather than queried twice.
  const listings = await getApprovedListings();
  const sellers = await getPublicSellersFor(listings);

  return (
    <>
      <div className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <Section className="relative py-14 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
            <div className="text-center lg:text-left">
              <Badge tone="accent" className="mb-5">
                No listing fees
              </Badge>
              {/* No text-balance here. The balancer equalises line lengths, which on
                  this sentence put the break inside "Someone out there": it read
                  "Someone out / there needs what / you already built." Natural
                  wrapping keeps the opening phrase whole. Same failure the
                  homepage headline hit, noted in its own comment there. */}
              <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:mx-0">
                Someone out there needs what you already built.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[var(--muted)] lg:mx-0">
                Too small to market on its own? Perfect. That is exactly what
                this marketplace is for. List it once, keep{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {KEEP_PCT}%
                </span>{" "}
                of every sale, and let buyers run it on their own machine in
                minutes.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <StartSellingButton />
                <ButtonLink href="/docs" variant="secondary" size="lg">
                  How it works
                </ButtonLink>
              </div>
            </div>
            {/* The makers already here. Interactive, but nothing depends on it:
                it carries no information the copy beside it needs.
                "Builders" rather than "sellers": seller is the internal role
                word (see Role in lib/types.ts), and every public-facing line on
                this site says builder or maker. */}
            <div>
              <SellerSphere sellers={sellers} className="mx-auto" />
              <p className="mt-2 text-center text-sm text-[var(--muted)]">
                Meet the builders
              </p>
            </div>
          </div>
        </Section>
      </div>

      {/* Economics */}
      <Section className="py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              big: `${KEEP_PCT}%`,
              label: "You keep",
              body: `All-inclusive ${Math.round(brand.commissionRate * 100)}% fee. No listing fees, no separate payment fees, no monthly cost.`,
            },
            {
              big: "~10 min",
              label: "To list",
              body: "Upload your app package, write a description, set a price. We review and publish.",
            },
            {
              big: "Auto",
              label: "Payouts",
              body: "Connect your Stripe account once. Your share lands automatically after each sale.",
            },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="text-4xl font-semibold tracking-tight text-[var(--accent)]">
                {c.big}
              </div>
              <div className="mt-1 text-sm font-medium">{c.label}</div>
              <p className="mt-2 text-sm text-[var(--muted)]">{c.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* What you can (and can't) sell */}
      <Section className="py-8">
        <h2 className="text-2xl font-semibold tracking-tight">What you can sell</h2>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          {brand.name} is for small{" "}
          <span className="font-medium text-[var(--foreground)]">
            software tools
          </span>{" "}
          people download and run on their own computer. If it&apos;s a self-contained
          tool a buyer can own forever, it fits. If it needs your servers or
          isn&apos;t software, it doesn&apos;t.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success-soft)] p-6">
            <h3 className="font-semibold text-[var(--success)]">✓ Yes, list these</h3>
            <ul className="mt-4 space-y-3">
              {CAN_SELL.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-[var(--foreground)]/85">
                  <span className="mt-0.5 shrink-0 text-[var(--success)]">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] p-6">
            <h3 className="font-semibold text-[var(--danger)]">✕ Not a fit</h3>
            <ul className="mt-4 space-y-3">
              {CANT_SELL.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm text-[var(--foreground)]/85">
                  <span className="mt-0.5 shrink-0 text-[var(--danger)]">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Requirements */}
      <Section className="py-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-8 sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            What makes a good listing
          </h2>
          <p className="mt-2 text-[var(--muted)]">
            Every app is reviewed against the same checklist before it goes live.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {[
              ["Runs in 5 minutes", "A buyer can go from download to running with one command, with AI assistance, or by opening an installer. Whichever it is, it works first try."],
              ["Readable source, or a signed app", "Source packages arrive unobfuscated, so buyers and their AI can read what they run. A native app ships signed and notarized instead, and we verify that signature before it goes live."],
              ["Honest disclosure", "Every network call and dependency declared, in your manifest.json or on your listing."],
              ["Real screenshots", "Show the app actually working. No mockups or stock images."],
            ].map(([t, b]) => (
              <div key={t} className="flex gap-3">
                <span className="mt-0.5 text-[var(--success)]">✓</span>
                <div>
                  <h3 className="font-medium">{t}</h3>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="py-12 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Ready to list?</h2>
        <p className="mt-2 text-[var(--muted)]">
          It takes about 10 minutes and there&apos;s no cost to list.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <StartSellingButton />
          <ButtonLink href="/docs" variant="secondary" size="lg">
            Read the docs
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
