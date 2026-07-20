"use client";

import { copy } from "@/lib/brand";
import { BrowseExperience } from "@/components/BrowseExperience";
import { ButtonLink, Section, Badge } from "@/components/ui";

/**
 * Landing page = pitch + product, nothing else. Everything explanatory
 * (why this exists, how it works, selling, FAQ, contact) lives on /about
 * so the listings get the space here.
 */
export default function HomePage() {
  return (
    <>
      {/* Compact hero */}
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

      {/* Listings */}
      <Section className="py-7">
        <div id="apps" className="mb-5 flex flex-wrap items-end justify-between gap-3 scroll-mt-24">
          <h2 className="text-xl font-semibold tracking-tight">Find your solution</h2>
          <div className="flex gap-2">
            <ButtonLink href="/about" variant="ghost" size="sm">
              How this works
            </ButtonLink>
            <ButtonLink href="/sell" variant="secondary" size="sm">
              Sell your tool →
            </ButtonLink>
          </div>
        </div>
        <BrowseExperience />
      </Section>

      {/* Single quiet prompt for anyone who didn't find their tool */}
      <Section className="pb-16">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="font-semibold">Didn&apos;t find what you need?</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Tell us the problem. We can often build it for you within a week.
            </p>
          </div>
          <ButtonLink href="/about#contact" size="sm">
            Request a tool
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
