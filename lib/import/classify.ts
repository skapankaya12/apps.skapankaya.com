import type { Category, Runtime } from "@/lib/types";

/* ---------------------------------------------------------------------------
   Turning a source's own vocabulary into ours.

   GitHub has topics, Product Hunt has its topic list, and neither maps onto the
   kind-of-tool categories in lib/types. These tables are the translation, and
   they are deliberately a guess we show rather than a decision we make: both
   values land in a <select> the seller can correct in one click, so a near
   miss costs nothing and a hit saves a scroll through a dozen options.

   Never guesses "other". That one exists for the seller to name, and a guess
   would file a tool under a blank name nobody chose.
--------------------------------------------------------------------------- */

/**
 * Ordered most specific first — the first match wins.
 *
 * Order carries real weight. "invoice" is finance even though an invoicing tool
 * is also sales software, "video converter" is files even though it touches
 * video, and "analytics" is data even though marketers live in it. Whichever
 * rule sits higher is the tie-break, so the specific, unambiguous words are
 * placed above the broad ones on purpose.
 */
const CATEGORY_RULES: [Category, RegExp][] = [
  ["finance", /\b(invoic\w*|account(ing|s)?|expense|budget|tax|bookkeep\w*|billing|payment|ledger|receipt|hr|hiring|recruit\w*|payroll|employee|applicant|paperwork)\b/i],
  ["growth", /\b(sales|crm|lead[s-]?gen\w*|leads|outreach|prospect\w*|pipeline|proposals?|marketing|seo|newsletter|campaign|copywrit\w*|advertis\w*|social[- ]?media|growth|email-marketing)\b/i],
  ["learning", /\b(learn\w*|study|studying|flashcards?|languages?|vocabulary|quiz\w*|education\w*|tutor\w*|practi[cs]e|speaking|pronunciation)\b/i],
  ["games", /\b(games?|gaming|puzzles?|toys?|arcade|fun)\b/i],
  // Not a bare "files": "your files never leave your machine" is in half the
  // pitches on a self-hosted marketplace, whatever the tool does.
  ["files", /\b(file[- ]?(manag\w*|convert\w*|organi[sz]\w*|renam\w*)|convert\w*|transcod\w*|encod\w*|compress\w*|renam\w*|pdf|zip|archiv\w*|backup|sync)\b/i],
  ["desktop", /\b(desktop|wallpapers?|widgets?|menu ?bar|launcher|window|dock|new ?tab|tabs|screensaver|focus|pomodoro|productivity|time-?track\w*)\b/i],
  // Above data, because "your data stays on your machine" is in the pitch of
  // every self-hosted notes app and says nothing about what the tool does.
  ["writing", /\b(notes?|todo|to-do|journal\w*|diary|writing|writer|markdown|calendar|reminders?)\b/i],
  ["data", /\b(data|analytics|csv|sql|database|etl|scrap\w*|visuali[sz]\w*|dataset|json|spreadsheet|excel|chart|workflow|automat\w*|agents?|bots?|scheduling)\b/i],
  ["design", /\b(design|ui|ux|figma|image|photo|video|audio|music|podcast|graphic|icon|font|typography|animation|color|3d|creative|screenshot|mockup)\b/i],
  ["developers", /\b(cli|developer|dev-?tools?|api|sdk|git|github|devops|docker|terminal|shell|code|programming|compiler|linter|debug\w*|testing|framework|library)\b/i],
  ["home", /\b(habits?|health|fitness|recipes?|cooking|home|hobby|hobbies|travel|personal|pets?|family|garden\w*|meditat\w*)\b/i],
];

/**
 * Best-guess category from a source's tags plus whatever prose we have.
 *
 * Tags are checked before prose because a tag is a deliberate label and a
 * sentence is not — "the fastest way to invoice your design clients" contains
 * both words, and the repo's own topics settle which one it is about.
 */
export function guessCategory(tags: string[], prose = ""): Category | undefined {
  const tagText = tags.join(" ").replace(/[-_]/g, " ");
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(tagText)) return category;
  }
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(prose)) return category;
  }
  return undefined;
}

/** GitHub's primary-language field, mapped onto what a buyer has to install. */
const LANGUAGE_RUNTIME: Record<string, Runtime> = {
  javascript: "node", typescript: "node", coffeescript: "node",
  vue: "node", svelte: "node",
  python: "python", "jupyter notebook": "python",
  html: "browser", css: "browser", scss: "browser", less: "browser",
  go: "binary", rust: "binary", c: "binary", "c++": "binary", "c#": "binary",
  swift: "binary", java: "binary", kotlin: "binary", zig: "binary",
  "objective-c": "binary", dart: "binary",
};

/**
 * What a buyer needs in order to run this.
 *
 * The language alone genuinely can't answer it: a browser extension and a CLI
 * tool are both "TypeScript", and they are completely different install stories
 * for whoever buys them. So the tags get the final say when they name a
 * surface, and the language is only the fallback.
 */
export function guessRuntime(language?: string, tags: string[] = []): Runtime | undefined {
  const tagText = tags.join(" ");
  if (/\b(browser|chrome|firefox|safari|web)[- ]?(extension|addon|add-on)\b/i.test(tagText)) {
    return "browser";
  }
  if (/\b(desktop|electron|tauri|macos|windows-app)\b/i.test(tagText)) return "binary";

  const key = (language ?? "").toLowerCase();
  return LANGUAGE_RUNTIME[key];
}
