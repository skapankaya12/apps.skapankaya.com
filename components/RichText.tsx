import { Fragment } from "react";

/**
 * Matches a bare URL inside free text. Deliberately stops at whitespace and at
 * the characters that are almost always punctuation around a link rather than
 * part of it, so "see https://example.com, then…" doesn't swallow the comma.
 */
const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

/** Punctuation that ends a sentence rather than a URL. */
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/**
 * Split a matched URL into the link itself and any trailing punctuation that
 * belongs to the sentence. Also balances parentheses, so a link written as
 * "(https://example.com)" doesn't keep the closing bracket.
 */
function splitTrailing(raw: string): [string, string] {
  let url = raw.replace(TRAILING_PUNCTUATION, "");
  while (url.endsWith(")") && countChar(url, ")") > countChar(url, "(")) {
    url = url.slice(0, -1);
  }
  return [url, raw.slice(url.length)];
}

function countChar(value: string, char: string): number {
  let n = 0;
  for (const c of value) if (c === char) n += 1;
  return n;
}

/**
 * Find the first https URL in free text. Sellers routinely paste a demo link
 * into the description rather than anywhere structured, so this is how we
 * surface one as a real button on the listing card.
 *
 * https only, for the same reason as `safeHttpsUrl` in lib/utils: a bare http
 * link from a seller is a mixed-content downgrade on a page we host.
 */
export function firstDemoUrl(text?: string): string | undefined {
  if (!text) return undefined;
  for (const match of text.match(URL_PATTERN) ?? []) {
    const [url] = splitTrailing(match);
    if (url.startsWith("https://")) return url;
  }
  return undefined;
}

/**
 * One paragraph of seller-written text with any URLs turned into real links.
 *
 * Only https becomes a link. An http:// URL is left as plain text rather than
 * silently upgraded or linked, matching `safeHttpsUrl`.
 */
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, i) => {
        // split() with a capture group puts the matches at the odd indices.
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;

        const [url, trailing] = splitTrailing(part);
        if (!url.startsWith("https://")) return <Fragment key={i}>{part}</Fragment>;

        return (
          <Fragment key={i}>
            <a
              href={url}
              target="_blank"
              // nofollow: these are seller-supplied and unvetted, so they don't
              // get to pass this site's ranking signal on to anywhere.
              rel="noopener noreferrer nofollow"
              className="break-words text-[var(--accent)] underline underline-offset-2 hover:no-underline"
            >
              {url.replace(/^https:\/\//, "")}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * Seller-written prose, rendered readably.
 *
 * Descriptions are typed into a plain textarea, so they arrive as raw text with
 * whatever line breaks the seller used and any links pasted inline. Rendering
 * that straight into one <p> — which is what we did before — collapses every
 * break into a single wall of text and leaves URLs as dead plain strings.
 *
 * So: blank lines split paragraphs, single newlines are preserved within a
 * paragraph (`whitespace-pre-line`), and URLs become links. Nothing is parsed
 * as Markdown — sellers aren't told they can use it, and half-rendered
 * Markdown looks worse than none.
 */
export function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="whitespace-pre-line break-words leading-relaxed">
          <Linkified text={paragraph} />
        </p>
      ))}
    </div>
  );
}
