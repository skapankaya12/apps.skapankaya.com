"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { nextShift, noteFor, type MarketUpdate, type ShelfItem } from "@/lib/desktop";
import { AppIcon, type Glyph } from "./icons";
import { setPrefs, useClock, usePrefs } from "./hooks";
import { intercept, type DeskActions } from "./types";

const ICON: Record<MarketUpdate["kind"], Glyph> = {
  listing: "market",
  free: "free",
  video: "video",
  blog: "blog",
};

function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * Opens from the clock, as on a Mac: notifications at the top, widgets below.
 *
 * The notifications are the market's own news: tools that went on sale, new
 * free tools, the latest article, the prompt library's last sync. It replaces
 * the "new this week" popup the rest of the site shows; on the desktop the
 * same news belongs here. The first card is the pre-launch notice with the
 * waitlist, which is the one thing a buyer can do before launch.
 */
export function NotificationCentre({
  updates,
  items,
  actions,
  onWaitlist,
  onClose,
}: {
  updates: MarketUpdate[];
  items: ShelfItem[];
  actions: DeskActions;
  onWaitlist: () => void;
  onClose: () => void;
}) {
  const now = useClock();
  const { noteShift } = usePrefs();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest(".sm-mb-clock")) onClose();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const t = now?.getTime() ?? 0;
  const counts = {
    tools: items.filter((i) => i.aisle === "tools").length,
    free: items.filter((i) => i.aisle === "free").length,
    video: items.filter((i) => i.aisle === "video").length,
  };

  function open(u: MarketUpdate) {
    onClose();
    if (u.href?.startsWith("http")) window.open(u.href, "_blank", "noopener");
    else if (u.href) actions.openPage(u.href);
  }

  return (
    <motion.aside
      ref={ref}
      className="sm-nc"
      aria-label="Notification Centre"
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 38 }}
    >
      <div className="sm-nc-head">
        <span>Notifications</span>
      </div>

      <div className="sm-nc-card">
        <AppIcon g="notes" size={36} />
        <div>
          <div className="sm-nc-row">
            <b>Buying opens at launch</b>
            <span>{now ? "now" : ""}</span>
          </div>
          <p>Makers are listing now. Join the waitlist to hear first.</p>
          <button
            type="button"
            className="sm-nc-act"
            onClick={() => {
              onClose();
              onWaitlist();
            }}
          >
            Join the waitlist
          </button>
        </div>
      </div>

      {updates.map((u) => (
        <a
          key={u.id}
          className="sm-nc-card"
          href={u.href ?? "#"}
          {...(u.href?.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          onClick={(e) => intercept(e, () => open(u))}
        >
          <AppIcon g={ICON[u.kind]} size={36} />
          <div>
            <div className="sm-nc-row">
              <b>{u.title}</b>
              <span>{now ? ago(u.at, t) : ""}</span>
            </div>
            <p>{u.body}</p>
          </div>
        </a>
      ))}

      <div className="sm-nc-widgets">
        {now && <CalendarWidget now={now} />}
        <div className="sm-widget sm-w-market">
          <div className="sm-w-title">The Solo Market</div>
          <dl>
            <div>
              <dt>Tools</dt>
              <dd>{counts.tools}</dd>
            </div>
            <div>
              <dt>Free tools</dt>
              <dd>{counts.free}</dd>
            </div>
            <div>
              <dt>Video prompts</dt>
              <dd>{counts.video}</dd>
            </div>
          </dl>
          <p>Pre-launch. Buying opens at the public launch.</p>
        </div>
        {now && (
          <div className="sm-widget sm-w-note">
            <div className="sm-w-row">
              <div className="sm-w-title">Today&apos;s note</div>
              <button type="button" className="sm-w-shuffle" onClick={() => setPrefs({ noteShift: nextShift(noteShift) })}>
                Shuffle
              </button>
            </div>
            <p>{noteFor(now, noteShift)}</p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

/** The month, Monday first, today circled in red. */
function CalendarWidget({ now }: { now: Date }) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  return (
    <div className="sm-widget sm-w-cal">
      <div className="sm-w-month">
        {now.toLocaleDateString(undefined, { month: "long" }).toUpperCase()}
      </div>
      <div className="sm-cal">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className={`sm-cal-h${i > 4 ? " is-we" : ""}`}>
            {d}
          </span>
        ))}
        {cells.map((d, i) => (
          <span
            key={i}
            className={`${d === now.getDate() ? "is-today" : ""}${i % 7 > 4 ? " is-we" : ""}`}
          >
            {d ?? ""}
          </span>
        ))}
      </div>
    </div>
  );
}
