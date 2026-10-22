import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui";
import { VideoPromptGallery, type VideoPromptItem } from "@/components/VideoPromptGallery";
import snapshot from "@/lib/data/videoPrompts.json";

export const metadata: Metadata = {
  title: "Product video prompts",
  description:
    "Launch films, product demos, app previews, ads and logo reveals made by asking an AI to write the video as code, each with the prompt behind it and credited to whoever made it.",
  alternates: { canonical: "/video-prompts" },
};

/**
 * Product video prompts.
 *
 * Only prompts that make a video selling or showing a product, picked by hand
 * from three open source collections and sorted into groups by what the video
 * is for (scripts/video-prompts-picks.json). Built from a committed snapshot
 * (scripts/sync-video-prompts.mjs) rather than fetched live. Like /free,
 * nothing here is hosted, delivered or sold: every card credits its maker and
 * links out, and the page says where the collections come from.
 *
 * The awesome list's preview images are loaded from its own CDN, unlike
 * /free, which stores previews. Those are reviewed submissions whose image has
 * to stay the one approved; these are someone else's thumbnails of someone
 * else's work, and rehosting them would be the bigger liberty. The styles and
 * templates are stored, because their own licences cover the images.
 */
export default function VideoPromptsPage() {
  const { sources } = snapshot;
  const sourceLink = (s: { name: string; url: string }) => (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent)] hover:underline"
    >
      {s.name}
    </a>
  );

  return (
    <Section className="py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Product video prompts
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
          Launch films, demos, app previews, ads and logo reveals people made by
          asking an AI to write the video as code, with the prompts behind them.
          Pick one, swap in your product and make your own.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
          Collected from three open source projects: {sourceLink(sources.list)},{" "}
          {sourceLink(sources.style)} and the {sources.template.credit} templates
          in {sourceLink(sources.template)}. Every video belongs to whoever is
          credited under it. Looking for tools instead?{" "}
          <Link href="/free" className="text-[var(--accent)] hover:underline">
            See the free tools
          </Link>
          .
        </p>
      </header>

      <div className="mt-12">
        <VideoPromptGallery items={snapshot.items as VideoPromptItem[]} />
      </div>
    </Section>
  );
}
