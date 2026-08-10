import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import { Badge } from "@/components/ui";
import { JsonLd } from "@/components/JsonLd";

/* ---------------------------------------------------------------------------
   /docs — the marketplace manual
   One source of truth for the doc set: metadata, sidebar order and grouping,
   prev/next links, per-page <Metadata> and JSON-LD. Individual pages just
   import their entry and render prose. Keeping the map here means the sidebar,
   sitemap and llms.txt can all read the same list.
--------------------------------------------------------------------------- */

export type DocAudience = "start" | "sellers" | "buyers";

export interface Doc {
  /** URL segment after /docs. "" is the index and never appears in the nav. */
  slug: string;
  /** <h1> and page title. */
  title: string;
  /** Shorter label for the sidebar. */
  navLabel: string;
  /** One-line summary — used as the meta description and the page lead. */
  summary: string;
  audience: DocAudience;
  /** Rough read time in minutes, shown as a hint. */
  minutes: number;
}

/** Ordered — this is also the prev/next order and the sidebar order. */
export const DOCS: Doc[] = [
  {
    slug: "how-it-works",
    title: "How the marketplace works",
    navLabel: "How it works",
    summary:
      "The whole model on one page: what The Solo Market is, who it's for, and the path a tool takes from a seller's laptop to a buyer running it locally.",
    audience: "start",
    minutes: 5,
  },
  {
    slug: "selling",
    title: "Get your project live",
    navLabel: "Get your project live",
    summary:
      "The complete seller guide — what you can list, how to prepare your project, the submission form field by field, review, and going live.",
    audience: "sellers",
    minutes: 9,
  },
  {
    slug: "app-package",
    title: "The App Package standard",
    navLabel: "App Package standard",
    summary:
      "The exact zip every listing ships as: manifest.json, README.md, SETUP.md, LICENSE.md and src/ — with a worked example and the setup promise your SETUP.md must keep.",
    audience: "sellers",
    minutes: 8,
  },
  {
    slug: "pricing-and-payouts",
    title: "Pricing & payouts",
    navLabel: "Pricing & payouts",
    summary:
      "What it costs to sell, the flat commission, how and when payouts reach you through Stripe, and how refunds are handled.",
    audience: "sellers",
    minutes: 5,
  },
  {
    slug: "trust-and-safety",
    title: "Trust, review & safety",
    navLabel: "Trust & safety",
    summary:
      "How every submission is reviewed before it lists, what buyers can rely on, and the rules that keep the marketplace safe to run code from.",
    audience: "buyers",
    minutes: 5,
  },
  {
    slug: "running-apps",
    title: "Running an app you bought",
    navLabel: "Running an app",
    summary:
      "For buyers: what you actually download, the two ways to run it (one command or a free AI assistant), runtimes explained, and what to do if it won't start.",
    audience: "buyers",
    minutes: 5,
  },
];

export function getDoc(slug: string): Doc {
  const doc = DOCS.find((d) => d.slug === slug);
  if (!doc) throw new Error(`Unknown doc slug: ${slug}`);
  return doc;
}

/** Full public path for a doc, used by the sidebar, sitemap and llms.txt. */
export function docPath(slug: string) {
  return slug ? `/docs/${slug}` : "/docs";
}

/** Build the per-page Next.js Metadata from a doc's own fields. */
export function docMetadata(slug: string): Metadata {
  const doc = getDoc(slug);
  return {
    title: doc.title,
    description: doc.summary,
    alternates: { canonical: docPath(slug) },
    openGraph: {
      title: `${doc.title} — ${brand.name} docs`,
      description: doc.summary,
      url: `${brand.url}${docPath(slug)}`,
      type: "article",
    },
  };
}

const AUDIENCE_BADGE: Record<DocAudience, string> = {
  start: "Overview",
  sellers: "For sellers",
  buyers: "For buyers",
};

/* ------------------------------ page wrapper ------------------------------ */

/**
 * TechArticle JSON-LD. Docs are the pages an AI assistant is most likely to
 * quote when someone asks "how do I sell on The Solo Market" — machine-readable
 * article markup tells it exactly what each page is and who published it.
 */
function docArticleLd(doc: Doc) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: doc.title,
    description: doc.summary,
    url: `${brand.url}${docPath(doc.slug)}`,
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      name: `${brand.name} documentation`,
      url: `${brand.url}/docs`,
    },
    publisher: {
      "@type": "Organization",
      name: brand.name,
      url: brand.url,
    },
  };
}

export function DocPage({ slug, children }: { slug: string; children: ReactNode }) {
  const doc = getDoc(slug);
  const index = DOCS.findIndex((d) => d.slug === slug);
  const prev = index > 0 ? DOCS[index - 1] : null;
  const next = index < DOCS.length - 1 ? DOCS[index + 1] : null;

  return (
    <article>
      <JsonLd data={docArticleLd(doc)} />
      <header className="border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Badge tone="accent">{AUDIENCE_BADGE[doc.audience]}</Badge>
          <span>·</span>
          <span>{doc.minutes} min read</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {doc.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-[var(--muted)]">
          {doc.summary}
        </p>
      </header>

      <div className="doc-prose mt-8">{children}</div>

      {/* Prev / next */}
      {(prev || next) && (
        <nav className="mt-14 grid gap-4 border-t border-[var(--border)] pt-8 sm:grid-cols-2">
          {prev ? (
            <Link
              href={docPath(prev.slug)}
              className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--border-strong)]"
            >
              <span className="text-xs text-[var(--muted)]">← Previous</span>
              <span className="mt-1 block font-medium group-hover:text-[var(--accent)]">
                {prev.navLabel}
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={docPath(next.slug)}
              className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-right hover:border-[var(--border-strong)] sm:col-start-2"
            >
              <span className="text-xs text-[var(--muted)]">Next →</span>
              <span className="mt-1 block font-medium group-hover:text-[var(--accent)]">
                {next.navLabel}
              </span>
            </Link>
          )}
        </nav>
      )}

      {/* Help footer */}
      <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm text-[var(--muted)]">
        Still have a question this page didn&apos;t answer?{" "}
        <Link href="/about#contact" className="text-[var(--accent)] hover:underline">
          Ask us through the contact form
        </Link>{" "}
        — we reply to every message.
      </div>
    </article>
  );
}

/* ------------------------------ prose helpers ------------------------------ */

/**
 * A callout for a claim worth setting apart — a rule, a warning, a promise.
 * Rendered as a styled aside inside `.doc-prose`.
 */
export function Callout({
  tone = "note",
  title,
  children,
}: {
  tone?: "note" | "good" | "warn";
  title?: string;
  children: ReactNode;
}) {
  const tones = {
    note: "border-[var(--border-strong)] bg-[var(--surface-muted)]",
    good: "border-[var(--success)]/30 bg-[var(--success-soft)]",
    warn: "border-[var(--warning)]/30 bg-[var(--warning-soft)]",
  };
  return (
    <div className={`mt-6 rounded-xl border p-4 text-sm leading-relaxed ${tones[tone]}`}>
      {title && (
        <p className="!mt-0 font-semibold text-[var(--foreground)]">{title}</p>
      )}
      <div className={`text-[var(--foreground)]/80 ${title ? "mt-1" : ""}`}>
        {children}
      </div>
    </div>
  );
}

/** Section heading with a stable anchor id so people (and models) can deep-link. */
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return <h2 id={id}>{children}</h2>;
}
