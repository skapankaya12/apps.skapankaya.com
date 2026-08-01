import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import {
  getApprovedListingBySlug,
  getApprovedListings,
  hasPublishableSlug,
  formatPriceServer,
} from "@/lib/listings.server";
import { CATEGORY_LABELS } from "@/lib/types";
import { ListingDetail } from "@/components/ListingDetail";
import { JsonLd } from "@/components/JsonLd";

/**
 * A listing page is the marketplace's long-tail search surface: someone types
 * the problem they have, and the tool that solves it should be the result. So
 * the listing is read on the server and rendered into the HTML, rather than
 * being fetched client-side — AI crawlers don't run JavaScript, and Google only
 * gets to a JS-rendered page on a slower second pass.
 *
 * Revalidated every 5 minutes: listing content changes rarely, and buyers get
 * live data from the client store anyway once the page hydrates.
 */
export const revalidate = 300;

/** Prebuild the approved catalogue; anything newer renders on first request. */
export async function generateStaticParams() {
  const listings = await getApprovedListings();
  return listings
    .filter((l) => hasPublishableSlug(l.slug))
    .map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getApprovedListingBySlug(slug);
  if (!listing) return { title: "Tool not found" };

  // The tagline is the one-line "what it does", which is exactly what a search
  // snippet wants. The price and ownership terms are the differentiator, so
  // they go in the description too.
  const description = `${listing.tagline} — ${formatPriceServer(
    listing.priceCents
  )} once, yours forever, runs on your own computer. By ${listing.sellerName}.`;

  // No `images` here on purpose: leaving it unset lets the sibling
  // opengraph-image.tsx supply the card. A seller's screenshot is whatever
  // aspect ratio they uploaded, whereas the generated card is always 1200x630
  // and carries the title, price and brand.
  return {
    title: listing.title,
    description,
    alternates: { canonical: `/app/${listing.slug}` },
    openGraph: {
      type: "website",
      title: `${listing.title} · ${brand.name}`,
      description,
      url: `${brand.url}/app/${listing.slug}`,
    },
    twitter: { card: "summary_large_image", title: listing.title, description },
  };
}

/** schema.org operatingSystem, from how the tool actually runs. */
const RUNTIME_OS: Record<string, string> = {
  node: "Windows, macOS, Linux (Node.js)",
  python: "Windows, macOS, Linux (Python)",
  browser: "Any (runs in a web browser)",
  binary: "Windows, macOS, Linux",
  other: "Windows, macOS, Linux",
};

export default async function AppPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getApprovedListingBySlug(slug);
  if (!listing) notFound();

  const url = `${brand.url}/app/${listing.slug}`;

  // SoftwareApplication rather than plain Product: these are programs, and it
  // lets us state the runtime and category in terms Google already understands.
  // Deliberately no aggregateRating — there are no reviews yet, and inventing
  // them is both a policy violation and a lie to buyers.
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: listing.title,
    description: listing.description,
    url,
    applicationCategory: CATEGORY_LABELS[listing.category],
    operatingSystem: RUNTIME_OS[listing.runtime] ?? RUNTIME_OS.other,
    softwareVersion: listing.version,
    ...(listing.screenshots.some((s) => /^https?:\/\//.test(s))
      ? { screenshot: listing.screenshots.filter((s) => /^https?:\/\//.test(s)) }
      : {}),
    author: { "@type": "Person", name: listing.sellerName },
    offers: {
      "@type": "Offer",
      price: (listing.priceCents / 100).toFixed(2),
      priceCurrency: brand.currency,
      availability: "https://schema.org/InStock",
      url,
      seller: { "@type": "Organization", name: brand.name },
    },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: brand.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Browse tools",
        item: `${brand.url}/browse`,
      },
      { "@type": "ListItem", position: 3, name: listing.title, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={softwareLd} />
      <JsonLd data={breadcrumbLd} />
      {/*
        <ListingDetail> is a client component, but client components still
        prerender to HTML on the server. Passing `initial` means it renders the
        real title, description and price into that HTML instead of a spinner —
        which is the whole point of fetching here.
      */}
      <ListingDetail slug={slug} initial={listing} />
    </>
  );
}
