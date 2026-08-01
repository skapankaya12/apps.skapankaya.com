import Link from "next/link";
import type { ReactNode } from "react";
import { Section, Badge } from "./ui";

/**
 * Shared shell for Terms, Privacy and the Refund policy, so the three read as
 * one document set rather than three separately-written pages.
 *
 * These are working drafts written from how the marketplace actually operates.
 * They are not legal advice and haven't been reviewed by a lawyer — the banner
 * says so, and it stays until they have been.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  /** ISO date of the last substantive edit. */
  updated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <Section className="max-w-3xl py-14">
      <Badge tone="neutral">Legal</Badge>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Last updated{" "}
        {new Date(updated).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <p className="mt-5 text-lg leading-relaxed text-[var(--muted)]">{intro}</p>

      <div className="mt-6 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--muted)]">
        <strong className="text-[var(--foreground)]">Draft, pending review.</strong>{" "}
        These terms describe how the marketplace works today and are being
        finalised with a legal adviser before the public launch. If anything here
        is unclear or you disagree with it,{" "}
        <Link href="/about#contact" className="text-[var(--accent)] hover:underline">
          tell us
        </Link>{" "}
        — early sellers are shaping this.
      </div>

      <div className="mt-10 space-y-8">{children}</div>

      <div className="mt-14 flex flex-wrap gap-4 border-t border-[var(--border)] pt-6 text-sm">
        <Link href="/terms" className="text-[var(--muted)] hover:text-[var(--accent)]">
          Terms
        </Link>
        <Link href="/privacy" className="text-[var(--muted)] hover:text-[var(--accent)]">
          Privacy
        </Link>
        <Link href="/refunds" className="text-[var(--muted)] hover:text-[var(--accent)]">
          Refund policy
        </Link>
        <Link
          href="/about#contact"
          className="text-[var(--muted)] hover:text-[var(--accent)]"
        >
          Contact
        </Link>
      </div>
    </Section>
  );
}

/** One numbered section of a legal document. */
export function Clause({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[var(--muted)]">
        {children}
      </div>
    </section>
  );
}
