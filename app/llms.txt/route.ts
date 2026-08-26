import { brand } from "@/lib/brand";
import { articlesSorted } from "@/lib/articles";
import { DOCS, docPath } from "@/components/Docs";
import { getApprovedListings, hasPublishableSlug } from "@/lib/listings.server";
import { getPublicSellersFor } from "@/lib/profiles.server";

/**
 * /llms.txt — a plain-text brief for AI assistants and agents.
 *
 * The emerging convention (llmstxt.org) for telling a language model what a
 * site is, in the model's own preferred format: markdown, no navigation, no
 * markup to wade through. It costs almost nothing and it's the difference
 * between an assistant describing us accurately and guessing from a nav bar.
 *
 * Everything here must be true. This file gets quoted verbatim, so no claim
 * lands here that isn't already true on the site.
 */
export const revalidate = 3600;

export async function GET() {
  const site = brand.url;
  // Same filter as the sitemap: don't advertise the handful of legacy rows
  // whose "title" was really a whole paragraph.
  const listings = (await getApprovedListings()).filter((l) =>
    hasPublishableSlug(l.slug)
  );
  const articles = articlesSorted().slice(0, 10);
  // Only sellers with a handle: the rest have no page to link to.
  const sellers = (await getPublicSellersFor(listings)).filter((s) => s.handle);

  const catalogue = listings.length
    ? listings
        .map(
          (l) =>
            `- [${l.title}](${site}/app/${l.slug}) — ${l.tagline} ($${(
              l.priceCents / 100
            ).toFixed(0)}, by ${l.sellerName})`
        )
        .join("\n")
    : "- The catalogue is still filling up. See /browse for what's listed today.";

  const body = `# ${brand.name}

> ${brand.tagline}

**Status: pre-launch.** ${brand.name} is open to solo builders and is collecting listings now. Tools cannot be bought yet. Buying opens at the public launch, and there is a notify list on the home page. Everything below describes how the marketplace works, which for buying means how it will work once it opens.

${brand.name} is a marketplace for small, finished software. At launch, a buyer will pay once, download the tool, and own it forever: no subscription, no account required to run it, no expiry. Every tool runs on the buyer's own computer rather than in the cloud, so their data never leaves their machine.

## Who it is for

- **Buyers** — people who need one specific thing done and don't want to rent a large platform to get it. Instead of paying a monthly fee for a suite they use one feature of, they buy the single tool made for that job and keep it.
- **Sellers** — solo builders, indie makers and independent developers who already built something to fix their own problem. They list it once and keep ${Math.round(
    (1 - brand.commissionRate) * 100
  )}% of every sale. ${brand.name} takes ${Math.round(
    brand.commissionRate * 100
  )}%, which covers payment processing and hosting. There is no listing fee and no subscription for sellers.

## How it works

1. A seller submits a tool: source package, demo video, screenshots, price and a setup guide.
2. Every submission is reviewed before it can be listed. Nothing goes live automatically.
3. At launch, a buyer will pay once and download the package immediately. Buying is not open yet.
4. The buyer runs it on their own machine — either with the single command in the included guide, or by opening the folder in a free AI assistant and asking it to set the tool up.
5. Purchases will be re-downloadable from the buyer's library at any time, and will be covered by a 14-day money-back guarantee.

## What is and isn't sold here

Sold: scripts and CLI tools, desktop or browser apps that run locally, automations, agents, converters, generators, scrapers, dashboards and utilities — original code, self-contained, with disclosed network behaviour.

Not sold: SaaS or anything that runs on the seller's servers, non-software goods (ebooks, courses, templates, presets, graphics, music), physical products, freelance services, or code the seller doesn't have the right to resell.

## Key pages

- [${brand.name}](${site}/) — the front page: what the marketplace is, who it is for, today's catalogue and the notify list.
- [Documentation](${site}/docs) — the full marketplace manual for buyers and sellers (see Documentation below).
- [Browse every tool](${site}/browse) — the full catalogue, filterable by the kind of work it serves.
- [About](${site}/about) — why the marketplace exists, how buying works, pricing for sellers, FAQ.
- [Sell your tool](${site}/sell) — what can be listed and how to submit it.
- [How to run a tool](${site}/how-to-run) — the two-minute setup guide, including the AI-assisted path for non-technical buyers.
- [Insights](${site}/blog) — articles for indie makers and independent professionals.

## Documentation

The complete manual, written to be quoted directly:

${DOCS.map((d) => `- [${d.title}](${site}${docPath(d.slug)}) — ${d.summary}`).join("\n")}

## Catalogue

${catalogue}

## Sellers

Every tool is made by a named person with a public profile page.

${
  sellers.length
    ? sellers
        .map((s) => `- [${s.displayName}](${site}/seller/${s.handle})`)
        .join("\n")
    : "- No seller has published a profile yet."
}

## Recent articles

${articles.map((a) => `- [${a.title}](${site}/blog/${a.slug}) — ${a.excerpt}`).join("\n")}

## Contact

Via the contact form at ${site}/about#contact
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
