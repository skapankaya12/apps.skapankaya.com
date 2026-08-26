import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/lib/brand";
import {
  articles,
  getArticle,
  readingMinutes,
  formatDate,
  articlesSorted,
  type Block,
} from "@/lib/articles";
import { Section } from "@/components/ui";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) return { title: "Article not found" };
  return {
    title: a.title,
    description: a.excerpt,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt,
      publishedTime: a.date,
      authors: [a.author],
    },
    twitter: { card: "summary_large_image", title: a.title, description: a.excerpt },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const related = articlesSorted()
    .filter((a) => a.slug !== article.slug && a.tag === article.tag)
    .slice(0, 2);

  // Article structured data so Google and AI systems can attribute and quote it.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.date,
    author: { "@type": "Organization", name: article.author },
    publisher: {
      "@type": "Organization",
      name: brand.name,
      url: brand.url,
    },
    mainEntityOfPage: `${brand.url}/blog/${article.slug}`,
  };

  return (
    <Section className="max-w-2xl py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link href="/blog" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Blogs
      </Link>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
        <span>{formatDate(article.date)}</span>
        <span>·</span>
        <span>{readingMinutes(article)} min read</span>
      </div>

      <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {article.title}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
        {article.excerpt}
      </p>

      <article className="mt-8 space-y-5">
        {article.body.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </article>

      {/* Soft CTA back to the product */}
      <div className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
        <p className="font-medium">Find the tool this is about.</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {brand.name} is a marketplace of small tools you buy once and run on
          your own computer.
        </p>
        <Link
          href="/browse"
          className="mt-3 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Browse the marketplace →
        </Link>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold">More on {article.tag.toLowerCase()}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]"
              >
                <h3 className="text-sm font-semibold group-hover:text-[var(--accent)]">
                  {a.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="pt-3 text-xl font-semibold tracking-tight">{block.text}</h2>
      );
    case "p":
      return <p className="leading-relaxed text-[var(--foreground)]/85">{block.text}</p>;
    case "ul":
      return (
        <ul className="space-y-2 pl-1">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2.5 text-[var(--foreground)]/85">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="leading-relaxed">{it}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-[var(--accent)] pl-4 text-lg font-medium italic text-[var(--foreground)]">
          {block.text}
        </blockquote>
      );
  }
}
