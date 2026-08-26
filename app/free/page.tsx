import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { getApprovedFreeTools } from "@/lib/freeTools.server";
import { getCategoriesServer } from "@/lib/categories.server";
import { categoryLabel } from "@/lib/types";
import { Section, ButtonLink } from "@/components/ui";
import { FreeToolCard } from "@/components/FreeToolCard";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { JsonLd } from "@/components/JsonLd";

/** Revalidated with the catalogue, so an approval shows up within minutes. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Free tools",
  description:
    "A hand-checked directory of free and open source tools for small jobs. Each one is made by an independent builder and lives on their own site, free to download. No account needed.",
  alternates: { canonical: "/free" },
};

/**
 * The free tools directory.
 *
 * A curated list of free software that lives on other people's sites. We
 * describe it, show a preview and link out. Nothing here is hosted, delivered
 * or sold by the marketplace, and the page says so rather than letting a
 * visitor assume the listing guarantees carry over.
 *
 * Deliberately one page with no per-item routes. A page whose whole substance
 * is a paragraph and an outbound link is what search engines penalise
 * directories for, and fifty of them rank for nothing. One page with real
 * descriptions can rank for the phrase people actually search. Per-item pages
 * become worth adding when the descriptions are long enough to carry one, and
 * starting here does not block that.
 */
export default async function FreeToolsPage() {
  const [tools, categories] = await Promise.all([
    getApprovedFreeTools(),
    getCategoriesServer(),
  ]);

  /*
   * The directory as a catalogue, same pattern as /browse.
   *
   * Each entry is a SoftwareApplication with a `downloadUrl` rather than an
   * `offers` node. That is the honest shape: we are describing software and
   * saying where to get it, not offering it. An Offer would claim we supply it.
   */
  const directoryLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${brand.url}/free#directory`,
    name: `Free tools on ${brand.name}`,
    url: `${brand.url}/free`,
    numberOfItems: tools.length,
    itemListElement: tools.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SoftwareApplication",
        name: t.title,
        description: t.description,
        applicationCategory: categoryLabel(t.category, categories),
        downloadUrl: t.url,
        ...(t.previewImage ? { image: t.previewImage } : {}),
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: brand.currency,
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };

  return (
    <Section className="py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Free tools worth knowing about
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
          Small, free software made by independent builders. Every one of these
          lives on its own maker&apos;s site, costs nothing, and is a click
          away.{" "}
          {/*
            The standard, said plainly, behind an icon rather than in the hero.

            /free is reviewed for relevance, not for security, and that is a
            different question from the one asked of a listing. Keeping the
            difference reachable is what stops the two reading as the same
            guarantee, which is why the tooltip opens on tap and on focus and
            not on hover alone.
          */}
          <InfoTooltip label="What we check">
            We check that every link is real, works, and is worth your time. We
            do not host, deliver or review the software itself, so treat these
            the way you would treat any download from the open web.
          </InfoTooltip>
        </p>
        <ButtonLink href="/free/submit" variant="secondary" className="mt-6">
          Suggest a tool
        </ButtonLink>
        <p className="mt-6 text-sm text-[var(--muted)]">
          Looking for something more specific?{" "}
          <Link href="/browse" className="text-[var(--accent)] hover:underline">
            Browse the full catalogue
          </Link>
          .
        </p>
      </header>

      {tools.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
          <p className="text-[var(--muted)]">
            The directory is still being collected. Know something that belongs
            here?
          </p>
          <ButtonLink href="/free/submit" className="mt-5">
            Suggest a tool
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => (
            <FreeToolCard
              key={t.id}
              tool={t}
              categoryLabel={categoryLabel(t.category, categories)}
            />
          ))}
        </div>
      )}

      <JsonLd data={directoryLd} />
    </Section>
  );
}
