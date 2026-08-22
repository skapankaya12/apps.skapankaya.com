import { Fragment } from "react";
import { parseBlocks, parseInline, type Inline } from "@/lib/markdown";

/**
 * Seller-written prose, rendered readably.
 *
 * Descriptions come from the editor in app/dashboard/new (and the admin edit
 * form), which writes the small Markdown subset in lib/markdown: headings,
 * bold, italic, inline code, bullet and numbered lists. Blank lines split
 * paragraphs, single newlines survive inside one, and bare https URLs become
 * links.
 *
 * Every one of those becomes a React element here — no HTML string is ever
 * parsed or injected — so a seller cannot put markup into a page we host. That
 * constraint is why this is a fixed subset rather than a Markdown library.
 *
 * Text written before the editor existed still renders exactly as it did:
 * anything that isn't one of the patterns above is left alone.
 */
export function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          // h3, not h2: the listing page already owns "What it does" as the h2
          // above this, so a seller's own headings sit under it rather than
          // competing with it in the document outline.
          return (
            <h3 key={i} className="pt-2 text-base font-semibold break-words">
              <Inlines text={block.text} />
            </h3>
          );
        }

        if (block.kind === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={i}
              className={`space-y-1.5 pl-5 ${
                block.ordered ? "list-decimal" : "list-disc"
              } marker:text-[var(--muted)]`}
            >
              {block.items.map((item, j) => (
                <li key={j} className="break-words leading-relaxed">
                  <Inlines text={item} />
                </li>
              ))}
            </List>
          );
        }

        return (
          <p key={i} className="whitespace-pre-line break-words leading-relaxed">
            <Inlines text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

/** One run of inline markup: bold, italic, code and links. */
function Inlines({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((span, i) => (
        <Span key={i} span={span} />
      ))}
    </>
  );
}

function Span({ span }: { span: Inline }) {
  switch (span.kind) {
    // Recursive, so emphasis can hold a link or code — "**Get it at
    // https://example.com**" should still produce a working link.
    case "bold":
      return (
        <strong className="font-semibold">
          <Inlines text={span.text} />
        </strong>
      );
    case "italic":
      return (
        <em>
          <Inlines text={span.text} />
        </em>
      );
    case "code":
      return (
        <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 font-mono text-[0.85em]">
          {span.text}
        </code>
      );
    case "link":
      return (
        <Fragment>
          <a
            href={span.href}
            target="_blank"
            // nofollow: these are seller-supplied and unvetted, so they don't
            // get to pass this site's ranking signal on to anywhere.
            rel="noopener noreferrer nofollow"
            className="break-words text-[var(--accent)] underline underline-offset-2 hover:no-underline"
          >
            {span.label}
          </a>
          {span.trailing}
        </Fragment>
      );
    default:
      return <Fragment>{span.text}</Fragment>;
  }
}
