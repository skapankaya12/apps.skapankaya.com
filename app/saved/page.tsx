"use client";

import { useStoreValue } from "@/lib/hooks";
import { getBookmarkedListings } from "@/lib/store";
import { ListingCard } from "@/components/ListingCard";
import { Section, ButtonLink } from "@/components/ui";

export default function SavedPage() {
  const items = useStoreValue(getBookmarkedListings);

  return (
    <Section className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Saved for later</h1>
      <p className="mt-1 text-[var(--muted)]">Tools you bookmarked while browsing.</p>

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border-strong)] py-16 text-center">
          <p className="text-[var(--muted)]">
            Nothing saved yet. Tap the ♥ on any tool to keep it here.
          </p>
          <ButtonLink href="/browse" className="mt-5" variant="secondary">
            Browse tools
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </Section>
  );
}
