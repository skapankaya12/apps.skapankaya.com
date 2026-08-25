import { brand } from "@/lib/brand";
import { WaitlistForm } from "./WaitlistForm";

/**
 * Pre-launch status card, shown beside the hero.
 *
 * Written for a buyer. A maker who lands here already has three ways to /sell
 * (the navbar button, the button above the listings, the footer), so the card
 * used to spend its whole body repeating an invitation they had already
 * accepted. What only this card can say is the thing a buyer would otherwise
 * discover at checkout: the catalogue is thin because it is still being
 * collected, and buying is not open yet.
 *
 * Keep the wording honest. If the launch date moves, move it here.
 */
export function PreLaunchNotice() {
  return (
    <aside
      aria-label="Pre-launch status"
      className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 text-left shadow-[var(--shadow-sm)] xl:max-w-none"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          Pre-launch · opening soon
        </span>
      </div>

      {/* A question, because the card is now addressed to one person rather
          than announcing a status to the room. */}
      <h2 className="mt-3 text-base font-semibold tracking-tight">
        Looking to buy?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        {brand.name} is collecting its best tools right now. Stay tuned: buying
        opens at the{" "}
        <span className="font-medium text-[var(--foreground)]">
          public launch
        </span>
        .
      </p>

      {/* Only the form is interactive; the copy above stays server-rendered.
          It is the card's only call to action now, so it sits closer. */}
      <div className="mt-4 border-t border-[var(--border)] pt-1">
        <WaitlistForm />
      </div>
    </aside>
  );
}
