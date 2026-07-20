"use client";

import Link from "next/link";
import { brand, copy } from "@/lib/brand";
import { BrowseExperience } from "@/components/BrowseExperience";
import { ButtonLink, Section, Badge } from "@/components/ui";

export default function HomePage() {
  const keepPct = Math.round((1 - brand.commissionRate) * 100);

  return (
    <>
      {/* Compact hero — the pitch and the apps share the same screen */}
      <div className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
        <Section className="relative py-8 sm:py-11">
          <div className="mx-auto max-w-2xl text-center animate-fade-up">
            <Badge tone="accent" className="mb-3">
              ▸ Buy once · own it forever · no subscription
            </Badge>
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-4xl">
              {copy.heroHeadline}{" "}
              <span className="text-[var(--accent)]">{copy.heroHeadlineAccent}</span>
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-balance text-[var(--muted)]">
              {copy.heroSub}
            </p>
          </div>
        </Section>
      </div>

      {/* Browse — right below the hero, no extra click */}
      <Section className="py-7">
        <div id="apps" className="mb-5 flex flex-wrap items-end justify-between gap-3 scroll-mt-24">
          <h2 className="text-xl font-semibold tracking-tight">Find your solution</h2>
          <ButtonLink href="/sell" variant="secondary" size="sm">
            Sell your tool →
          </ButtonLink>
        </div>
        <BrowseExperience />
      </Section>

      {/* Why this exists — the mission / selling point */}
      <Section className="py-8">
        <div className="grid items-center gap-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-8 sm:p-12 md:grid-cols-[1.2fr_1fr]">
          <div>
            <Badge tone="accent" className="mb-4">{copy.missionTitle}</Badge>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The tool that fixes your thing already exists. It&apos;s just small.
            </h2>
            <p className="mt-4 leading-relaxed text-[var(--muted)]">
              {copy.missionBody}
            </p>
          </div>
          <div className="grid gap-3">
            {[
              ["🧩", "Built from a real need", "Not a startup pitch — a fix someone made because they had the problem too."],
              ["💸", "Skip the bloated platform", "Pay once for the one feature you need, not monthly for 30 you don't."],
              ["🔒", "Runs on your computer", "Your data stays with you. No cloud, no account, no telemetry."],
            ].map(([icon, t, b]) => (
              <div key={t} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <span className="text-xl">{icon}</span>
                <div>
                  <h3 className="text-sm font-semibold">{t}</h3>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section className="py-12">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {[
            { n: "1", title: "Find & buy", body: "Search by the problem you have. One-time payment, instant access." },
            { n: "2", title: "Run it — no expertise needed", body: "Double-click, or let an AI assistant set it up for you from the included guide." },
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
        <Link href="/how-to-run" className="mt-6 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
          See exactly how you&apos;ll run any tool →
        </Link>
      </Section>

      {/* Seller CTA */}
      <Section className="py-8">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--foreground)] px-8 py-14 text-center text-[var(--background)]">
          <h2 className="text-3xl font-semibold tracking-tight">
            Built a little tool that solves your own problem?
          </h2>
          <p className="mx-auto mt-3 max-w-lg opacity-80">
            Someone else has that problem too. List it, keep {keepPct}% of every
            sale, and let it help people — no listing fees, no subscription.
          </p>
          <div className="mt-8">
            <ButtonLink href="/sell" variant="secondary" size="lg">
              Start selling
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
