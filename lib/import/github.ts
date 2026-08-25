import type { SourceResult, ImageCandidate } from "./types";
import { guessCategory, guessRuntime } from "./classify";
import { clamp, firstSentence } from "./html";
import { ImportError } from "./safeFetch";
import { TAGLINE_MAX, TITLE_MAX } from "@/lib/types";

/* ---------------------------------------------------------------------------
   GitHub as a listing source.

   The richest of the three, and the only one that can answer "what does a buyer
   need in order to run this" — `language` maps onto the runtime dropdown that
   nothing else in the import can fill.

   Note this never goes through safeFetch: the host is hard-coded to
   api.github.com, so there is no address for a seller to point at. What they do
   control is the path, which is why owner and repo are matched against a strict
   pattern before they are interpolated.
--------------------------------------------------------------------------- */

const API = "https://api.github.com";
/** README beyond this is changelogs and contribution guides, not a pitch. */
const MAX_README_BYTES = 256 * 1024;
/** About a screenful once rendered — a starting point, not the final copy. */
const DESCRIPTION_BUDGET = 1400;

const SEGMENT = /^[A-Za-z0-9_.-]+$/;

/**
 * Drop `:octocat:`-style shortcodes.
 *
 * GitHub renders these as pictures; everywhere else they are literally the
 * text ":octocat:", and a repo description that opens with one would put it
 * straight into the listing's tagline.
 */
function stripShortcodes(text: string): string {
  return text.replace(/:[a-z0-9_+-]+:/gi, " ").replace(/\s+/g, " ").trim();
}

export function parseRepoUrl(url: URL): { owner: string; repo: string } | null {
  if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;
  const [owner, repoRaw] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repoRaw) return null;
  const repo = repoRaw.replace(/\.git$/i, "");
  if (!SEGMENT.test(owner) || !SEGMENT.test(repo)) return null;
  // Reserved paths that look like repos but aren't.
  if (/^(features|pricing|about|topics|collections|sponsors|orgs|settings)$/i.test(owner)) {
    return null;
  }
  return { owner, repo };
}

function headers(): Record<string, string> {
  const out: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "TheSoloMarketBot/1.0",
  };
  // Unauthenticated GitHub allows 60 requests an hour *per IP*, and on Vercel
  // that IP is shared across every function instance — a handful of imports
  // would exhaust it for everyone. A token (free, read-only) raises it to 5000.
  const token = process.env.GITHUB_API_TOKEN;
  if (token) out.Authorization = `Bearer ${token}`;
  return out;
}

/**
 * Fetch from the GitHub API, retrying once without the token if it's rejected.
 *
 * The token is optional: with none at all GitHub still answers, just at 60
 * requests an hour instead of 5000. But an *expired* token is worse than no
 * token, because it gets sent anyway and comes back 401, failing an import that
 * would have succeeded anonymously. Fine-grained tokens expire on a schedule,
 * so this is a question of when rather than if, and the seller who hits it
 * would otherwise see a bare "GitHub returned an error (401)".
 *
 * A fresh AbortSignal per attempt: a timeout signal can't be reused once armed.
 */
async function ghFetch(url: string, accept?: string): Promise<Response> {
  const sent = headers();
  if (accept) sent.Accept = accept;

  const res = await fetch(url, {
    headers: sent,
    redirect: "follow", // repositories get renamed; the API 301s to the new name
    signal: AbortSignal.timeout(8000),
  });
  // 401 is specifically "bad credentials". Anything else, including a 403 for
  // rate limiting, is about the request rather than the token, so it stands.
  if (res.status !== 401 || !sent.Authorization) return res;

  console.warn("[import/github] token rejected (expired or revoked); retrying unauthenticated");
  const anon = { ...sent };
  delete anon.Authorization;
  return fetch(url, {
    headers: anon,
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });
}

interface RepoResponse {
  name?: string;
  description?: string | null;
  homepage?: string | null;
  topics?: string[];
  language?: string | null;
  archived?: boolean;
  default_branch?: string;
  private?: boolean;
}

/** Badge images: decoration, never a screenshot. */
const BADGE = /(shields\.io|badgen\.net|badge\.fury\.io|travis-ci|circleci\.com|codecov\.io|coveralls\.io|\/badge\.svg|\/workflows\/.*\/badge|forthebadge|opencollective\.com|codeclimate)/i;

/**
 * Pictures that are decoration rather than evidence.
 *
 * A README is full of images that are not the product: the app icon, a row of
 * browser logos, an emoji rendered as a PNG, a sponsor's wordmark. Offering a
 * Safari logo as a listing screenshot is worse than offering nothing, so this
 * filter is deliberately harsh — a bad screenshot the seller has to notice and
 * delete costs more attention than one we simply failed to find.
 */
