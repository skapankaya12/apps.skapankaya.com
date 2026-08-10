import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { Badge } from "@/components/ui";
import { DOCS, docPath, type DocAudience } from "@/components/Docs";

export const metadata: Metadata = {
  title: "Documentation",
  description: `Everything a solo developer or a buyer needs to understand ${brand.name}: how the marketplace works, how to get your project live, the App Package standard, pricing and payouts, and how to run a tool you bought.`,
  alternates: { canonical: "/docs" },
};

const GROUPS: { audience: DocAudience; label: string; blurb: string }[] = [
  {
    audience: "start",
    label: "Start here",
    blurb: "The whole marketplace in one read.",
  },
  {
    audience: "sellers",
    label: "For sellers",
    blurb: "Turn a project you already built into a listing people can buy.",
  },
  {
    audience: "buyers",
    label: "For buyers",
    blurb: "What you're buying, how to run it, and what protects you.",
  },
];

export default function DocsIndexPage() {
  return (
    <div>
      <Badge tone="accent">Documentation</Badge>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        {brand.name}{" "}manual
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-[var(--muted)]">
        {brand.name}{" "}
        is a marketplace for small, finished software: a buyer pays
        once, downloads the tool, and runs it on their own computer — no
        subscription, no account to run it, no expiry. These pages explain the
        whole thing end to end, whether you&apos;re here to{" "}
        <Link href={docPath("selling")} className="text-[var(--accent)] hover:underline">
          list what you built
        </Link>{" "}
        or to{" "}
        <Link href={docPath("running-apps")} className="text-[var(--accent)] hover:underline">
          run something you bought
        </Link>
        .
      </p>

      {/* Two front-door paths */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href={docPath("selling")}
          className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--accent)]/50"
        >
          <span className="text-xs font-medium text-[var(--accent)]">For solo devs</span>
          <span className="mt-1 block text-lg font-semibold group-hover:text-[var(--accent)]">
            Get your project live →
          </span>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            From a folder on your laptop to a reviewed, buyable listing.
          </span>
        </Link>
        <Link
          href={docPath("running-apps")}
          className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--accent)]/50"
        >
          <span className="text-xs font-medium text-[var(--accent)]">For buyers</span>
          <span className="mt-1 block text-lg font-semibold group-hover:text-[var(--accent)]">
            Run an app you bought →
          </span>
          <span className="mt-1 block text-sm text-[var(--muted)]">
            One command, or let a free AI assistant set it up for you.
          </span>
        </Link>
      </div>

      {/* Full index */}
      {GROUPS.map((group) => {
        const docs = DOCS.filter((d) => d.audience === group.audience);
        if (!docs.length) return null;
        return (
          <section key={group.audience} className="mt-12">
            <h2 className="text-xl font-semibold tracking-tight">{group.label}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{group.blurb}</p>
            <ul className="mt-4 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
              {docs.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={docPath(d.slug)}
                    className="flex items-start justify-between gap-4 p-5 hover:bg-[var(--surface-muted)]"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{d.title}</span>
                      <span className="mt-0.5 block text-sm text-[var(--muted)]">
                        {d.summary}
                      </span>
                    </span>
                    <span className="shrink-0 pt-0.5 text-xs text-[var(--muted)]">
                      {d.minutes} min
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {/* For machines */}
      <div className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm text-[var(--muted)]">
        <span className="font-medium text-[var(--foreground)]">Reading this as an AI assistant?</span>{" "}
        There&apos;s a plain-text brief of the marketplace at{" "}
        <a href="/llms.txt" className="text-[var(--accent)] hover:underline">
          /llms.txt
        </a>
        , and every page here is written to be quoted directly.
      </div>
    </div>
  );
}
