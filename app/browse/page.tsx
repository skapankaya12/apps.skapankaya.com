import type { Metadata } from "next";
import Link from "next/link";
import { brand, CATALOGUE_PAUSED } from "@/lib/brand";
import { getApprovedListings, hasPublishableSlug } from "@/lib/listings.server";
import { getFeedItems } from "@/lib/feed.server";
import { JsonLd } from "@/components/JsonLd";
import { MarketFeed } from "@/components/MarketFeed";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Browse",
  description:
    "Everything on The Solo Market in one place: tools you buy once and own forever, free and open source tools, ready-made Grok Bots, and guides for solo makers.",
  alternates: { canonical: "/browse" },
};

/**
 * Browse is the marketplace and its navigation at once: every tool, free
 * tool, Grok Bot and blog post in one feed, with the site's links in the
 * feed's menu instead of a header. The cards are read on the server so the
 * tools and posts land in the HTML; the bots come from a static file.
 */
export default async function BrowsePage() {
  const [items, listings] = await Promise.all([
    getFeedItems(),
    CATALOGUE_PAUSED ? Promise.resolve([]) : getApprovedListings(),
  ]);

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
    "@id": `${brand.url}/browse#catalogue`,
    name: `Every tool on ${brand.name}`,
    url: `${brand.url}/browse`,
    numberOfItems: catalogue.length,
    itemListElement: catalogue.map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@id": `${brand.url}/app/${l.slug}#app` },
    })),
  };

  return (
    <>
      <h1 className="sr-only">Browse {brand.name}</h1>
      <MarketFeed
        items={items}
        intro="Tell me what you want to get done and I'll find the tools, Grok Bots and guides for it."
        note={
          <>
            {/* The status belongs on this page as page copy, not only as a PS
                inside one listing's description where a visitor scrolls past
                it. Remove with the rest of the pre-launch copy at launch. */}
            {brand.statusNote}{" "}
            <Link href="/free" className="text-[var(--accent)] hover:underline">
              Free tools are available now.
            </Link>
          </>
        }
      />
      {!CATALOGUE_PAUSED && <JsonLd data={catalogueLd} />}
    </>
  );
}
