"use client";

import { useEffect, useRef, useState } from "react";
import { nextShift, STAGES, WALLPAPERS, type Wallpaper } from "@/lib/desktop";
import { LogoMark } from "./icons";
import { setPrefs, useClock, usePrefs } from "./hooks";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getAuthResolved, getBookmarks, logout } from "@/lib/store";
import {
  WIN_TITLES,
  type DeskActions,
  type Look,
  type Win,
  type WinKind,
} from "./types";

type Item =
  | {
      label: string;
      hint?: string;
      run?: () => void;
      href?: string;
      off?: boolean;
    }
  | "sep"
  | { group: string };

type Props = {
  actions: DeskActions;
  activeKind: WinKind | null;
  wins: Win[];
  look: Look;
  setLook: (l: Look) => void;
  wallpaper: Wallpaper;
  setWallpaper: (w: Wallpaper) => void;
  /** The clock opens the Notification Centre. */
  onClock: () => void;
  /** The bold name when no window is in front: a page's own name off the desktop. */
  appName?: string;
};

/**
 * The menu bar is the site's header. Our tiles in the corner, the focused
 * window's name in bold, then menus that do real things: every entry opens a
 * window or goes to a real page. No fake Wi-Fi or battery: a status icon that
 * means nothing on a shop would only be decoration.
 */
