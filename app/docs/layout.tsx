import type { ReactNode } from "react";
import { Section } from "@/components/ui";
import { DocsSidebar } from "@/components/DocsSidebar";

/**
 * The docs shell. A quiet, document-first layout: a sticky table of contents on
 * the left (desktop) and a single readable column on the right. Deliberately
 * plain — these pages are meant to read like a manual, not a landing page.
 *
 * <DocsSidebar> is a client component that reads the pathname to mark the
 * active page, so the layout can render one shared rail for every doc.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <Section className="py-12 sm:py-16">
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <DocsSidebar />
          </div>
        </aside>
        <div className="min-w-0 max-w-2xl">{children}</div>
      </div>
    </Section>
  );
}
