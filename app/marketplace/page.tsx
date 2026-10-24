import type { Metadata } from "next";
import Link from "next/link";
import { brand, CATALOGUE_PAUSED } from "@/lib/brand";
import { getApprovedListings, hasPublishableSlug } from "@/lib/listings.server";
import { JsonLd } from "@/components/JsonLd";
import { BrowseExperience } from "@/components/BrowseExperience";
import { CataloguePause } from "@/components/CataloguePause";
import { Section } from "@/components/ui";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Every tool on the marketplace: small, finished software you buy once, own forever, and run on your own computer. Filter by the kind of tool and the system it runs on.",
  alternates: { canonical: "/marketplace" },
};

/**
 * The Marketplace tab: every tool, filterable. This was /browse; /browse now
 * redirects here (next.config.ts) so old links and search results still land.
 * The homepage that used to sit above this catalogue is kept, unrouted, in
 * archive/old-homepage/.
 *
 * The catalogue is read on the server so the listing rows land in the HTML.
 * <BrowseExperience> swaps to the live client store once it hydrates, and
 * reads ?q= itself so this page can stay statically prerendered.
 */
export default async function MarketplacePage() {
  const listings = CATALOGUE_PAUSED ? [] : await getApprovedListings();

  /*
   * The catalogue, as a catalogue.
   *
   * This page emitted Organization and WebSite and stopped, while every /app/
   * page carried a full SoftwareApplication, so nothing told a machine that
   * this page is the index of those.
   *
   * Each entry is a bare @id reference rather than a copy of the listing's
   * fields. That is the whole point: the product page stays the only place a
   * title or a price is stated, so this block can never disagree with it, and
   * it needs no maintenance when a fourth tool lists.
   *
   * Same slug filter as the sitemap, so the two agree on which pages exist.
   *
   * No `offers` here, for the same reason there are none on the product pages.
   * They go back in both places together, at launch.
   */
  const catalogue = listings.filter((l) => hasPublishableSlug(l.slug));
  const catalogueLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${brand.url}/marketplace#catalogue`,
    name: `Every tool on ${brand.name}`,
    url: `${brand.url}/marketplace`,
    numberOfItems: catalogue.length,
    itemListElement: catalogue.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@id": `${brand.url}/app/${l.slug}#app` },
    })),
  };

  return (
    <Section className="py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Find your solution</h1>
        {/* The status belonged on this page as page copy, not only as a PS
            inside one listing's description where a visitor scrolls past it.
            Remove with the rest of the pre-launch copy at launch. */}
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
          {brand.statusNote}{" "}
          {/* The two catalogues are the only pages on the site that index other
              pages, and neither pointed at the other. A crawler reaching one had
              no route to the other except the footer. */}
          <Link href="/free" className="text-[var(--accent)] hover:underline">
            Free tools are available now.
          </Link>
        </p>
      </div>
      {CATALOGUE_PAUSED ? (
        <CataloguePause />
      ) : (
        <>
          <BrowseExperience initial={listings} />
          <JsonLd data={catalogueLd} />
        </>
      )}
    </Section>
  );
}
