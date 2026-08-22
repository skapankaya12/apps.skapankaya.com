import type { ReactNode } from "react";

/* Form primitives shared by the seller submit form and the admin edit form, so
   a field looks the same whichever side of the marketplace is filling it in. */

export const inputClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {hint && <p className="mb-1.5 mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
      {!hint && <div className="mb-1.5" />}
      {children}
    </div>
  );
}
