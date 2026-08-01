import type { Metadata } from "next";
import { getApprovedListings } from "@/lib/listings.server";
import { BrowseExperience } from "@/components/BrowseExperience";
import { Section } from "@/components/ui";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Browse tools",
  description:
    "Every tool on the marketplace: small, finished software you buy once, own forever, and run on your own computer. Filter by the work you do — sales, finance, marketing, operations, design and more.",
  alternates: { canonical: "/browse" },
};

/**
 * The catalogue is read on the server so the listing rows land in the HTML.
 * <BrowseExperience> swaps to the live client store once it hydrates, and
 * reads ?q= itself so this page can stay statically prerendered.
 */
export default async function BrowsePage() {
  const listings = await getApprovedListings();

  return (
    <Section className="py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Find your solution</h1>
      </div>
      <BrowseExperience initial={listings} />
    </Section>
  );
}
