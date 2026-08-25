import type { ReactNode } from "react";

/* Form primitives shared by the seller submit form and the admin edit form, so
   a field looks the same whichever side of the marketplace is filling it in. */

export const inputClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

/**
 * Live character count for a capped field.
 *
 * The inputs have always carried `maxLength`, which stops typing without ever
 * mentioning that it has: the seller reaches the limit and the keyboard simply
 * goes dead. Showing the count turns a silent wall into a visible budget — and
 * it matters more now that text arrives by import, where the seller is editing
 * something already close to the cap rather than building up to it.
 */
function CharCount({ value, max }: { value: string; max: number }) {
  const used = value.length;
  const tone =
    used >= max
      ? "text-[var(--danger)]"
      : used >= max * 0.9
        ? "text-[var(--warning)]"
        : "text-[var(--muted)]";
  return (
    <span className={`tabular-nums text-xs ${tone}`}>
      {used}/{max}
    </span>
  );
}

/**
 * Where a value came from, when it wasn't typed here.
 *
 * Shown for exactly as long as the field still holds what was imported: the
 * seller edits it and the chip goes. That is the point of it — it marks the
 * fields nobody has read yet, so "review this" has somewhere to point.
 */
function SourceChip({ source }: { source: string }) {
  return (
    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
      from {source}
    </span>
  );
}

export function Field({
  label,
  hint,
  counter,
  source,
  children,
}: {
  label: string;
  hint?: string;
  /** Renders a live `used/max` count beside the label. */
  counter?: { value: string; max: number };
  /** Provenance label, e.g. "GitHub". Omit for anything the seller typed. */
  source?: string;
  children: ReactNode;
}) {
  const meta = source || counter;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium">{label}</label>
        {meta && (
          <span className="flex shrink-0 items-center gap-2">
            {source && <SourceChip source={source} />}
            {counter && <CharCount {...counter} />}
          </span>
        )}
      </div>
      {hint && <p className="mb-1.5 mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
      {!hint && <div className="mb-1.5" />}
      {children}
    </div>
  );
}

/**
 * A titled group of fields.
 *
 * The listing form asks for thirteen things and used to present them as one
 * undifferentiated column, which is what made it feel long rather than what it
 * actually is: four short groups. Naming the groups gives a seller somewhere to
 * stop, and a sense of how much is left, without hiding anything behind a
 * "next" button that the draft, validation and leave-warning would all have to
 * learn about.
 */
export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="border-b border-[var(--border)] pb-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {title}
        </h2>
        {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
