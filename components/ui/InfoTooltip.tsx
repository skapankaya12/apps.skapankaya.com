"use client";

import { useId, useState } from "react";

/**
 * A small info icon that reveals a line of explanation.
 *
 * Opens on hover and on activation, not hover alone. A hover-only tooltip is
 * invisible on every touch device, and the things worth putting in one here are
 * disclosures, which are exactly the text a phone user should still be able to
 * reach. Tab-then-Enter reaches it too, because activating a <button> is a
 * click and the toggle below is on click.
 *
 * Hover and tap are tracked separately, and it is open when either says so.
 * One piece of state toggled by both does not work: pointing at the icon opens
 * it on mouseenter, and the click that follows a moment later toggles the same
 * flag straight back to closed, so the tooltip was unopenable by the single
 * most obvious gesture there is. A touch device never fires the hover half, so
 * `pinned` is the one that carries it there.
 *
 * The trigger is a real <button> with aria-describedby rather than a styled
 * span, so a screen reader announces the description with the control instead
 * of leaving it stranded elsewhere in the DOM.
 */
export function InfoTooltip({
  label,
  children,
}: {
  /** Accessible name for the trigger, e.g. "What we check". */
  label: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hovered || pinned;
  const id = useId();

  return (
    <span
      className="relative inline-flex align-middle"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setPinned((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setPinned(false);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-strong)] text-[11px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        i
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          /*
            Two positions, because one does not fit both.

            From `sm` up it hangs off the icon. Below that it is pinned to the
            bottom of the viewport instead: the trigger sits at the end of a
            line of text, so it can land anywhere across the width, and an
            absolutely positioned panel anchored to it ran off the right edge on
            a phone. Measuring the trigger and flipping would work too, and this
            needs no JS to be correct at every width.
          */
          className="fixed inset-x-4 bottom-4 z-30 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 text-left text-xs font-normal leading-relaxed text-[var(--muted)] shadow-[var(--shadow-sm)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-7 sm:w-80"
        >
          {children}
        </span>
      )}
    </span>
  );
}
