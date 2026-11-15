import type { ReactNode } from "react";
import type { FeedKind } from "@/lib/feed";
import { getFeedItems } from "@/lib/feed.server";
import { MarketFeed } from "./MarketFeed";
import { PreLaunchNotice } from "./PreLaunchNotice";

/**
 * One filter's page: the shared feed, opened on that filter. Every filter
 * has its own address (KIND_PATHS in lib/feed.ts) and its route file is just
 * metadata plus this.
 *
 * The pre-launch card (waitlist form, "listing costs nothing") is the first
 * card on Marketplace, where buying is the question it answers.
 */
export async function FeedPage({
  kind,
  note,
  hero,
  after,
}: {
  kind: "all" | FeedKind;
  note?: ReactNode;
  hero?: ReactNode;
  after?: ReactNode;
}) {
  const items = await getFeedItems();
  return (
    <MarketFeed
      items={items}
      initialKind={kind}
      intro="Tell me what you want to get done and I'll find the tools, Grok Bots, agents and reads for it."
      note={note}
      hero={hero}
      after={after}
      lead={kind === "tool" ? <PreLaunchNotice key="lead" /> : undefined}
    />
  );
}
