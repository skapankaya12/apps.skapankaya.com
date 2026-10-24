import { cache } from "react";
import { CATALOGUE_PAUSED } from "@/lib/brand";
import { getApprovedListings, formatPriceServer, hasPublishableSlug } from "@/lib/listings.server";
import { getApprovedFreeTools } from "@/lib/freeTools.server";
import { PLATFORM_LABELS } from "@/lib/types";
import { articles } from "@/lib/articles";
import type { MarketUpdate, ShelfItem } from "@/lib/desktop";
import snapshot from "@/lib/data/videoPrompts.json";
import { SITE_FOLDERS, USEFUL_SITES } from "@/lib/usefulSites";

export type DesktopFeed = { items: ShelfItem[]; updates: MarketUpdate[] };

/**
 * Everything on the desktop's shelves and in its Notification Centre, read on
 * the server. The homepage renders it into the HTML; every other page fetches
 * it from /api/desktop the first time someone opens Spotlight or the
 * Notification Centre there. One function, so the two never disagree.
 */
export const getDesktopFeed = cache(async (): Promise<DesktopFeed> => {
  const [listings, freeTools] = await Promise.all([
    CATALOGUE_PAUSED ? Promise.resolve([]) : getApprovedListings(),
    getApprovedFreeTools(),
  ]);

  const items: ShelfItem[] = [
    ...listings
      .filter((l) => hasPublishableSlug(l.slug))
      .map((l) => ({
        id: `tool-${l.id}`,
        aisle: "tools" as const,
        title: l.title,
        blurb: l.tagline,
        price: `${formatPriceServer(l.priceCents)} once`,
        image: l.posterImage || l.screenshots[0],
        href: `/app/${l.slug}`,
        facts: l.runtime === "binary" && l.platform ? `Runs on ${PLATFORM_LABELS[l.platform]}` : "Runs on your own computer",
        by: l.sellerName,
        at: l.listedAt ?? l.createdAt,
      })),
    ...freeTools.map((t) => ({
      id: `free-${t.id}`,
      aisle: "free" as const,
      title: t.title,
      blurb: t.description,
      price: "Free",
      image: t.previewImage,
      href: t.url,
      facts: "Lives on its maker's site",
      by: t.submitterName,
      at: t.createdAt,
    })),
    ...snapshot.items.map((v) => ({
      id: `video-${v.id}`,
      aisle: "video" as const,
      title: v.title,
      blurb: v.tags.join(" · "),
      price: "Free",
      image: v.image,
      href: v.href,
      facts: "A prompt, credited to its maker",
      sub: v.group,
    })),
    ...USEFUL_SITES.map((w) => ({
      id: `site-${w.slug}`,
      aisle: "sites" as const,
      title: w.name,
      blurb: w.blurb,
      price: new URL(w.url).hostname.replace(/^www\./, ""),
      image: `/sites/${w.slug}.png`,
      iconOnly: true,
      href: w.url,
      facts: SITE_FOLDERS.find((f) => f.id === w.folder)?.label ?? "Useful website",
      sub: w.folder,
      pinned: w.pinned,
    })),
  ];

  // The Notification Centre's feed: what changed in the market, newest
  // first. New tools, new free tools, the latest article, the prompt library.
  const newest = (aisle: ShelfItem["aisle"], n: number) =>
    items
      .filter((i) => i.aisle === aisle && i.at)
      .sort((a, b) => b.at! - a.at!)
      .slice(0, n);
  const latestArticle = [...articles].sort((a, b) => b.date.localeCompare(a.date))[0];
  const updates: MarketUpdate[] = [
    ...newest("tools", 4).map((i) => ({ id: i.id, kind: "listing" as const, title: `New in Tools: ${i.title}`, body: i.blurb, at: i.at!, href: i.href })),
    ...newest("free", 2).map((i) => ({ id: i.id, kind: "free" as const, title: `New free tool: ${i.title}`, body: i.blurb, at: i.at!, href: i.href })),
    ...(latestArticle
      ? [{ id: `blog-${latestArticle.slug}`, kind: "blog" as const, title: "New on the blog", body: latestArticle.title, at: Date.parse(latestArticle.date), href: `/blog/${latestArticle.slug}` }]
      : []),
    {
      id: "video-sync",
      kind: "video" as const,
      title: "Video prompts updated",
      body: `${snapshot.items.length} prompts for launch films, demos and app previews.`,
      at: Date.parse(snapshot.syncedAt),
      href: "/video-prompts",
    },
  ].sort((a, b) => b.at - a.at);

  return { items, updates };
});
