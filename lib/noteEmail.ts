import { escapeHtml } from "@/lib/email";
import { parseBlocks, parseInline, type Inline } from "@/lib/markdown";
import { isReviewImageUrl } from "@/lib/reviewImages";

/**
 * A review note as email HTML: the same blocks components/RichText draws on
 * the dashboard, written out with inline styles because mail clients drop
 * stylesheets. Every piece of text is escaped and only a fixed set of tags is
 * emitted, so the note cannot put its own markup into the email; images are
 * shown only for URLs lib/reviewImages accepts. Server-only (it imports the
 * mail helper for escaping).
 */

const P = "margin:0 0 12px;";
const LI = "margin:0 0 6px;";

function inline(text: string): string {
  return parseInline(text).map(span).join("");
}

function span(s: Inline): string {
  switch (s.kind) {
    case "bold":
      return `<strong style="font-weight:700;">${inline(s.text)}</strong>`;
    case "italic":
      return `<em>${inline(s.text)}</em>`;
    case "code":
      return `<code style="font-family:ui-monospace,Menlo,monospace;font-size:13px;background:#ffffff;border:1px solid #e1e7fd;border-radius:4px;padding:1px 4px;">${escapeHtml(s.text)}</code>`;
    case "link":
      return `<a href="${escapeHtml(s.href)}" style="color:#4f46e5;text-decoration:underline;">${escapeHtml(s.label)}</a>${escapeHtml(s.trailing)}`;
    default:
      return escapeHtml(s.text);
  }
}

export function noteToEmailHtml(note: string): string {
  return parseBlocks(note.trim(), { images: true })
    .map((b) => {
      switch (b.kind) {
        case "heading":
          return `<p style="${P}font-size:16px;font-weight:700;">${inline(b.text)}</p>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          const items = b.items.map((i) => `<li style="${LI}">${inline(i)}</li>`).join("");
          return `<${tag} style="margin:0 0 12px;padding-left:20px;">${items}</${tag}>`;
        }
        case "image":
          if (!isReviewImageUrl(b.src)) return "";
          return `<img src="${escapeHtml(b.src)}" alt="${escapeHtml(b.alt || "Screenshot")}" width="504" style="display:block;width:100%;max-width:504px;height:auto;margin:4px 0 12px;border:1px solid #e1e7fd;border-radius:10px;">`;
        default:
          // Single newlines inside a paragraph are kept, as on the dashboard.
          return `<p style="${P}">${b.text.split("\n").map(inline).join("<br>")}</p>`;
      }
    })
    .join("");
}
