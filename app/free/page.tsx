import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { getApprovedFreeTools } from "@/lib/freeTools.server";
import { getCategoriesServer } from "@/lib/categories.server";
import { categoryLabel } from "@/lib/types";
import { FeedPage } from "@/components/FeedPage";
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
 * The free tools directory, now the feed opened on Free tools.
 *
 * A curated list of free software that lives on other people's sites. We
 * describe it, show a preview and link out. Nothing here is hosted, delivered
 * or sold by the marketplace, and the page says so rather than letting a
 * visitor assume the listing guarantees carry over: that is the "What we
 * check" note under the opening, carried over word for word from the old page.
 *
 * Still one page with no per-item routes, and still the only place that emits
 * the directory's ItemList, so search engines read it as a catalogue.
 */
export default async function FreeToolsPage() {
  const [tools, categories] = await Promise.all([getApprovedFreeTools(), getCategoriesServer()]);

  /*
   * Each entry is a SoftwareApplication with a `downloadUrl` rather than an
   * `offers` node claiming we sell it. The `price: 0` offer inside each is
   * genuine: these really are available now, for nothing.
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
    <>
      <h1 className="sr-only">Free tools</h1>
      <FeedPage
        kind="free"
        note={
          /*
            The standard, said plainly, behind an icon. /free is reviewed for
            relevance, not for security, which is a different question from
            the one asked of a listing. Keeping the difference reachable is
            what stops the two reading as the same guarantee, which is why the
            tooltip opens on tap and on focus and not on hover alone.
          */
          <span className="inline-flex items-center gap-1.5">
            What we check
            <InfoTooltip label="What we check">
              We check that every link is real, works, and is worth your time. We do not host, deliver or review
              the software itself, so treat these the way you would treat any download from the open web.
            </InfoTooltip>
          </span>
        }
      />
      <JsonLd data={directoryLd} />
    </>
  );
}
