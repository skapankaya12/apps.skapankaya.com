import type { Metadata } from "next";
import { seedListings } from "@/lib/seed";
import { ListingDetail } from "@/components/ListingDetail";

/**
 * SEO metadata is generated from seed data at build/request time (server-safe).
 * Once Firestore is wired, read the listing here with the Admin SDK instead —
 * this is where per-app <title>/description come from for search engines.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = seedListings.find((l) => l.slug === slug);
  if (!listing) return { title: "App not found" };
  return {
    title: `${listing.title} — ${listing.tagline}`,
    description: listing.description.slice(0, 155),
    openGraph: {
      title: listing.title,
      description: listing.tagline,
    },
  };
}

export function generateStaticParams() {
  return seedListings.map((l) => ({ slug: l.slug }));
}

export default async function AppPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ListingDetail slug={slug} />;
}
