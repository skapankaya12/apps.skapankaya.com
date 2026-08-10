"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS, docPath, type DocAudience } from "@/components/Docs";

/**
 * The docs table of contents. A client component so it can read the current
 * path and mark the active page — that keeps the layout able to render one
 * shared sidebar instead of every page passing its own slug down.
 */

const AUDIENCE_GROUPS: { audience: DocAudience; label: string }[] = [
  { audience: "start", label: "Start here" },
  { audience: "sellers", label: "For sellers" },
  { audience: "buyers", label: "For buyers" },
];

export function DocsSidebar() {
  const pathname = usePathname();

  const linkClass = (active: boolean) =>
    `block rounded-lg px-3 py-1.5 ${
      active
        ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
        : "text-[var(--foreground)]/80 hover:bg-[var(--surface-muted)]"
    }`;

  return (
    <nav aria-label="Documentation" className="text-sm">
      <Link href="/docs" className={linkClass(pathname === "/docs")}>
        Overview
      </Link>
      {AUDIENCE_GROUPS.map((group) => {
        const docs = DOCS.filter((d) => d.audience === group.audience);
        if (!docs.length) return null;
        return (
          <div key={group.audience} className="mt-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              {group.label}
            </p>
            <ul className="mt-2 space-y-0.5">
              {docs.map((d) => {
                const href = docPath(d.slug);
                const active = pathname === href;
                return (
                  <li key={d.slug}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={linkClass(active)}
                    >
                      {d.navLabel}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
