import type { SourceResult, ImageCandidate } from "./types";
import { guessCategory } from "./classify";
import { clamp, firstSentence } from "./html";
import { ImportError } from "./safeFetch";
import { TAGLINE_MAX, TITLE_MAX } from "@/lib/types";

/* ---------------------------------------------------------------------------
   Product Hunt as a listing source.

   Scraping is not an option and it isn't worth attempting: a plain request for
   a producthunt.com page returns 403 with no meta tags at all. The official
   GraphQL API is the only route, which makes this the one source that needs a
   token before it does anything.

   The payoff is the gallery. `media` is the carousel a maker curated for their
   launch — real screenshots, where a generic site yields only an og:image
   share card with the product name in large type.
--------------------------------------------------------------------------- */

const ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

const QUERY = `query Listing($slug: String!) {
  post(slug: $slug) {
    name
    tagline
    description
    website
    thumbnail { url }
    media { url type }
    topics(first: 6) { edges { node { name } } }
  }
}`;

interface PostResponse {
  data?: {
    post?: {
      name?: string;
      tagline?: string;
      description?: string;
      website?: string;
      thumbnail?: { url?: string } | null;
      media?: { url?: string; type?: string }[];
      topics?: { edges?: { node?: { name?: string } }[] };
    } | null;
  };
  errors?: { message?: string }[];
}

/**
 * The slug in a Product Hunt URL.
 *
 * Both shapes are in circulation — /posts/x is a launch and /products/x is the
 * product page — and people paste whichever they were looking at. The API's
 * `post(slug:)` takes the launch slug; for a /products/ link the two usually
 * agree, and when they don't the query simply misses and we say so.
 */
export function parseProductHuntUrl(url: URL): string | null {
  if (!/^(www\.)?producthunt\.com$/i.test(url.hostname)) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  if (!/^(posts|products)$/i.test(parts[0])) return null;
  const slug = parts[1];
  return /^[A-Za-z0-9_-]+$/.test(slug) ? slug : null;
}

/**
 * Ask imgix for a screenshot rather than a thumbnail.
 *
 * Product Hunt serves gallery images through imgix with the carousel's own
 * sizing baked into the query string — often a 500px square crop, which is a
 * thumbnail of a screenshot rather than the screenshot. Replacing the
 * parameters with a wide `fit=max` asks for the original proportions back.
 */
function fullSize(raw?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return undefined;
    if (/imgix\.net$/i.test(url.hostname)) {
      url.search = "";
      url.searchParams.set("auto", "format");
      url.searchParams.set("fit", "max");
      url.searchParams.set("w", "1600");
    }
    return url.href;
  } catch {
    return undefined;
  }
}

export async function importFromProductHunt(slug: string): Promise<SourceResult> {
  const token = process.env.PRODUCTHUNT_TOKEN;
  if (!token) {
    throw new ImportError(
      "Product Hunt import isn't switched on yet. Import from your website or GitHub instead."
    );
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "TheSoloMarketBot/1.0",
    },
    body: JSON.stringify({ query: QUERY, variables: { slug } }),
    signal: AbortSignal.timeout(8000),
  });

  if (res.status === 401 || res.status === 403) {
    throw new ImportError("Our Product Hunt access was rejected. Try another source for now.");
  }
  if (res.status === 429) {
    throw new ImportError("Product Hunt is rate-limiting us. Try again in a few minutes.");
  }
  if (!res.ok) throw new ImportError(`Product Hunt returned an error (${res.status}).`);

  const body = (await res.json()) as PostResponse;
  const post = body.data?.post;
  if (!post) {
    throw new ImportError(
      `Couldn't find "${slug}" on Product Hunt. If you pasted a product page, try the launch URL (/posts/…).`
    );
  }

  const topics = (post.topics?.edges ?? [])
    .map((edge) => edge?.node?.name)
    .filter((name): name is string => Boolean(name));

  // Images: the gallery first, thumbnail as a backstop. `type` distinguishes
  // video entries, which belong nowhere near the screenshot field.
  const images: ImageCandidate[] = [];
  for (const item of post.media ?? []) {
    if (item.type && item.type.toLowerCase() !== "image") continue;
    const url = fullSize(item.url);
    if (url) images.push({ url, kind: "gallery" });
  }
  if (images.length === 0) {
    const thumb = fullSize(post.thumbnail?.url);
    if (thumb) images.push({ url: thumb, kind: "social" });
  }

  const website = post.website?.trim();

  return {
    kind: "producthunt",
    title: post.name ? clamp(post.name, TITLE_MAX) : undefined,
    tagline: post.tagline ? firstSentence(post.tagline, TAGLINE_MAX) : undefined,
    description: post.description?.trim() || undefined,
    category: guessCategory(topics, `${post.tagline ?? ""} ${post.description ?? ""}`),
    sellerWebsite: website?.startsWith("https://") ? website : undefined,
    images: images.slice(0, 5),
  };
}
