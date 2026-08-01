import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { articlesSorted, readingMinutes, formatDate } from "@/lib/articles";
import { Section, Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Insights: for indie makers and independent professionals",
  description:
    "Articles on building and selling small software, buying tools instead of bloated SaaS, subscription fatigue, and local-first work. Written for indie makers and solo professionals.",
  alternates: {
    canonical: "/blog",
    // Advertises the feed in <head> so readers and crawlers find it.
    types: { "application/rss+xml": "/blog/rss.xml" },
  },
};

export default function BlogPage() {
  const all = articlesSorted();
  const [lead, ...rest] = all;

  return (
    <>
      <div className="border-b border-[var(--border)]">
        <Section className="py-12 sm:py-16">
          <Badge tone="accent" className="mb-4">Insights</Badge>
          <h1 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Ideas for people who build and buy small software
          </h1>
          <p className="mt-3 max-w-xl text-[var(--muted)]">
            Practical writing for indie makers and independent professionals:
            building tools with AI, selling them, escaping bloated SaaS, and
            owning your software again.
          </p>
        </Section>
      </div>

      <Section className="py-12">
        <div className="space-y-10">
          {lead && <LeadCard article={lead} />}

          {rest.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Nudge back to the product */}
      <Section className="pb-16">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
          <p className="text-[var(--muted)]">
            Reading gives you the idea. {brand.name} gives you the tool.
          </p>
          <Link
            href="/browse"
            className="mt-2 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Browse the marketplace →
          </Link>
        </div>
      </Section>
    </>
  );
}

function LeadCard({ article }: { article: ReturnType<typeof articlesSorted>[number] }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] sm:p-8"
    >
      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <span>{formatDate(article.date)}</span>
        <span>·</span>
        <span>{readingMinutes(article)} min read</span>
      </div>
      <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight group-hover:text-[var(--accent)] sm:text-3xl">
        {article.title}
      </h2>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">{article.excerpt}</p>
      <span className="mt-4 inline-block text-sm font-medium text-[var(--accent)]">
        Read article →
      </span>
    </Link>
  );
}

function ArticleCard({ article }: { article: ReturnType<typeof articlesSorted>[number] }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)]"
    >
      <div className="text-xs text-[var(--muted)]">
        {formatDate(article.date)} · {readingMinutes(article)} min
      </div>
      <h3 className="mt-3 font-semibold tracking-tight group-hover:text-[var(--accent)]">
        {article.title}
      </h3>
      <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-[var(--muted)]">
        {article.excerpt}
      </p>
      <span className="mt-4 text-xs font-medium text-[var(--accent)]">
        Read article →
      </span>
    </Link>
  );
}
