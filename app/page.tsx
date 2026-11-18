import type { Metadata } from "next";
import { brand, CATALOGUE_PAUSED } from "@/lib/brand";
import { CataloguePause } from "@/components/CataloguePause";
import { FeedPage } from "@/components/FeedPage";
import { ButtonLink } from "@/components/ui";

export const revalidate = 300;

const HOME_TITLE = "Tools for Solo Builders: Free Tools & Bots | The Solo Market";
// Update the launch sentence when buying opens.
const HOME_DESCRIPTION =
  "Find free tools, ready-to-add bots and practical guides for solo builders. Explore indie software listings and get notified when buying opens.";

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { type: "website", url: brand.url, siteName: brand.name, title: HOME_TITLE, description: HOME_DESCRIPTION },
  twitter: { card: "summary_large_image", title: HOME_TITLE, description: HOME_DESCRIPTION },
};

/**
 * The homepage is the browse feed: everything on the marketplace in one
 * stream, opening on a hand-taken mix of every kind (see TURNS in lib/feed.ts)
 * so the first screen shows the range rather than one kind of thing.
 *
 * Three pieces of the old homepage stay, because each is the only place
 * something is said:
 * - the pitch, word for word from lib/brand.ts, now Marketplace's opening
 *   (components/FeedHero.tsx), with the buyer and seller buttons;
 * - the pre-launch card with the waitlist form and the "listing costs
 *   nothing" line, now the first card on Marketplace (components/FeedPage.tsx);
 * - "Didn't find what you need?", under the page counter.
 */
export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">{brand.name}</h1>
      <FeedPage
        kind="all"
        hero={
          CATALOGUE_PAUSED ? (
            <div key="hero" className="mt-6 text-left">
              <CataloguePause onHome />
            </div>
          ) : undefined
        }
        after={
          <div key="after" className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center sm:flex-row sm:text-left">
            <div>
              <h2 className="font-semibold">Didn&apos;t find what you need?</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Tell us the problem. We can often build it for you within a week.
              </p>
            </div>
            <ButtonLink href="/about#contact" size="sm">
              Request a tool
            </ButtonLink>
          </div>
        }
      />
    </>
  );
}
