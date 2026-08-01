"use client";

import { useRouter } from "next/navigation";
import { brand } from "@/lib/brand";
import { useUser } from "@/lib/hooks";
import { setRole } from "@/lib/store";
import { Section, Button, Badge } from "@/components/ui";

// The marketplace is software-only: self-contained tools a buyer downloads and
// runs on their own machine. This spells out the boundary for makers.
const CAN_SELL = [
  "Scripts & CLI tools- Node.js, Python, shell, and the like",
  "Desktop or browser-based apps a buyer runs locally",
  "Automations, agents, converters, generators, scrapers, dashboards, utilities",
  "Your own original code (or code you're licensed to resell)",
  "Self-contained tools with readable source and disclosed network calls",
];
const CANT_SELL = [
  "SaaS, subscriptions, or anything that runs on your servers",
  "Non-software goods like ebooks, courses, templates, presets, graphics, music",
  "Physical products or freelance services",
  "Code that isn't yours, or that breaks someone's license",
  "Malware, data harvesters, or obfuscated / hidden-behavior tools",
  "Anything illegal, or that phishes buyers for credentials or keys",
];

export default function SellPage() {
  const router = useRouter();
  const user = useUser();
  const keepPct = Math.round((1 - brand.commissionRate) * 100);

  async function startSelling() {
    if (!user) {
      router.push("/login?next=/sell");
      return;
    }
    // Anyone can become a seller: promote a buyer's account, then continue.
    if (user.role === "buyer") await setRole("seller");
    router.push("/dashboard/new");
  }

  return (
    <>
      <div className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <Section className="relative py-20 text-center">
          <Badge tone="accent" className="mb-5">For makers</Badge>
          <h1 className="mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            You had an idea and built it. Now sell it.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--muted)]">
            That idea you shipped to fix your own problem? Someone else has it
            too. Too small to market on its own? Perfect. List it here, keep{" "}
            <span className="font-semibold text-[var(--foreground)]">{keepPct}%</span> of
            every sale, and let buyers run it locally in minutes.
          </p>
          <div className="mt-8">
            <Button onClick={startSelling} size="lg">
              List your app
            </Button>
          </div>
        </Section>
      </div>

      {/* Economics */}
      <Section className="py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              big: `${keepPct}%`,
              label: "You keep",
              body: `All-inclusive ${Math.round(brand.commissionRate * 100)}% fee. No listing fees, no separate payment fees, no monthly cost.`,
            },
            {
              big: "~20 min",
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
          {brand.name} is for small 
          <span className="font-medium text-[var(--foreground)]">software tools
          </span> people
          download and run on their own computer. If it&apos;s a self-contained
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
              ["Runs in 5 minutes", "A buyer can go from download to running by following your SETUP file, either with one command or AI assisted."],
              ["Readable source", "No obfuscated or minified-only code. Buyers (and their AI) can read what they run."],
              ["Honest disclosure", "All network calls and dependencies declared in your manifest.json."],
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
          It takes about 20 minutes and there&apos;s no cost to list.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={startSelling} size="lg">Start now</Button>
        </div>
      </Section>
    </>
  );
}
