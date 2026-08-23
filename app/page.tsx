import type { Metadata } from "next";
import { copy } from "@/lib/brand";
import { getApprovedListings } from "@/lib/listings.server";
import { BrowseExperience } from "@/components/BrowseExperience";
import { PreLaunchNotice } from "@/components/PreLaunchNotice";
import { ButtonLink, Section, Badge } from "@/components/ui";
import { GradientWave } from "@/components/ui/gradient-wave";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Landing page = pitch + product, nothing else. Everything explanatory
 * (why this exists, how it works, selling, FAQ, contact) lives on /about
 * so the listings get the space here.
 *
 * A server component: the catalogue is read here so the listing rows are in
 * the HTML for crawlers, then <BrowseExperience> goes live on hydration.
 */
export default async function HomePage() {
  const listings = await getApprovedListings();

  return (
    <>
      {/* Compact hero */}
      <div className="relative overflow-hidden border-b border-[var(--border)]">
        {/* Backdrop, back to front: the animated gradient, then the hairline
            grid on top of it. The grid is the page's signature and the gradient
            alone reads as generic, so they layer rather than replace. Both are
            masked out before the bottom border so nothing hard-cuts against it. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage: "linear-gradient(to bottom, #000 30%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, #000 30%, transparent 100%)",
          }}
        >
          <GradientWave className="opacity-90" />
        </div>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
        <Section className="relative py-8 sm:py-11">
          {/* Pitch, with the pre-launch card alongside it on wide screens and
              stacked underneath on narrow ones. */}
          {/* Splits at xl, not lg. At lg the text column came out ~590px and the
              headline needs 592px at text-4xl — it wrapped by a single pixel.
              Below xl the card stacks (it centres itself at max-w-md) and the
              pitch gets the full section width. */}
          <div className="grid items-center gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="mx-auto max-w-4xl text-center animate-fade-up">
              {/* White rather than the accent tint: the badge now sits on the
                  gradient wash, and --accent-soft is close enough to it to
                  read as a smudge. `!` because the tone's own background is a
                  utility of equal weight. */}
              <Badge tone="accent" className="mb-3 bg-white!">
                 Buy once · own it forever · no subscription
              </Badge>
              {/* Two deliberate lines: the headline, then the accent clause.
                  `block` on the span pins that break instead of leaving it to
                  the balancer, which was splitting mid-phrase ("built by /
                  one person"). text-balance still earns its keep on narrow
                  screens, where line one cannot fit either way. The {" "} stays
                  for whoever drops the `block` — see the SWC whitespace gotcha. */}
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl 2xl:text-5xl">
                {copy.heroHeadline}{" "}
                <span className="block text-[var(--accent)]">{copy.heroHeadlineAccent}</span>
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-balance text-[var(--muted)]">
                {copy.heroSub}
              </p>
            </div>
            <PreLaunchNotice />
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
              Sell your tool
            </ButtonLink>
          </div>
        </div>
        <BrowseExperience initial={listings} />
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
