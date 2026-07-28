import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { ListingDetail } from "@/components/ListingDetail";

/**
 * Listings live in Firestore, so the page is rendered on demand and the detail
 * (title, video, description) is loaded client-side by <ListingDetail>.
 *
 * TODO (SEO): read the listing here with the Firebase Admin SDK to emit a
 * per-app <title>/description and Product JSON-LD. Until then, metadata is
 * generic. This is the main reason listing pages aren't fully SEO-optimised yet.
 */
export const metadata: Metadata = {
  title: `App detail · ${brand.name}`,
  description: brand.description,
};

export default async function AppPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ListingDetail slug={slug} />;
}
