/* ---------------------------------------------------------------------------
   A deliberately small Markdown subset for seller-written descriptions.

   Not a Markdown implementation — a fixed list of things the editor toolbar can
   produce, and nothing else. That cuts both ways on purpose: sellers can't
   reach for syntax the listing page won't render, and the listing page never
   has to render syntax the editor can't produce. Anything unrecognised stays
   exactly as typed, so every description written before this existed still
   renders the way it always did.

   No HTML is parsed or emitted here. The blocks below are handed to React
   elements by components/RichText, so a seller can't inject markup into a page
   we host — which is the whole reason this isn't a general Markdown library.
--------------------------------------------------------------------------- */

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  /** Consecutive non-blank lines. Line breaks inside are kept as typed. */
  | { kind: "paragraph"; text: string };

const HEADING = /^#{1,6}[ \t]+(.*)$/;
const BULLET = /^[-*][ \t]+(.*)$/;
const NUMBERED = /^\d+[.)][ \t]+(.*)$/;

/**
 * Split seller text into blocks.
 *
 * Blank lines separate blocks; inside a paragraph, single newlines survive (the
 * renderer keeps them with `whitespace-pre-line`) because sellers hard-wrap
 * their text and re-flowing it changes their meaning.
 */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join("\n") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
      list = null;
    }
  };
  const flush = () => {
    flushParagraph();
    flushList();
  };

  for (const line of text.split("\n")) {
    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      flush();
      blocks.push({ kind: "heading", text: heading[1].trim() });
      continue;
    }

    const bullet = line.match(BULLET);
    const numbered = bullet ? null : line.match(NUMBERED);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      // A switch between bullets and numbers starts a new list rather than
      // silently folding one into the other.
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push(((bullet ?? numbered)![1] ?? "").trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/** Inline spans, in the order the renderer should try them. */
export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; href: string; label: string; trailing: string };

/**
 * `code` first so ** inside a code span stays literal. Bold before italic, or
 * `**x**` would parse as an empty italic either side of x.
 *
 * The `(?!\s)`/`(?<!\s)` guards mean emphasis has to hug its text: it keeps
 * arithmetic ("2 * 3 * 4") and shell globs out of the italic branch, which is
 * the common false positive in descriptions about software.
 */
const INLINE =
  /(`[^`\n]+`)|(\*\*(?!\s)[\s\S]+?(?<!\s)\*\*)|(\*(?!\s)[^*\n]+?(?<!\s)\*)|(https?:\/\/[^\s<>"']+)/g;

/** Punctuation that ends a sentence rather than a URL. */
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

function countChar(value: string, char: string): number {
  let n = 0;
  for (const c of value) if (c === char) n += 1;
  return n;
}

/**
 * Split a matched URL into the link itself and any trailing punctuation that
 * belongs to the sentence, so "see https://example.com, then…" doesn't swallow
 * the comma. Also balances parentheses, so "(https://example.com)" doesn't keep
 * the closing bracket.
 */
function splitTrailing(raw: string): [string, string] {
  let url = raw.replace(TRAILING_PUNCTUATION, "");
  while (url.endsWith(")") && countChar(url, ")") > countChar(url, "(")) {
    url = url.slice(0, -1);
  }
  return [url, raw.slice(url.length)];
}

/** Parse one line of inline markup into spans. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index;
    if (start > last) out.push({ kind: "text", text: text.slice(last, start) });
    const [raw] = match;

    if (raw.startsWith("`")) {
      out.push({ kind: "code", text: raw.slice(1, -1) });
    } else if (raw.startsWith("**")) {
      out.push({ kind: "bold", text: raw.slice(2, -2) });
    } else if (raw.startsWith("*")) {
      out.push({ kind: "italic", text: raw.slice(1, -1) });
    } else {
      const [href, trailing] = splitTrailing(raw);
      // Only https becomes a link. An http:// URL is left as plain text rather
      // than silently upgraded or linked, matching safeHttpsUrl.
      if (href.startsWith("https://")) {
        out.push({
          kind: "link",
          href,
          label: href.replace(/^https:\/\//, ""),
          trailing,
        });
      } else {
        out.push({ kind: "text", text: raw });
      }
    }
    last = start + raw.length;
  }

  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** One line with its inline markup removed. Recurses through emphasis. */
function stripInline(line: string): string {
  return parseInline(line)
    .map((span) => {
      if (span.kind === "link") return span.label + span.trailing;
      if (span.kind === "bold" || span.kind === "italic") return stripInline(span.text);
      return span.text;
    })
    .join("");
}

/**
 * The same text with its markup removed, for the places that take a bare
 * string: the JSON-LD description, the card preview, a plain-text excerpt.
 * Those would otherwise publish raw asterisks and hashes to search engines.
 */
export function stripMarkdown(text: string): string {
  return parseBlocks(text)
    .map((block) => {
      const lines =
        block.kind === "list"
          ? block.items
          : block.kind === "heading"
            ? [block.text]
            : [block.text];
      return lines
        .map((line) => stripInline(line))
        .join(" ");
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
