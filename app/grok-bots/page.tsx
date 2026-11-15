import type { Metadata } from "next";
import { GROK_BOTS } from "@/lib/grokBots";
import { getFeedItems } from "@/lib/feed.server";
import { MarketFeed } from "@/components/MarketFeed";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Grok Bots",
  description: `${GROK_BOTS.length} ready-to-add Grok Bots for work and life, grouped by job. Copy a bot's link, open it on x.ai and add it to your own Grok Bot.`,
  alternates: { canonical: "/grok-bots" },
};

/**
 * The browse feed opened on the Grok Bots. The rest of the marketplace is one
 * click away in the same menu, which is why the other cards are loaded too.
 */
export default async function GrokBotsPage() {
  const items = await getFeedItems();
  return (
    <MarketFeed
      items={items}
      initialKind="bot"
      intro="Tell me what you want help with and I'll find the Grok Bots, tools and guides that do it."
    />
  );
}