export function MenuBar({
  actions,
  activeKind,
  wins,
  look,
  setLook,
  wallpaper,
  setWallpaper,
  onClock,
  appName,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const now = useClock();
  const { noteShift, keepShift } = usePrefs();
  const user = useUser();
  const authKnown = useStoreValue(getAuthResolved);
  const saved = useStoreValue(() => getBookmarks().length);

  // The account, where the old header kept it. Pages that refuse to load in a
  // frame (account, dashboard, admin, sign in) are plain links that leave the
  // desktop; Library and Saved open in a window like everything else.
  const accountItems: Item[] = user
    ? [
        { group: user.displayName || user.email },
        { label: "Library", run: () => actions.openPage("/library") },
        { label: saved ? `Saved (${saved})` : "Saved", run: () => actions.openPage("/saved") },
        { label: "Account", href: "/account" },
        ...(user.role === "seller" || user.role === "admin" ? [{ label: "Seller dashboard", href: "/dashboard" }] : []),
        ...(user.role === "admin" ? [{ label: "Admin", href: "/admin" }] : []),
        "sep" as const,
        { label: "Sign out", run: () => void logout() },
      ]
    : [];
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const visible = wins.filter((w) => !w.min);
  const menus: {
    id: string;
    label: React.ReactNode;
    aria: string;
    bold?: boolean;
    items: Item[];
  }[] = [
    {
      id: "logo",
      label: <LogoMark size={15} />,
      aria: "The Solo Market",
      items: [
        { label: "About The Solo Market", run: () => actions.open("about") },
        "sep",
        { label: "Sell your tool…", run: () => actions.openPage("/sell") },
        { label: "Join the waitlist…", run: () => actions.open("waitlist") },
        "sep",
        { label: "Sign in", href: "/login" },
        { label: "Your account", href: "/account" },
      ],
    },
    {
      id: "app",
      label: activeKind ? WIN_TITLES[activeKind] : (appName ?? "The Solo Market"),
      aria: "Application",
      bold: true,
      items: [
        { label: "Search…", hint: "⌘K", run: actions.spotlight },
        { label: "Show all aisles", hint: "F4", run: actions.launchpad },
      ],
    },
    {
      id: "file",
      label: "File",
      aria: "File",
      items: [
        { label: "New Marketplace Window", run: () => actions.open("market") },
        {
          label: "Close Window",
          off: !activeKind,
          run: () => activeKind && actions.close(activeKind),
        },
      ],
    },
    {
      id: "aisles",
      label: "Aisles",
      aria: "Aisles",
      items: STAGES.flatMap((s) => [
        { group: s.label } as Item,
        ...s.aisles.map((a) => ({
          label: a.open ? a.label : `${a.label} · soon`,
          run: () => actions.openAisle(a.id),
        })),
      ]),
    },
    {
      id: "go",
      label: "Go",
      aria: "Go",
      items: [
        { label: "Library", run: () => actions.openPage("/library") },
        { label: "Saved", run: () => actions.openPage("/saved") },
        { label: "Blog", run: () => actions.openPage("/blog") },
        "sep",
        { label: "About", run: () => actions.openPage("/about") },
        { label: "Docs", run: () => actions.openPage("/docs") },
      ],
    },
    {
      id: "window",
      label: "Window",
      aria: "Window",
      items: [
        {
          label: "Minimise",
          off: !activeKind,
          run: () => activeKind && actions.minimise(activeKind),
        },
        {
          label: "Zoom",
          off: !activeKind,
          run: () => activeKind && actions.zoom(activeKind),
        },
        ...(visible.length ? (["sep"] as Item[]) : []),
        ...visible.map((w) => ({
          label: WIN_TITLES[w.kind],
          run: () => actions.focus(w.kind),
        })),
      ],
    },
    {
      id: "help",
      label: "Help",
      aria: "Help",
      items: [
        { label: "Suggest something to add…", run: () => actions.open("suggest") },
        "sep",
        {
          label: "How it works",
          run: () => actions.openPage("/docs/how-it-works"),
        },
        {
          label: "How to run a tool",
          run: () => actions.openPage("/how-to-run"),
        },
        { label: "Contact", run: () => actions.openPage("/about#contact") },
      ],
    },
  ];

  return (
    <div className="sm-menubar" ref={barRef} role="menubar">
      {menus.map((m, i) => (
        <div key={m.id} className={`sm-mb-slot${i > 3 ? " sm-mb-wide" : ""}`}>
          <button
            type="button"
            className={`sm-mb-btn${m.bold ? " is-bold" : ""}`}
            aria-label={m.aria}
            aria-haspopup="menu"
            aria-expanded={open === m.id}
            onClick={() => setOpen(open === m.id ? null : m.id)}
            onPointerEnter={() => open && open !== m.id && setOpen(m.id)}
          >
            {m.label}
          </button>
          {open === m.id && (
            <MenuList items={m.items} onDone={() => setOpen(null)} />
          )}
        </div>
      ))}

      <div className="sm-mb-right">
        {/* Nothing until Firebase has answered, so a signed-in visitor never
            sees "Sign in" flash first. */}
        {authKnown &&
          (user ? (
            <div className="sm-mb-slot">
              <button
                type="button"
                className="sm-mb-btn sm-mb-account"
                aria-label="Account"
                aria-haspopup="menu"
                aria-expanded={open === "acct"}
                onClick={() => setOpen(open === "acct" ? null : "acct")}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" />
                ) : (
                  <span>{(user.displayName || user.email).slice(0, 1).toUpperCase()}</span>
                )}
              </button>
              {open === "acct" && (
                <div className="sm-menu-right">
                  <MenuList items={accountItems} onDone={() => setOpen(null)} />
                </div>
              )}
            </div>
          ) : (
            <a className="sm-mb-btn" href="/login">
              Sign in
            </a>
          ))}
        <span className="sm-mb-status sm-mb-wide">Pre-launch</span>
        <button
          type="button"
          className="sm-mb-btn"
          aria-label="Search"
          onClick={actions.spotlight}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M7 12A5 5 0 1 1 7 2a5 5 0 0 1 0 10zm3.6-1.4L14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="sm-mb-slot">
          <button
            type="button"
            className="sm-mb-btn"
            aria-label="Control Centre"
            aria-haspopup="dialog"
            aria-expanded={open === "cc"}
            onClick={() => setOpen(open === "cc" ? null : "cc")}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
              <rect
                x="1"
                y="3"
                width="14"
                height="4"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="11" cy="5" r="1.4" fill="currentColor" />
              <rect
                x="1"
                y="9"
                width="14"
                height="4"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <circle cx="5" cy="11" r="1.4" fill="currentColor" />
            </svg>
          </button>
          {open === "cc" && (
            <div className="sm-cc" role="dialog" aria-label="Control Centre">
              <div className="sm-cc-mod">
                <div className="sm-cc-h">Appearance</div>
                <div className="sm-seg">
                  {(["auto", "light", "dark"] as Look[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={look === l}
                      onClick={() => setLook(l)}
                    >
                      {l === "auto" ? "Auto" : l === "light" ? "Light" : "Dark"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm-cc-mod">
                <div className="sm-cc-h">Wallpaper</div>
                <div className="sm-walls">
                  {WALLPAPERS.map((w) => (
                    <div key={w.id} className="sm-wall-cell">
                      <button
                        type="button"
                        className={`sm-wall-chip wall-${w.id}`}
                        aria-pressed={wallpaper === w.id}
                        onClick={() => setWallpaper(w.id)}
                      >
                        <span
                          aria-hidden="true"
                          style={
                            w.thumb
                              ? { backgroundImage: `url(${w.thumb})` }
                              : undefined
                          }
                        />
                        <span>{w.label}</span>
                      </button>
                      {/* Shuffle sits on the Daily note thumbnail itself, a
                          sibling of the chip rather than inside it, since a
                          button cannot hold a button. */}
                      {(w.id === "quotes" || w.id === "keepgoing") && (
                        <button
                          type="button"
                          className="sm-wall-shuffle"
                          aria-label={w.id === "quotes" ? "Shuffle the daily note" : "Shuffle Keep going"}
                          title="Shuffle"
                          onClick={() => {
                            setWallpaper(w.id);
                            if (w.id === "quotes") setPrefs({ noteShift: nextShift(noteShift) });
                            else setPrefs({ keepShift: keepShift + 1 });
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4.5h2.5c3 0 4 7 7 7H14M2 11.5h2.5c1.3 0 2.2-1.3 3-2.8M10 4.5h4M12 2.5l2 2-2 2M12 9.5l2 2-2 2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="sm-mb-btn sm-mb-clock"
          aria-label="Notification Centre"
          onClick={onClock}
          suppressHydrationWarning
        >
          {now && (
            <>
              <span className="sm-mb-wide">
                {now.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}{" "}
              </span>
              {now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function MenuList({ items, onDone }: { items: Item[]; onDone: () => void }) {
  return (
    <div className="sm-menu" role="menu">
      {items.map((it, i) => {
        if (it === "sep") return <hr key={i} />;
        if ("group" in it)
          return (
            <div key={i} className="sm-menu-group">
              {it.group}
            </div>
          );
        const body = (
          <>
            <span>{it.label}</span>
            {it.hint && <span className="sm-menu-hint">{it.hint}</span>}
          </>
        );
        return it.href ? (
          <a key={i} role="menuitem" href={it.href} onClick={onDone}>
            {body}
          </a>
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={it.off}
            onClick={() => {
              onDone();
              it.run?.();
            }}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
