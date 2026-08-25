/* ---------------------------------------------------------------------------
   Reading a product page without a parser dependency.

   Regex over HTML is normally a bad idea, and it is worth saying why it's the
   right call here. We are not building a DOM or preserving a document — we read
   <meta> tags, which are attribute-only void elements written by frameworks,
   plus the text of a few block tags. Nothing we extract is ever rendered as
   markup: every value ends up as plain text in a form field the seller edits.
   So the failure mode of a bad match is a slightly wrong suggestion, not an
   injection, and that doesn't justify pulling a parser into the bundle.
--------------------------------------------------------------------------- */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘",
  ldquo: "“", rdquo: "”", middot: "·", bull: "•", trade: "™",
  reg: "®", copy: "©",
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
}

/** Collapse whitespace and decode entities — how every extracted string lands. */
export function clean(text: string): string {
  return decodeEntities(text.replace(/\s+/g, " "))
    // stripTags swaps every tag for a space, so inline markup around a word
    // ("<span>creators</span>, students") leaves a gap before the comma.
    // Closing it here means every caller gets punctuation that reads right.
    .replace(/\s+([,.;:!?%’'"”)\]])/g, "$1")
    .replace(/([(\[“])\s+/g, "$1")
    .trim();
}

/** Drop tags, and the elements whose text is never page content. */
export function stripTags(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

/** Remove the elements above without touching the rest of the markup. */
function stripNonContent(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-z][\w:-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return out;
}

/**
 * Every <meta> keyed by its property/name, lowercased.
 *
 * First writer wins: a page that repeats og:title means the first one, and
 * later duplicates are usually per-section overrides we don't want.
 */
export function metaTags(html: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = attributes(tag);
    const key = (attrs.property ?? attrs.name ?? attrs.itemprop ?? "").toLowerCase();
    const content = attrs.content;
    if (key && content && !out.has(key)) out.set(key, clean(content));
  }
  return out;
}

/** The <title>, minus any framework template suffix. */
export function documentTitle(html: string): string | undefined {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? clean(stripTags(m[1])) || undefined : undefined;
}

/** Parsed application/ld+json blocks, flattened through @graph. */
export function jsonLdObjects(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed: unknown = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        const graph = record["@graph"];
        if (Array.isArray(graph)) {
          for (const node of graph) {
            if (node && typeof node === "object") out.push(node as Record<string, unknown>);
          }
        } else {
          out.push(record);
        }
      }
    } catch {
      // A malformed block is the page's problem, not ours. Skip it.
    }
  }
  return out;
}

function textOf(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(clean(stripTags(m[1])));
  return out;
}

/**
 * Headings that mean "the useful part of this page is over".
 *
 * Everything below one of these is social proof, sales furniture or legal
 * boilerplate — true of the page, but not a description of the product.
 */
const CUTOFF = /\b(faq|frequently asked|testimonial|what .{0,20}saying|reviews?|pricing|plans|contact|newsletter|subscribe|footer|follow us|related|changelog)\b/i;

/**
 * The strings on a page that read like product copy.
 *
 * The filtering here is all length-based, which sounds crude and turns out to
 * be the thing that works: interface microcopy is short imperative text
 * ("Drag, drop, or paste here"), and real description prose is not. A 40
 * character floor on paragraphs drops the widget labels and keeps the pitch,
 * without needing to guess at what any particular element means.
 */
export interface PageText {
  heading?: string;
  paragraphs: string[];
  bullets: string[];
}

export function pageText(html: string): PageText {
  const body = stripNonContent(html);

  /* Drop the sections that aren't about the product, and only those.

     The first version of this cut the document at the first "FAQ" or
     "testimonials" heading and kept everything above it. That reads as
     reasonable and is wrong in practice: on a real page the feature list often
     sits *below* the testimonials, so truncating there threw away the single
     most useful thing on the page. Sections are excised individually instead —
     a heading we don't want removes its own section and nothing else. */
  const headings = [...body.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
  let usable = headings.length ? body.slice(0, headings[0].index) : body;
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const until = headings[i + 1]?.index ?? body.length;
    if (CUTOFF.test(clean(stripTags(heading[1])))) continue;
    usable += body.slice(heading.index, until);
  }

  const seen = new Set<string>();
  const unique = (values: string[], min: number, max: number) =>
    values.filter((v) => {
      const key = v.toLowerCase();
      if (v.length < min || v.length > max || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const heading = textOf(usable, "h1").find((h) => h.length >= 8 && h.length <= 120);
  if (heading) seen.add(heading.toLowerCase());

  return {
    heading,
    paragraphs: unique(textOf(usable, "p"), 40, 400).slice(0, 6),
    bullets: unique(textOf(usable, "li"), 8, 120).slice(0, 8),
  };
}

/** Absolute, https-only image URL, or undefined. Relative paths resolve. */
export function absoluteImage(src: string, base: string): string | undefined {
  try {
    const url = new URL(src, base);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Cut to `max` characters on a word boundary.
 *
 * The browser's own `maxLength` would do this by truncating mid-word, which is
 * why imported text is trimmed before it ever reaches the input.
 */
export function clamp(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:—–-]+$/, "");
}

/** The first sentence, if one fits; otherwise a clamped opening. */
export function firstSentence(text: string, max: number): string {
  const trimmed = text.trim();
  const stop = /[.!?](\s|$)/.exec(trimmed);
  if (stop && stop.index + 1 <= max) return trimmed.slice(0, stop.index + 1).trim();
  return clamp(trimmed, max);
}

/**
 * Strip the marketing suffix people put in <title> and og:title.
 *
 * "TeraConvert - Private File Converter for Mac" is a page title; the app is
 * called TeraConvert. Splitting on the separators used for this keeps the name
 * and drops the pitch — but only when what's left still looks like a name,
 * because "Convert files privately - TeraConvert" puts them the other way round
 * and blindly taking the first half would be wrong.
 */
export function productName(raw: string): string {
  const parts = raw.split(/\s+[|·–—]\s+|\s+-\s+/);
  if (parts.length < 2) return raw.trim();

  const [first, ...rest] = parts.map((p) => p.trim()).filter(Boolean);
  const last = rest[rest.length - 1];
  // A short trailing segment is the brand ("Convert files — TeraConvert").
  if (last && last.length <= 24 && first.length > 24) return last;
  return first || raw.trim();
}
