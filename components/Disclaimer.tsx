import type { ReactNode } from "react";

/**
 * The safety disclaimer the user asked for: we review & scan every package,
 * but we can't guarantee compatibility with, or safety on, a specific machine.
 * Shown on listing pages and at checkout.
 */
export function ScanDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <span aria-hidden className="mt-0.5 text-[var(--muted)]">
        <ShieldIcon />
      </span>
      <p className={`text-[var(--muted)] ${compact ? "text-xs" : "text-sm"} leading-relaxed`}>
        <strong className="text-[var(--foreground)] font-medium">
          Every tool is checked before it&apos;s listed.
        </strong>{" "}
        We run an automated security scan of the source code (flagging network
        calls, obfuscation, and data-exfiltration patterns), then a human
        reviews the results and the code by hand before approving. We
        can&apos;t guarantee compatibility with your setup, and you run
        downloaded software at your own risk &mdash; but nothing reaches the
        marketplace unreviewed.
      </p>
    </div>
  );
}

function ShieldIcon(): ReactNode {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
