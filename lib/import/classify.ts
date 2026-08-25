import type { Category, Runtime } from "@/lib/types";

/* ---------------------------------------------------------------------------
   Turning a source's own vocabulary into ours.

   GitHub has topics, Product Hunt has its topic list, and neither maps onto the
   department-shaped categories in lib/types. These tables are the translation,
   and they are deliberately a guess we show rather than a decision we make:
   both values land in a <select> the seller can correct in one click, so a near
   miss costs nothing and a hit saves a scroll through ten options.
--------------------------------------------------------------------------- */

/**
 * Ordered most specific first — the first match wins.
 *
 * Order carries real weight. "invoice" is finance even though an invoicing tool
 * is also sales software, and "analytics" is data even though marketers live in
 * it. Whichever rule sits higher is the tie-break, so the specific, unambiguous
 * words are placed above the broad ones on purpose.
 */
const CATEGORY_RULES: [Category, RegExp][] = [
  ["finance", /\b(invoic|account(ing|s)?|expense|budget|tax|bookkeep|payroll-tax|billing|payment|ledger|receipt)\b/i],
  ["people", /\b(hr|hiring|recruit\w*|onboarding|payroll|employee|applicant|resume|cv)\b/i],
  ["sales", /\b(sales|crm|lead[s-]?gen\w*|leads|outreach|prospect\w*|pipeline|quote|deal)\b/i],
  ["marketing", /\b(marketing|seo|newsletter|campaign|copywrit\w*|advertis\w*|social[- ]?media|growth|email-marketing)\b/i],
  ["data", /\b(data|analytics|csv|sql|database|etl|scrap\w*|visuali[sz]\w*|dataset|json|spreadsheet|excel|chart|convert\w*|transcod\w*|encod\w*|compress\w*)\b/i],
  ["design", /\b(design|ui|ux|figma|image|photo|video|graphic|icon|font|typography|animation|color|3d|creative|screenshot|mockup)\b/i],
  ["developers", /\b(cli|developer|dev-?tools?|api|sdk|git|github|devops|docker|terminal|shell|code|programming|compiler|linter|debug\w*|testing|framework|library)\b/i],
  ["operations", /\b(workflow|automation|scheduling|backup|sync|logistics|inventory|ops|file-?manage\w*|document\w*)\b/i],
  ["personal", /\b(game|fun|habit|health|fitness|recipe|cooking|home|hobby|music|travel|personal|pet)\b/i],
  ["productivity", /\b(productivity|notes?|todo|task|calendar|time-?track\w*|focus|markdown|writing|organi[sz]\w*|reminder)\b/i],
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
