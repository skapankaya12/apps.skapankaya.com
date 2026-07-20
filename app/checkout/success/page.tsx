"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useStoreValue } from "@/lib/hooks";
import { getListingBySlug } from "@/lib/store";
import { Section, ButtonLink } from "@/components/ui";

function SuccessInner() {
  const sp = useSearchParams();
  const slug = sp.get("app") ?? "";
  const count = Number(sp.get("count") ?? "0");
  const listing = useStoreValue(() => getListingBySlug(slug));

  return (
    <Section className="max-w-xl py-24 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--success-soft)] text-3xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        You&apos;re all set!
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        {count > 0 ? (
          <>
            <span className="text-[var(--foreground)] font-medium">
              {count} {count === 1 ? "tool is" : "tools are"}
            </span>{" "}
            now in your library. Download and follow the guided setup to run them
            on your computer.
          </>
        ) : listing ? (
          <>
            <span className="text-[var(--foreground)] font-medium">
              {listing.title}
            </span>{" "}
            is now in your library. Download it and follow the setup guide to run
            it on your computer.
          </>
        ) : (
          "Your purchase is complete and now in your library."
        )}
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <ButtonLink href="/library" size="lg">
          Go to my library
        </ButtonLink>
        <ButtonLink href="/browse" variant="secondary" size="lg">
          Keep browsing
        </ButtonLink>
      </div>
    </Section>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
