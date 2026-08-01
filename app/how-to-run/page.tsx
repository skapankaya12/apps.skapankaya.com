import type { Metadata } from "next";
import Link from "next/link";
import { Section, Badge, ButtonLink } from "@/components/ui";
import { ScanDisclaimer } from "@/components/Disclaimer";
import { brand } from "@/lib/brand";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "How to run any app you buy",
  description:
    "A two-minute guide to running apps on your own machine, either with one command or by letting an AI assistant set it up for you.",
  alternates: { canonical: "/how-to-run" },
};

/**
 * "How do I actually run this?" is the objection that stops a non-technical
 * buyer, and it's exactly the kind of question people now ask an AI assistant
 * instead of a search box. HowTo markup makes the steps machine-readable so
 * that answer can cite us.
 */
const howToLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: `How to run any app you buy on ${brand.name}`,
  description:
    "Every app is a small folder you download and run on your own computer. Two ways to do it: one command, or let a free AI assistant set it up for you.",
  totalTime: "PT2M",
  step: [
    {
      "@type": "HowToStep",
      name: "Download and unzip the app",
      text: "After buying, download the app package from your library and unzip it. It's an ordinary folder on your own computer — nothing installs itself and nothing runs in the cloud.",
    },
    {
      "@type": "HowToStep",
      name: "Read the included guide",
      text: "Every app ships with a short setup guide that names what it needs (for example Node.js or Python) and the single command that starts it.",
    },
    {
      "@type": "HowToStep",
      name: "Run it — yourself or with an AI assistant",
      text: "If you're comfortable with a terminal, run the one command from the guide. If you'd rather not, open the folder in a free AI assistant such as Claude or Cursor and say \"set this up and run it\" — it reads the guide and does the rest.",
    },
  ],
};

export default function HowToRunPage() {
  return (
    <Section className="max-w-3xl py-16">
      <JsonLd data={howToLd} />
      <Badge tone="accent">Guide</Badge>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        How to run any app you buy
      </h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        Every app on {brand.name} is a small folder you download and run on your
        own computer. There are two ways to do it. Pick whichever fits you.
      </p>

      {/* Path A */}
      <div className="mt-12 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)]">
            A
          </span>
          <h2 className="text-xl font-semibold">The one-command way</h2>
        </div>
        <p className="mt-3 text-[var(--muted)]">
          Best if you&apos;re comfortable opening a terminal. Every app tells you
          its exact command on its page and in the included{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-sm">
            SETUP.md
          </code>{" "}
          file.
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <li>1. Download the app from your library and unzip it.</li>
          <li>2. Open the folder in your terminal.</li>
          <li>3. Paste the one command shown on the app&apos;s page. That&apos;s it.</li>
        </ol>
      </div>

      {/* Path B */}
      <div className="mt-6 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)]/40 p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-fg)]">
            B
          </span>
          <h2 className="text-xl font-semibold">The AI-assisted way (no coding)</h2>
        </div>
        <p className="mt-3 text-[var(--muted)]">
          Never touched a terminal? Let an AI assistant do the whole setup. You
          do this once, then every app you ever buy works the same way.
        </p>
        <ol className="mt-4 space-y-3 text-sm">
          <li>
            1. Install a coding assistant once. We recommend{" "}
            <span className="font-medium text-[var(--foreground)]">Claude Code</span> or{" "}
            <span className="font-medium text-[var(--foreground)]">Cursor</span>.
          </li>
          <li>2. Open the downloaded app folder in it.</li>
          <li>
            3. Type:{" "}
            <span className="rounded bg-[var(--foreground)] px-2 py-1 font-mono text-xs text-[var(--background)]">
              set this up and run it
            </span>
          </li>
          <li>
            4. The assistant reads the included setup file, installs what&apos;s
            needed, and starts the app for you.
          </li>
        </ol>
      </div>

      <div className="mt-8">
        <ScanDisclaimer />
      </div>

      <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
        <h3 className="font-semibold">Still stuck?</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          If an app won&apos;t run within 14 days of buying it, you get a full
          refund, no questions asked. Reach us through the{" "}
          <Link href="/about#contact" className="text-[var(--accent)] hover:underline">
            contact form
          </Link>
          .
        </p>
        <ButtonLink href="/browse" className="mt-4" variant="secondary" size="sm">
          Browse apps
        </ButtonLink>
      </div>
    </Section>
  );
}