const NOT_A_SCREENSHOT = /(\b|\/|-)(icons?|logos?|sponsors?|emoji|avatars?|banners?|wordmark|favicon)(\b|\/|-|\.)|browser-logos|emoji-data/i;

/**
 * Hosts that only ever serve images somebody uploaded by hand.
 *
 * When a maker drags a screenshot into a GitHub issue or README, it lands on
 * one of these. That is a far stronger signal of "this is a picture of the
 * product" than any filename convention.
 */
const UPLOADED = /(user-images\.githubusercontent\.com|github-production-user-asset|private-user-images\.githubusercontent\.com)/i;

/**
 * Reduce a README to the Markdown subset lib/markdown actually renders.
 *
 * That subset is headings, bullet and numbered lists, and paragraphs — nothing
 * else. Anything left in that it can't parse doesn't degrade gracefully, it
 * renders literally: `**Fast**` reaches a buyer as `**Fast**`, and a code fence
 * arrives as a wall of backticks. So the emphasis markers, links, images and
 * fences are all flattened to their text here rather than trusted to survive.
 */
function readmeToDescription(markdown: string): string {
  let text = markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "") // fenced code
    .replace(/^ {4,}\S.*$/gm, "") // indented code
    .replace(/<[^>]+>/g, "") // inline HTML, badges included
    .replace(/^\[[^\]]+\]:\s*\S+.*$/gm, ""); // reference link definitions

  // Drop image syntax entirely; the pictures are collected separately.
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  // Keep the words of a link, drop the target.
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // A badge is written `[![alt](image)](target)`. Removing the image above
  // leaves `[](target)` behind, which the rule above can't match because it
  // requires at least one character of link text. Without this, every badge in
  // a README arrives in the description as naked URL syntax.
  text = text.replace(/\[\]\([^)]*\)/g, "");
  // Emphasis, inline code and strikethrough — markers the renderer can't read.
  text = text
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(?<![\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])/g, "$1")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^>\s?/gm, "");

  const lines = text.split("\n");
  const intro: string[] = [];
  const features: string[] = [];
  let seenHeading = false;
  let inFeatures = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line.trim());

    if (heading) {
      const title = heading[2].trim();
      seenHeading = true;
      // A "Features"/"Why"/"What it does" section is the part of a README that
      // was written for a reader rather than a contributor.
      inFeatures = /\b(features?|why|what|highlights?|overview|capabilit\w*)\b/i.test(title);
      if (inFeatures) features.push(`## ${clamp(title, 60)}`);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;
    if (BADGE.test(trimmed)) continue;
    // Divider rows and table markup: nothing the renderer can use.
    if (/^([-=*_]\s*){3,}$/.test(trimmed) || trimmed.startsWith("|")) continue;

    const bullet = /^[-*+]\s+(.*)$/.exec(trimmed);
    if (inFeatures) {
      // Plain lines inside a features section become bullets too. Plenty of
      // READMEs lay their highlights out in an HTML <table> rather than a list
      // (refined-github does), and once the markup is stripped those arrive as
      // bare sentences. They are still a list of features, so they are rendered
      // as one instead of as a wall of one-line paragraphs.
      const item = bullet ? bullet[1] : trimmed.length >= 40 ? trimmed : null;
      if (item) features.push(`- ${clamp(item, 160)}`);
    } else if (!seenHeading && !bullet && trimmed.length >= 40) {
      intro.push(clamp(trimmed, 300));
    }

    if (intro.length >= 3 && features.length >= 10) break;
  }

  const parts = [intro.slice(0, 3).join("\n\n"), features.slice(0, 12).join("\n")]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return parts.length > DESCRIPTION_BUDGET
    ? `${clamp(parts, DESCRIPTION_BUDGET)}…`
    : parts;
}

/**
 * The product name as its README writes it.
 *
 * Better than anything derivable from the repo slug: "refined-github" title-
 * cases to "Refined Github", while the README's own heading says "Refined
 * GitHub". A human wrote one of those and an algorithm wrote the other.
 */
