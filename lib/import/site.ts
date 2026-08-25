import type { SourceResult, ImageCandidate } from "./types";
import { guessCategory } from "./classify";
import {
  absoluteImage, clamp, clean, documentTitle, firstSentence,
  jsonLdObjects, metaTags, pageText, productName,
} from "./html";
import { fetchHtml } from "./safeFetch";
import { TAGLINE_MAX, TITLE_MAX } from "@/lib/types";

/* ---------------------------------------------------------------------------
   Any product website as a listing source.

   The one that has to work for everybody, because most makers have a site and
   only some have a repo or a launch. It is also the weakest: Open Graph gives
   a marketing title, one blurb and a share card, and stops.

   So this doesn't stop at the meta tags. The description is built from the
   page's own copy — the lead paragraphs and the feature bullets — which is
   what makes the difference between seeding a listing with 280 characters and
   seeding it with something a seller can edit down. See pageText() in html.ts
   for how the interface microcopy is kept out of it.
--------------------------------------------------------------------------- */

const DESCRIPTION_BUDGET = 1400;

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? clean(value) : undefined;
}

export async function importFromSite(rawUrl: string): Promise<SourceResult> {
  const html = await fetchHtml(rawUrl);
  const meta = metaTags(html);
  const base = rawUrl;

  const ld = jsonLdObjects(html).find((node) => {
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    return types.some(
      (t) => typeof t === "string" && /^(SoftwareApplication|WebApplication|Product)$/i.test(t)
    );
  });

  const rawTitle =
    (ld && stringField(ld, "name")) ??
    meta.get("og:title") ??
    meta.get("twitter:title") ??
    documentTitle(html);

  const blurb =
    meta.get("og:description") ??
    meta.get("twitter:description") ??
    meta.get("description") ??
    (ld && stringField(ld, "description"));

  const text = pageText(html);

  /* The description, in the three-block subset lib/markdown renders: the page's
     lead prose, then its feature bullets as a list. Nothing is written here
     that the page didn't already say — no invented headings, no summarising —
     because the seller is the one who has to stand behind the words. */
  const sections: string[] = [];
  const lead = text.paragraphs.slice(0, 3).join("\n\n");
  if (lead) sections.push(lead);
  else if (blurb) sections.push(blurb);

  if (text.bullets.length >= 3) {
    sections.push(text.bullets.map((b) => `- ${b}`).join("\n"));
  }

  let description = sections.join("\n\n").trim();
  if (description.length > DESCRIPTION_BUDGET) {
    description = `${clamp(description, DESCRIPTION_BUDGET)}…`;
  }
  // Below this it's a meta tag with extra steps — leave the field empty rather
  // than seed it with something the seller has to delete first.
  if (description.length < 80) description = blurb ?? "";

  const images: ImageCandidate[] = [];
  const seen = new Set<string>();
  for (const key of ["og:image", "og:image:secure_url", "twitter:image"]) {
    const value = meta.get(key);
    const url = value && absoluteImage(value, base);
    if (url && !seen.has(url)) {
      seen.add(url);
      images.push({ url, kind: "social" });
    }
  }

  const prose = `${rawTitle ?? ""} ${blurb ?? ""} ${text.bullets.join(" ")}`;

  let origin: string | undefined;
  try {
    origin = new URL(base).origin;
  } catch {
    origin = undefined;
  }

  return {
    kind: "site",
    title: rawTitle ? clamp(productName(rawTitle), TITLE_MAX) : undefined,
    tagline: blurb
      ? firstSentence(blurb, TAGLINE_MAX)
      : text.heading
        ? clamp(text.heading, TAGLINE_MAX)
        : undefined,
    description: description || undefined,
    category: guessCategory([], prose),
    sellerWebsite: origin,
    images,
  };
}
