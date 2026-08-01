import Link from "next/link";

/**
 * Pre-launch status card, shown beside the hero.
 *
 * The marketplace is open to sellers before it's open to buyers: listings are
 * being collected one maker at a time while the internal screens get finished.
 * Anyone who lands here early should know that immediately rather than judging
 * an empty catalogue — and a maker being personally invited should see the
 * invitation reflected on the page they were sent to.
 *
 * Keep the wording honest. If the launch date moves, move it here.
 */
export function PreLaunchNotice() {
  return (
    <aside
      aria-label="Pre-launch status"
      className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-sm)] lg:max-w-none"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          Pre-launch · open to builders
        </span>
      </div>

      <h2 className="mt-3 text-base font-semibold tracking-tight">
        We&apos;re collecting listings right now.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        The marketplace is still being built — we&apos;re finishing the internal
        screens and gathering the first tools. For now it&apos;s open to solo
        builders who want to list what they made. The public launch is in{" "}
        <span className="font-medium text-[var(--foreground)]">September</span>.
      </p>

      <Link
        href="/sell"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
      >
        List your tool <span aria-hidden>→</span>
      </Link>
    </aside>
  );
}
