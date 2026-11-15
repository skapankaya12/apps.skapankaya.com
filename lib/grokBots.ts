/**
 * The Grok Bots directory: public x.ai/bot share links, grouped by job.
 *
 * Data lives in grokBots.json, picked by hand from the CC0 rows of the
 * community catalog kydlikebtc/awesome-grokbot (found through treg, 15
 * November 2026). Every link was re-checked against x.ai the same day and the
 * dead ones dropped. Trading, betting and crypto bots were left out on
 * purpose, as were summaries with dashes, which this site keeps out of copy.
 *
 * We only link out. Nothing here is hosted, sold or reviewed by us: adding a
 * bot happens on x.ai, under the maker's own setup.
 */
import data from "./grokBots.json";

export type GrokBotSide = "work" | "life";

export interface GrokBotGroup {
  id: string;
  label: string;
  side: GrokBotSide;
}

export interface GrokBot {
  id: string;
  name: string;
  summary: string;
  group: string;
  author: string;
  handle: string;
  url: string;
  official: boolean;
}

export const GROK_BOT_GROUPS = data.groups as GrokBotGroup[];
export const GROK_BOTS = data.bots as GrokBot[];
export const GROK_BOTS_CHECKED = data.checked;

export function grokBotGroupLabel(id: string): string {
  return GROK_BOT_GROUPS.find((g) => g.id === id)?.label ?? id;
}
