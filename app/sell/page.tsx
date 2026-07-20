"use client";

import { useRouter } from "next/navigation";
import { brand } from "@/lib/brand";
import { useUser } from "@/lib/hooks";
import { setRole, login } from "@/lib/store";
import { Section, Button, Badge } from "@/components/ui";

export default function SellPage() {
  const router = useRouter();
  const user = useUser();
  const keepPct = Math.round((1 - brand.commissionRate) * 100);

  function startSelling() {
    if (!user) {
      router.push("/login?next=/sell");
      return;
    }
    // Promote demo user to seller so they can access the dashboard.
    if (user.role === "buyer") setRole("seller");
    router.push("/dashboard/new");
  }

  return (
    <>
      <div className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <Section className="relative py-20 text-center">
          <Badge tone="accent" className="mb-5">For makers</Badge>
          <h1 className="mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            You built something small and useful. Sell it.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--muted)]">
            Too small to market on its own? Perfect. List it here, keep{" "}
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
          {!user && (
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                // Demo convenience: sign in as the sample seller.
                login("maya@makers.dev");
                router.push("/dashboard");
              }}
            >
              Preview a seller account
            </Button>
          )}
        </div>
      </Section>
    </>
  );
}
