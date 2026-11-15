import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blogs: for indie makers and independent professionals",
  description:
    "Articles on building and selling small software, buying tools instead of bloated SaaS, subscription fatigue, and local-first work. Written for indie makers and solo professionals.",
  alternates: {
    canonical: "/blog",
    // Advertises the feed in <head> so readers and crawlers find it.
    types: { "application/rss+xml": "/blog/rss.xml" },
  },
};

/**
 * The blog index, now the feed opened on Blog. Its heading and line are the
 * Blog opening in components/FeedHero.tsx; each post still has its own page
 * at /blog/[slug], and the RSS feed is unchanged.
 */
export default function BlogPage() {
  return (
    <>
      <h1 className="sr-only">Blog</h1>
      <FeedPage kind="article" />
    </>
  );
}
