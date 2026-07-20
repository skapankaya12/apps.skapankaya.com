import type { Metadata } from "next";
import Link from "next/link";
import { brand, copy } from "@/lib/brand";
import { Section, Badge, ButtonLink } from "@/components/ui";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "About the marketplace",
  description:
    "Why this marketplace exists, how buying and running a tool works, what it costs to sell, answers to common questions, and how to request a tool we can build for you.",
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
    a: "Every submission is human-reviewed and scanned for malware and undisclosed network activity before it's listed, and makers must declare all dependencies and network calls. That said, we can't guarantee safety or compatibility on your specific device, and you run downloaded software at your own risk.",
  },
  {
    q: "Do I get updates?",
    a: "Yes. When a maker ships a new version, it appears in your library and you can re-download it free. You can also re-download anything you own at any time.",
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

export default function AboutPage() {
  const keepPct = Math.round((1 - brand.commissionRate) * 100);

  return (
    <>
      {/* Intro / why this exists */}
      <div className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <Section className="relative py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="accent" className="mb-4">{copy.missionTitle}</Badge>
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              The tool that fixes your thing already exists. It&apos;s just small.
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
          {[
            ["🧩", "Built from a real need", "Not a startup pitch, just a fix someone made because they had the problem too."],
            ["💸", "Skip the bloated platform", "Pay once for the one feature you need, not monthly for 30 you don't."],
            ["🔒", "Runs on your computer", "Your data stays with you. No cloud, no account, no telemetry."],
          ].map(([icon, title, body]) => (
            <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-muted)] text-xl">
                {icon}
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
              { n: "3", title: "Keep it forever", body: "Re-download anytime, free updates when the maker ships them." },
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
