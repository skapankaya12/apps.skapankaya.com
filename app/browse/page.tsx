"use client";

import { useStoreValue } from "@/lib/hooks";
import { getApprovedListings } from "@/lib/store";
import { BrowseExperience } from "@/components/BrowseExperience";
import { Section } from "@/components/ui";

export default function BrowsePage() {
  const count = useStoreValue(() => getApprovedListings().length);
  return (
    <Section className="py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Find your solution</h1>
        <p className="mt-1 text-[var(--muted)]">
          {count} tools, each built to solve one real problem. Buy once, run on your computer.
        </p>
      </div>
      <BrowseExperience />
    </Section>
  );
}
