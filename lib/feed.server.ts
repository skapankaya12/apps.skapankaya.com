import { cache } from "react";
import { CATALOGUE_PAUSED } from "./brand";
import { articlesSorted, readingMinutes } from "./articles";
import { getCategoriesServer } from "./categories.server";
import { getApprovedFreeTools } from "./freeTools.server";
import { getApprovedListings, hasPublishableSlug, formatPriceServer } from "./listings.server";
import { categoryLabel } from "./types";
import { EXTRA_ITEMS, type FeedItem } from "./feed";
import { getApprovedBotItems } from "./botSubmissions.server";

/**
 * Everything on the site that is not a Grok Bot, as feed cards: approved
 * tools, approved free tools and every blog post. The bots come from a static
 * file and are added on the client, so they are not repeated in this payload.
 *
 * Tools follow the same rules as /browse always has: nothing while the
 * catalogue is paused, and only listings with a publishable slug, so a card
 * never links to a page the sitemap says does not exist.
 */
export const getFeedItems = cache(async (): Promise<FeedItem[]> => {
  const [listings, freeTools, categories] = await Promise.all([
    CATALOGUE_PAUSED ? Promise.resolve([]) : getApprovedListings(),
    getApprovedFreeTools(),
    getCategoriesServer(),
  ]);

  const label = (l: { category: string; otherCategory?: string }) =>
    l.category === "other" && l.otherCategory ? l.otherCategory : categoryLabel(l.category, categories);

  const tools: FeedItem[] = listings
    .filter((l) => hasPublishableSlug(l.slug))
    .sort((a, b) => (b.listedAt ?? b.createdAt) - (a.listedAt ?? a.createdAt))
    .map((l) => ({
      id: `tool:${l.id}`,
      kind: "tool",
      title: l.title,
      summary: l.tagline,
      href: `/app/${l.slug}`,
      external: false,
      image: l.posterImage || l.screenshots?.[0],
      video: l.demoVideo || undefined,
      badge: formatPriceServer(l.priceCents),
      byline: l.sellerName || undefined,
      meta: `Tool · ${label(l)}`,
      group: label(l),
    }));

  const free: FeedItem[] = freeTools
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((t) => {
      let host = "";
      try {
        host = new URL(t.url).hostname.replace(/^www\./, "");
      } catch {}
      return {
        id: `free:${t.id}`,
        kind: "free",
        title: t.title,
        summary: t.description,
        href: t.url,
        external: true,
        image: t.previewImage,
        badge: "Free",
        byline: host || undefined,
        meta: `Free tool · ${categoryLabel(t.category, categories)}`,
        group: categoryLabel(t.category, categories),
      };
    });

  const sorted = articlesSorted();
  const posts: FeedItem[] = sorted.map((a, i) => ({
    id: `article:${a.slug}`,
    kind: "article",
    title: a.title,
    summary: a.excerpt,
    href: `/blog/${a.slug}`,
    external: false,
    badge: a.tag,
    byline: a.author,
    meta: `Blog · ${readingMinutes(a)} min read`,
    group: a.tag,
    issue: sorted.length - i, // newest first in the list, so the newest has the highest number
  }));

  // Grok Bots their makers added and the admin approved. They sit ahead of the
  // curated bots in the mix, so the newest additions are the first bots shown.
  const makerBots = await getApprovedBotItems();

  return [...tools, ...free, ...posts, ...makerBots, ...(await withLiveStandings(EXTRA_ITEMS))];
});

/**
 * The AI Standings card says who leads this week, read from the poll's own
 * public JSON. Any failure (the site down, a changed shape) leaves the card's
 * standing description in place rather than breaking the feed.
 */
async function withLiveStandings(items: FeedItem[]): Promise<FeedItem[]> {
  try {
    const res = await fetch("https://aistandings.live/standings.json", { next: { revalidate: 3600 } });
    if (!res.ok) return items;
    const data = (await res.json()) as { labs?: { name: string; share: number }[] };
    const top = (data.labs ?? []).slice(0, 3);
    if (top.length < 3) return items;
    const line = top.map((l) => `${l.name} ${Math.round(l.share)}%`).join(", ");
    return items.map((it) =>
      it.kind === "standings" ? { ...it, summary: `Who people pick right now: ${line}. One vote each, and you can move yours.` } : it,
    );
  } catch {
    return items;
  }
}
