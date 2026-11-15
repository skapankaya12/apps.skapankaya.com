import { cache } from "react";
import { adminConfigured, getAdminDb } from "./firebaseAdmin";
import { grokBotGroupLabel } from "./grokBots";
import type { BotSubmission } from "./botSubmissions";
import type { FeedItem } from "./feed";

/**
 * The server half of maker-submitted Grok Bots.
 *
 * `botSubmissions/{id}` has no rule in firestore.rules, so no browser can read
 * or write it; every read and write goes through /api/grok-bots and
 * /api/admin/grok-bots with the Admin SDK. Nothing about it needs a rules
 * deploy.
 */
export const BOT_SUBMISSIONS = "botSubmissions";

const UA = "Mozilla/5.0 (compatible; TheSoloMarket/1.0; +https://www.thesolomarket.com)";

/**
 * Open a share link on x.ai and read what its page says: whether it exists,
 * and the "Name by Creator" title. x.ai answers 404 for a bot that was deleted
 * or never shared, which is the check that keeps dead links out.
 */
export async function readBotPage(url: string): Promise<{ live: boolean; name?: string; creator?: string; description?: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok || new URL(res.url).hostname.replace(/^www\./, "") !== "x.ai") return { live: false };
    const html = (await res.text()).slice(0, 400_000);
    const meta = (name: string) => {
      const m =
        html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]*content="([^"]*)"`, "i")) ??
        html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]*(?:property|name)="${name}"`, "i"));
      return m ? decode(m[1]).trim() : "";
    };
    const title = meta("og:title") || (html.match(/<title>([^<]*)/i)?.[1] ?? "");
    const by = title.lastIndexOf(" by ");
    return {
      live: true,
      name: (by > 0 ? title.slice(0, by) : title).trim() || undefined,
      creator: by > 0 ? title.slice(by + 4).trim() || undefined : undefined,
      description: meta("og:description") || undefined,
    };
  } catch {
    return { live: false };
  }
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function toSubmission(id: string, d: FirebaseFirestore.DocumentData): BotSubmission {
  return { ...(d as Omit<BotSubmission, "id">), id };
}

/**
 * Approved submissions as feed cards, newest first. Read with the feed, so a
 * new approval shows within the pages' five minutes (the admin route also asks
 * for an immediate refresh). Any failure leaves them out rather than breaking
 * the feed.
 */
export const getApprovedBotItems = cache(async (): Promise<FeedItem[]> => {
  if (!adminConfigured) return [];
  try {
    const snap = await getAdminDb().collection(BOT_SUBMISSIONS).where("status", "==", "approved").get();
    return snap.docs
      .map((doc) => toSubmission(doc.id, doc.data()))
      .sort((a, b) => (b.reviewedAt ?? b.updatedAt) - (a.reviewedAt ?? a.updatedAt))
      .map((s) => {
        const group = grokBotGroupLabel(s.group);
        return {
          id: `bot:${s.id}`,
          kind: "bot" as const,
          title: s.name,
          summary: s.summary,
          href: s.url,
          external: true,
          badge: "Added by its maker",
          byline: s.creator || s.submitterName || undefined,
          bylineHref: s.submitterHandle ? `https://x.com/${s.submitterHandle}` : undefined,
          meta: `Grok Bot · ${group}`,
          group,
          botGroup: s.group,
          copyUrl: s.url,
        };
      });
  } catch (err) {
    console.error("[botSubmissions] approved read failed:", err);
    return [];
  }
});
