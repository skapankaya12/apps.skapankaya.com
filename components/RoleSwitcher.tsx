"use client";

import { useUser } from "@/lib/hooks";
import { setRole } from "@/lib/store";
import type { Role } from "@/lib/types";

/**
 * DEMO ONLY. Lets you flip the signed-in user between buyer / seller / admin
 * to preview every view without creating separate accounts. Remove this
 * component once real Firebase Auth + role claims are wired.
 */
export function RoleSwitcher() {
  const user = useUser();
  if (!user) return null;
  const roles: Role[] = ["buyer", "seller", "admin"];

  return (
    <div className="hidden items-center gap-1 rounded-lg border border-dashed border-[var(--border-strong)] p-0.5 lg:flex">
      <span className="px-1.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
        view as
      </span>
      {roles.map((r) => (
        <button
          key={r}
          onClick={() => setRole(r)}
          className={`rounded-md px-2 py-1 text-xs capitalize transition-colors ${
            user.role === r
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "text-[var(--muted)] hover:bg-[var(--surface-muted)]"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
