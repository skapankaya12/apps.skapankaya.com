"use client";

import { useStoreValue, useUser } from "@/lib/hooks";
import { getBookmarkedListings, getAuthResolved } from "@/lib/store";
import { ListingCard } from "@/components/ListingCard";
import { Section, ButtonLink } from "@/components/ui";

export default function SavedPage() {
  const user = useUser();
  const authResolved = useStoreValue(getAuthResolved);
  const items = useStoreValue(getBookmarkedListings);

  // `!user` means "signed out" and "not heard back yet" alike, so waiting for
  // the answer is what stops a signed-in person being shown a sign-in prompt
  // for a moment on the way in.
  if (!authResolved) {
    return (
      <Section className="py-24 text-center">
        <p className="text-sm text-[var(--muted)]">Loading your saved tools…</p>
      </Section>
    );
  }

  // Saves live with the account now rather than in this browser, so there is
  // nothing to show a signed-out visitor. Worth being plain about why: the
  // trade is that a save follows them to their phone.
  if (!user) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Saved for later</h1>
        <p className="mx-auto mt-2 max-w-sm text-[var(--muted)]">
          Sign in to keep tools here. Your saved list follows your account, so
          it is the same on every device.
        </p>
        <ButtonLink href="/login?next=/saved" className="mt-6">
          Sign in
        </ButtonLink>
      </Section>
    );
  }

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
        // A single column, like /browse. ListingCard is a full-width horizontal
        // row with a fixed 288px media panel, so in a multi-column grid the
        // media eats the column and the title and price get squeezed into a
        // few characters per line.
        <div className="mt-8 flex flex-col gap-4">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </Section>
  );
}