function readmeTitle(markdown: string): string | undefined {
  /* The heading has to be near the top to be a title.

     Taking the first `# ` anywhere is wrong, and yt-dlp shows why: its title is
     a banner image, so the first H1 in the file is `# INSTALLATION` seventy
     lines down — a section heading that would have been imported as the
     product's name. A real title is in the opening lines or it isn't there. */
  const lines = markdown.split("\n").filter((line) => line.trim());
  let heading: string | undefined;
  for (const line of lines.slice(0, 12)) {
    const m = /^#\s+(.+)$/.exec(line.trim());
    if (m) {
      heading = m[1];
      break;
    }
  }
  if (!heading) return undefined;

  const text = stripShortcodes(heading.replace(/<[^>]+>/g, " ").replace(/[*_`]/g, ""))
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 2 || text.length > TITLE_MAX) return undefined;
  // Section headings that a title-less README can start with.
  if (/^(readme|introduction|overview|about|documentation|installation|install|usage|getting started|features?|license|contributing|requirements)$/i.test(text)) {
    return undefined;
  }
  return text;
}

/** Pictures a README points at, minus the badges. */
function readmeImages(markdown: string, owner: string, repo: string, branch: string): ImageCandidate[] {
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  const found = new Set<string>();
  const out: ImageCandidate[] = [];

  const push = (src: string) => {
    if (!src || BADGE.test(src)) return;
    let href: string;
    try {
      href = new URL(src, base).href;
    } catch {
      return;
    }
    if (!href.startsWith("https://")) return;
    if (!/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(href)) return;
    if (NOT_A_SCREENSHOT.test(href)) return;
    if (found.has(href)) return;
    found.add(href);
    out.push({ url: href, kind: "readme" });
  };

  for (const m of markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) push(m[1]);
  for (const m of markdown.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) push(m[1]);
  // Hand-uploaded images first — see UPLOADED. Sort is stable, so the README's
  // own ordering survives within each group.
  return out
    .sort((a, b) => Number(UPLOADED.test(b.url)) - Number(UPLOADED.test(a.url)))
    .slice(0, 5);
}

export async function importFromGitHub(owner: string, repo: string): Promise<SourceResult> {
  const path = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const res = await ghFetch(`${API}/repos/${path}`);

  if (res.status === 404) {
    throw new ImportError("That repository doesn't exist, or it's private.");
  }
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new ImportError(
      "GitHub is rate-limiting us right now. Try again shortly, or import from your website instead."
    );
  }
  if (!res.ok) throw new ImportError(`GitHub returned an error (${res.status}).`);

  const repoData = (await res.json()) as RepoResponse;
  const notes: string[] = [];
  if (repoData.archived) {
    notes.push("This repository is archived on GitHub, which buyers may read as unmaintained.");
  }

  const topics = repoData.topics ?? [];
  const branch = repoData.default_branch ?? "main";

  // The README is a bonus, not a requirement: a repo with good metadata and no
  // README should still fill most of the form.
  let description: string | undefined;
  let images: ImageCandidate[] = [];
  let readmeName: string | undefined;
  try {
    const readmeRes = await ghFetch(
      `${API}/repos/${path}/readme`,
      "application/vnd.github.raw"
    );
    if (readmeRes.ok) {
      const raw = (await readmeRes.text()).slice(0, MAX_README_BYTES);
      description = readmeToDescription(raw) || undefined;
      images = readmeImages(raw, owner, repo, branch);
      readmeName = readmeTitle(raw);
    }
  } catch {
    // Timeout or transport failure. The repo metadata above still stands.
  }

  const blurb = repoData.description?.trim();

  return {
    kind: "github",
    // A repo slug is a filename, not a product name: "csv-cleaner" reads as
    // "Csv Cleaner", which is closer to something a buyer would see on a card.
    title:
      readmeName ??
      (repoData.name ? clamp(titleFromSlug(repoData.name), TITLE_MAX) : undefined),
    tagline: blurb ? firstSentence(stripShortcodes(blurb), TAGLINE_MAX) : undefined,
    description,
    category: guessCategory(topics, `${blurb ?? ""} ${repoData.name ?? ""}`),
    runtime: guessRuntime(repoData.language ?? undefined, topics),
    sellerWebsite: normalizeHomepage(repoData.homepage),
    images,
    notes,
  };
}

function titleFromSlug(slug: string): string {
  const words = slug.split(/[-_]+/).filter(Boolean);
  // Title-casing only reads as a name when the parts are words. "csv-cleaner"
  // becomes "Csv Cleaner", which a seller can tidy in a keystroke; "yt-dlp"
  // would become "Yt Dlp", which is just wrong. Short fragments mean the slug
  // is an abbreviation, and an abbreviation is better left exactly as written.
  if (words.length < 2 || words.some((word) => word.length < 3)) return slug;
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * A homepage worth putting in the seller's "website" field.
 *
 * GitHub accepts anything here, and plenty of repos use it for a chat invite
 * rather than a product page — yt-dlp's is a Discord link. A buyer clicking
 * "website" expects the tool, so only https survives and the obvious
 * non-websites are dropped.
 */
function normalizeHomepage(value?: string | null): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return undefined;
    if (/^(discord\.gg|t\.me|twitter\.com|x\.com|patreon\.com)$/i.test(url.hostname)) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}
