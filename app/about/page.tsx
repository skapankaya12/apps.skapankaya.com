import type { Metadata } from "next";
import Link from "next/link";
import { brand, copy } from "@/lib/brand";
import { Section, Badge, ButtonLink } from "@/components/ui";
import { ContactForm } from "@/components/ContactForm";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "About the marketplace",
  description:
    "Why this marketplace exists, how buying and running a tool works, what it costs to sell, answers to common questions, and how to request a tool we can build for you.",
  alternates: { canonical: "/about" },
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What exactly am I buying?",
    a: "A finished, small piece of software that does one specific job. You pay once, download it, and it's yours forever, with no subscription, no account and no expiry. It runs on your own computer rather than in the cloud.",
  },
  {
    q: "Do I need to be technical?",
    a: "No. Every tool ships with a setup guide, and tools marked “Guided setup” are designed so a free AI assistant (like Claude or Cursor) can install and start them for you. You open the folder and say “set this up and run it.”",
  },
  {
    q: "What if it doesn't run on my computer?",
    a: "You get a full refund within 14 days, no questions asked. Because these tools run on your machine rather than ours, we can't guarantee compatibility with every setup, so the guarantee covers you.",
  },
  {
    q: "Is it safe to run software from strangers?",
    a: "Every submission goes through an automated security scan of its source code — flagging network calls, obfuscation, and data-exfiltration patterns — and then a human reviews the results and the code by hand before it's listed. Makers must also declare all dependencies and network calls. That said, we can't guarantee safety or compatibility on your specific device, and you run downloaded software at your own risk.",
  },
  {
    q: "Why is the software so cheap compared to a SaaS platform?",
    a: "Because you're buying one tool that does one job, not a platform with thirty features you'll never open. There's no server for us to run and no recurring cost, so it's a one-time price.",
  },
  {
    q: "What does it cost to sell here?",
    a: `Nothing to list. We take a flat ${Math.round(
      brand.commissionRate * 100
    )}% commission on each sale, and that's all-inclusive. It covers payment processing, so there are no separate card fees, listing fees or monthly costs. You keep ${Math.round(
      (1 - brand.commissionRate) * 100
    )}%.`,
  },
  {
    q: "When do sellers get paid?",
    a: "Payouts run automatically through Stripe after each sale, once you've connected your account. We hold funds across the buyer's 14-day guarantee window before releasing them.",
  },
  {
    q: "How long does a listing review take?",
    a: "Usually 1 to 2 business days. We check that the tool runs within about five minutes on a clean machine, that the source is readable, that the listing is honest, and that the demo video matches what the tool actually does.",
  },
  {
    q: "I can't find the tool I need. Can you make it?",
    a: "Often, yes. Describe the problem using the form below and we'll tell you whether we can build it. Many small tools can be turned around within a week.",
  },
];

const DIFFERENTIATORS = [
  {
    Icon: LightbulbIcon,
    title: "Built from a real need",
    body: "Not a startup pitch, just a fix someone made because they had the problem too.",
  },
  {
    Icon: WalletIcon,
    title: "Skip the bloated platform",
    body: "Pay once for the one feature you need, not monthly for 30 you don't.",
  },
  {
    Icon: ShieldIcon,
    title: "Runs on your computer",
    body: "Your data stays with you. No cloud, no account, no telemetry.",
  },
];

export default function AboutPage() {
  const keepPct = Math.round((1 - brand.commissionRate) * 100);

  /*
   * The FAQ answers are already the clearest plain-language explanation of how
   * the marketplace works, which makes them the copy most likely to be lifted
   * into an AI answer or a Google rich result. FAQPage markup just tells both
   * systems where the question/answer pairs are. No new copy — same array the
   * page renders.
   */
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <JsonLd data={faqLd} />

      {/* Intro / why this exists */}
      <div className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <Section className="relative py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="accent" className="mb-4">{copy.missionTitle}</Badge>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Someone already built the tool that fixes your thing.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-relaxed text-[var(--muted)]">
              {copy.missionBody}
            </p>
          </div>
        </Section>
      </div>

      {/* What makes it different */}
      <Section className="py-14">
        <div className="grid gap-5 md:grid-cols-3">
          {DIFFERENTIATORS.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-muted)] text-[var(--accent)]">
                <Icon />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section className="pb-14">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-8 sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {[
              { n: "1", title: "Find & buy", body: "Search by the problem you have. One-time payment, instant access." },
              { n: "2", title: "Run it, no expertise needed", body: "Double-click, or let an AI assistant set it up for you from the included guide." },
              { n: "3", title: "Keep it forever", body: "Re-download anytime. It's yours for good, with no subscription and no expiry." },
            ].map((s) => (
              <div key={s.n} className="flex gap-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)]">
                  {s.n}
                </span>
                <div>
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/how-to-run"
            className="mt-8 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            See exactly how you&apos;ll run any tool →
          </Link>
        </div>
      </Section>

      {/* For makers */}
      <Section className="pb-14">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--foreground)] px-8 py-12 text-center text-[var(--background)]">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Built a little tool that solves your own problem?
          </h2>
          <p className="mx-auto mt-3 max-w-lg opacity-80">
            Someone else has that problem too. List it, keep {keepPct}% of every
            sale, and let it help people. No listing fees, no subscription.
          </p>
          <div className="mt-7">
            <ButtonLink href="/sell" variant="secondary" size="lg">
              Start selling
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section className="pb-14">
        <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          {FAQS.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-medium hover:bg-[var(--surface-muted)]">
                {f.q}
                <span className="shrink-0 text-[var(--muted)] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--muted)]">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      {/* Contact */}
      <Section className="pb-20">
        <div id="contact" className="scroll-mt-24">
          <div className="mb-6 max-w-2xl">
            <Badge tone="accent" className="mb-3">Get in touch</Badge>
            <h2 className="text-2xl font-semibold tracking-tight">
              Can&apos;t find what you&apos;re looking for?
            </h2>
            <p className="mt-2 text-[var(--muted)]">
              Tell us the problem you&apos;re trying to solve. If there&apos;s no
              tool here for it, we can often build one for you within a week, and it goes on the
              marketplace so it helps the next person too.
            </p>
          </div>
          <div className="max-w-2xl">
            <ContactForm />
          </div>
        </div>
      </Section>
    </>
  );
}

/* --------------------------------- icons --------------------------------- */

function LightbulbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5C17.7 10.2 18 9 18 8a6 6 0 0 0-12 0c0 1 .3 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
