import type { FreeTool } from "@/lib/types";
import { linkHost } from "@/lib/utils";
import { Badge } from "./ui";

/**
 * One entry in the /free directory.
 *
 * A plain server component with no interactivity, unlike ListingCard. There is
 * nothing to bookmark, nothing to play on hover and no detail page to route to:
 * the card is a link out, so the whole thing is one anchor and it renders in
 * the served HTML with no JS at all.
 *
 * The host is printed under the title on purpose. A visitor clicking this
 * leaves the site, and saying where to is the difference between a link and a
 * trap. `nofollow` matches how a seller's own website link is treated: an
 * outbound link we list is not one we vouch for.
 */
export function FreeToolCard({
  tool,
  categoryLabel,
}: {
  tool: FreeTool;
  categoryLabel?: string;
}) {
  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--accent)]"
    >
      <div className="aspect-[16/9] w-full overflow-hidden bg-[var(--surface-muted)]">
        {tool.previewImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={tool.previewImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          /* No preview rather than a broken one. The source had no OG image and
             inventing a screenshot would misrepresent someone else's product. */
          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--muted)]">
            {linkHost(tool.url)}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold leading-snug tracking-tight">
            {tool.title}
          </h3>
          <Badge tone="success" className="shrink-0">
            Free
          </Badge>
        </div>

        <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
          {tool.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <span className="truncate">{linkHost(tool.url)}</span>
          {categoryLabel && <Badge>{categoryLabel}</Badge>}
        </div>
      </div>
    </a>
  );
}
