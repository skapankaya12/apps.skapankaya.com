import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import {
  articlesSorted,
  readingMinutes,
  formatDate,
  ARTICLE_TAGS,
  type ArticleTag,
} from "@/lib/articles";
import { Section, Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Insights: for indie makers and independent professionals",
  description:
    "Articles on building and selling small software, buying tools instead of bloated SaaS, local-first work, and getting found by Google and AI. Written for indie makers and solo professionals.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const activeTag = ARTICLE_TAGS.includes(tag as ArticleTag)
    ? (tag as ArticleTag)
    : null;

  const all = articlesSorted();
  const list = activeTag ? all.filter((a) => a.tag === activeTag) : all;
  const [lead, ...rest] = list;

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
            getting found by search and AI answers.
          </p>

          {/* Tag filter, as links so it stays crawlable */}
          <div className="mt-6 flex flex-wrap gap-2">
            <TagLink label="All" href="/blog" active={!activeTag} />
            {ARTICLE_TAGS.map((t) => (
              <TagLink
                key={t}
                label={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                active={activeTag === t}
              />
            ))}
          </div>
        </Section>
      </div>

      <Section className="py-12">
        {list.length === 0 ? (
          <p className="text-[var(--muted)]">No articles in this topic yet.</p>
        ) : (
          <div className="space-y-10">
            {/* Lead article */}
            {lead && <LeadCard article={lead} />}

            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
            )}
          </div>
        )}
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

function TagLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </Link>
  );
}

function LeadCard({ article }: { article: ReturnType<typeof articlesSorted>[number] }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition-all hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] sm:p-8"
    >
      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <Badge tone="accent">{article.tag}</Badge>
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
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Badge tone="neutral">{article.tag}</Badge>
        <span>{readingMinutes(article)} min</span>
      </div>
      <h3 className="mt-3 font-semibold tracking-tight group-hover:text-[var(--accent)]">
        {article.title}
      </h3>
      <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-[var(--muted)]">
        {article.excerpt}
      </p>
      <span className="mt-4 text-xs text-[var(--muted)]">
        {formatDate(article.date)}
      </span>
    </Link>
  );
}
