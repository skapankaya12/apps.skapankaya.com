"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { nextShift,
  AISLES,
  STAGES,
  WALLPAPERS,
  type ShelfItem,
  type Wallpaper,
} from "@/lib/desktop";
import { AppIcon, FolderIcon, type Glyph } from "./icons";
import { GlassAisle } from "./GlassAisle";
import { setPrefs, usePrefs } from "./hooks";
import type { DeskActions } from "./types";
import { refreshEmailVerified, resendVerification } from "@/lib/store";

/** Our own pages that Spotlight and Launchpad can open. */
export const PAGES: { label: string; path: string; g: Glyph }[] = [
  { label: "About", path: "/about", g: "about" },
  { label: "Sell your tool", path: "/sell", g: "sell" },
  { label: "Blog", path: "/blog", g: "blog" },
  { label: "Library", path: "/library", g: "library" },
  { label: "Saved", path: "/saved", g: "saved" },
  { label: "Docs", path: "/docs", g: "pages" },
];

type Hit = {
  key: string;
  label: string;
  kind: string;
  run: () => void;
  icon: React.ReactNode;
};

/**
 * Spotlight: one box that searches everything on the desktop. Aisles, every
 * item on every shelf, and our own pages. Arrow keys move, Enter opens.
 */
export function Spotlight({
  items,
  actions,
  onClose,
}: {
  items: ShelfItem[];
  actions: DeskActions;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    const has = (s: string) => s.toLowerCase().includes(t);
    return [
      ...AISLES.filter((a) => has(a.label)).map((a) => ({
        key: `a-${a.id}`,
        label: a.label,
        kind: "Aisle",
        run: () => actions.openAisle(a.id),
        icon: <FolderIcon glyph={a.glyph} size={24} />,
      })),
      ...PAGES.filter((p) => has(p.label)).map((p) => ({
        key: `p-${p.path}`,
        label: p.label,
        kind: "Page",
        run: () => actions.openPage(p.path),
        icon: <AppIcon g={p.g} size={24} />,
      })),
      ...items
        .filter((i) => has(i.title) || has(i.blurb))
        .slice(0, 12)
        .map((i) => ({
          key: i.id,
          label: i.title,
          kind: AISLES.find((a) => a.id === i.aisle)?.label ?? "",
          run: () => actions.openItem(i),
          icon: <AppIcon g="market" size={24} />,
        })),
    ];
  }, [q, items, actions]);

  function go(h?: Hit) {
    if (!h) return;
    onClose();
    h.run();
  }

  return (
    <div className="sm-veil" onPointerDown={onClose}>
      <motion.div
        className="sm-spot"
        role="dialog"
        aria-label="Search"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="sm-spot-in">
          <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M7 12A5 5 0 1 1 7 2a5 5 0 0 1 0 10zm3.6-1.4L14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            id="sm-spotlight"
            ref={input}
            value={q}
            placeholder="Search the market"
            aria-label="Search the market"
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, hits.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              }
              if (e.key === "Enter") go(hits[sel]);
            }}
          />
        </div>
        {hits.length > 0 && (
          <ul className="sm-spot-list" role="listbox">
            {hits.map((h, i) => (
              <li key={h.key} role="option" aria-selected={i === sel}>
                <button
                  type="button"
                  className={i === sel ? "is-sel" : ""}
                  onPointerEnter={() => setSel(i)}
                  onClick={() => go(h)}
                >
                  {h.icon}
                  <span className="sm-spot-l">{h.label}</span>
                  <span className="sm-spot-k">{h.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {q.trim() && hits.length === 0 && (
          <p className="sm-spot-none">Nothing here by that name yet.</p>
        )}
      </motion.div>
    </div>
  );
}

/** Every aisle and page at once, laid out by stage. */
export function Launchpad({
  actions,
  items,
  onClose,
}: {
  actions: DeskActions;
  items: ShelfItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <motion.div
      className="sm-pad"
      role="dialog"
      aria-label="All aisles"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClose}
    >
      <div className="sm-pad-inner" onClick={(e) => e.stopPropagation()}>
        {STAGES.map((s) => (
          <section key={s.label}>
            <h2>{s.label}</h2>
            <div className="sm-pad-row">
              {s.aisles.map((a, i) => (
                // Full-size glass folders: click one open and the aisle's
                // items rise out of it; choose one to see it in Quick Look.
                <GlassAisle
                  key={a.id}
                  aisle={a}
                  items={items}
                  mode="card"
                  tone="dark"
                  width={220}
                  delay={i * 90}
                  onOpenAisle={(id) => {
                    onClose();
                    actions.openAisle(id);
                  }}
                  onItem={(item) => {
                    onClose();
                    actions.openItem(item);
                  }}
                />
              ))}
            </div>
          </section>
        ))}
        <section>
          <h2>Pages</h2>
          <div className="sm-pad-row">
            {PAGES.map((p) => (
              <button
                key={p.path}
                type="button"
                className="sm-pad-i"
                onClick={() => {
                  onClose();
                  actions.openPage(p.path);
                }}
              >
                <AppIcon g={p.g} size={80} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export function ContextMenu({
  at,
  actions,
  setWallpaper,
  onClose,
}: {
  at: { x: number; y: number };
  actions: DeskActions;
  setWallpaper: (w: Wallpaper) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [onClose]);

  const prefs = usePrefs();
  const run = (f: () => void) => () => {
    onClose();
    f();
  };
  return (
    <div
      className="sm-menu sm-ctx"
      role="menu"
      style={{
        left: Math.min(
          at.x,
          (typeof window !== "undefined" ? window.innerWidth : 1200) - 240,
        ),
        top: at.y,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        onClick={run(() => actions.open("market"))}
      >
        New Marketplace Window
      </button>
      <button type="button" role="menuitem" onClick={run(actions.launchpad)}>
        Show all aisles
      </button>
      <hr />
      <div className="sm-menu-group">Wallpaper</div>
      {WALLPAPERS.map((w) => (
        <button
          key={w.id}
          type="button"
          role="menuitem"
          onClick={run(() => setWallpaper(w.id))}
        >
          {w.label}
        </button>
      ))}
      {(prefs.wallpaper === "quotes" || prefs.wallpaper === "keepgoing") && (
        <button
          type="button"
          role="menuitem"
          onClick={run(() =>
            prefs.wallpaper === "quotes"
              ? setPrefs({ noteShift: nextShift(prefs.noteShift) })
              : setPrefs({ keepShift: prefs.keepShift + 1 }),
          )}
        >
          Shuffle wallpaper
        </button>
      )}
      <hr />
      <button
        type="button"
        role="menuitem"
        onClick={run(() => actions.open("about"))}
      >
        About The Solo Market
      </button>
    </div>
  );
}

/**
 * The one notification. It carries the only buyer action there is before
 * launch, the waitlist, which the old homepage held in its pre-launch card.
 */
export function Notice({
  onWaitlist,
  onClose,
}: {
  onWaitlist: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="sm-note"
      role="status"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 26 }}
    >
      <AppIcon g="notes" size={38} />
      <div>
        <div className="sm-note-head">
          <b>Buying opens at launch</b>
          <span>now</span>
        </div>
        <p>Makers are listing now. Join the waitlist to hear first.</p>
        <button type="button" className="sm-note-act" onClick={onWaitlist}>
          Join the waitlist
        </button>
      </div>
      <button
        type="button"
        className="sm-note-x"
        aria-label="Dismiss"
        onClick={onClose}
      >
        ✕
      </button>
    </motion.div>
  );
}

/**
 * The verify-your-email reminder, as a notification. The rest of the site
 * shows VerifyEmailBanner across the top of the page; on the desktop the same
 * reminder arrives the way any app's would, with the same two actions.
 */
export function VerifyNotice({ email, onClose }: { email: string; onClose: () => void }) {
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "error">("idle");
  async function run(task: () => Promise<unknown>, done: "sent" | "idle") {
    setStatus("busy");
    try {
      await task();
      setStatus(done);
    } catch {
      setStatus("error");
    }
  }
  return (
    <motion.div
      className="sm-note"
      role="status"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 26 }}
    >
      <AppIcon g="notes" size={38} />
      <div>
        <div className="sm-note-head">
          <b>Please verify your email</b>
          <span>now</span>
        </div>
        <p>
          {status === "sent"
            ? "Sent. Check your inbox and spam."
            : status === "error"
              ? "That did not work. Try again shortly."
              : `We sent a link to ${email}.`}
        </p>
        <div className="sm-note-btns">
          <button type="button" className="sm-note-act" disabled={status === "busy"} onClick={() => run(refreshEmailVerified, "idle")}>
            I&apos;ve verified
          </button>
          <button type="button" className="sm-note-act" disabled={status === "busy"} onClick={() => run(resendVerification, "sent")}>
            Resend email
          </button>
        </div>
      </div>
      <button type="button" className="sm-note-x" aria-label="Dismiss" onClick={onClose}>
        ✕
      </button>
    </motion.div>
  );
}
