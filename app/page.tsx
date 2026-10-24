import type { Metadata } from "next";
import { CATALOGUE_PAUSED, copy } from "@/lib/brand";
import { getDesktopFeed } from "@/lib/desktop.server";
import { Desktop } from "@/components/desktop/Desktop";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * The homepage is a computer screen: "runs on your own computer", shown as a
 * computer. Aisles are folders, the marketplace is a window, what you own sits
 * in the Dock and the Trash is where subscriptions go.
 *
 * Read on the server so every shelf is in the HTML as real links, then the
 * desktop takes over on hydration. The homepage it replaced is kept, unrouted,
 * in archive/old-homepage/.
 */
export default async function HomePage() {
  const { items, updates } = await getDesktopFeed();
  return (
    <Desktop
      items={items}
      updates={updates}
      paused={CATALOGUE_PAUSED}
      heading={`${copy.heroHeadline} ${copy.heroByline.before} ${copy.heroByline.accent} ${copy.heroByline.after}`}
      sub={`${copy.heroSub} ${copy.heroSubAccent}`}
    />
  );
}
