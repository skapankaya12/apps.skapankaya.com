/**
 * Grok Bots added by their makers: the rules both the form and the server
 * check, with no Firebase in here so the form can import it.
 *
 * A submission is a public x.ai/bot share link, a name, a one-line summary in
 * the maker's own words and one of the 22 groups. Every one is reviewed by
 * hand before it shows; approved ones join the feed beside the curated Grok
 * Bots with an "Added by its maker" tag.
 */
import { GROK_BOT_GROUPS } from "./grokBots";

export const BOT_NAME_MAX = 40;
export const BOT_SUMMARY_MIN = 20;
export const BOT_SUMMARY_MAX = 160;

export type BotSubmissionStatus = "pending" | "approved" | "rejected";

export interface BotSubmission {
  /** The share link's own id (x.ai/bot/<id>), which is also the document id: one entry per bot. */
  id: string;
  url: string;
  name: string;
  summary: string;
  group: string;
  /** The creator x.ai's page names ("… by Andy"), shown on the card. */
  creator?: string;
  submitterId: string;
  submitterName: string;
  submitterHandle?: string;
  status: BotSubmissionStatus;
  reviewNote?: string;
  createdAt: number;
  updatedAt: number;
  reviewedAt?: number;
}

const BOT_URL = /^https:\/\/(?:www\.)?x\.ai\/bot\/([A-Za-z0-9_-]{6,64})\/?(?:[?#].*)?$/;

/** A public Grok Bot share link, normalised, or null for anything else. */
export function parseBotUrl(raw: unknown): { url: string; id: string } | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(BOT_URL);
  if (!m) return null;
  return { url: `https://x.ai/bot/${m[1]}`, id: m[1] };
}

const DASH = /[–—]/;

export type BotDraft = { url: string; name: string; summary: string; group: string };

/** Check a draft. The same function runs in the form and on the server. */
export function checkBotDraft(d: Partial<BotDraft>): { ok: true; value: BotDraft & { id: string } } | { ok: false; field: keyof BotDraft; error: string } {
  const link = parseBotUrl(d.url);
  if (!link) return { ok: false, field: "url", error: "Paste the bot's share link. It starts with https://x.ai/bot/" };
  const name = (d.name ?? "").trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, field: "name", error: "Give the bot its name." };
  if (name.length > BOT_NAME_MAX) return { ok: false, field: "name", error: `Keep the name under ${BOT_NAME_MAX} characters.` };
  const summary = (d.summary ?? "").trim().replace(/\s+/g, " ");
  if (summary.length < BOT_SUMMARY_MIN) return { ok: false, field: "summary", error: "Say in one sentence what the bot does for someone." };
  if (summary.length > BOT_SUMMARY_MAX) return { ok: false, field: "summary", error: `Keep it to one sentence, under ${BOT_SUMMARY_MAX} characters.` };
  // The site keeps long dashes out of its copy; a comma or full stop reads the same.
  if (DASH.test(name) || DASH.test(summary)) {
    return { ok: false, field: DASH.test(name) ? "name" : "summary", error: "Use a comma or a full stop instead of a long dash." };
  }
  if (!GROK_BOT_GROUPS.some((g) => g.id === d.group)) return { ok: false, field: "group", error: "Pick the group it fits best." };
  return { ok: true, value: { url: link.url, id: link.id, name, summary, group: d.group as string } };
}
