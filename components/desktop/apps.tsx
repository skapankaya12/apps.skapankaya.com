"use client";

import { useRef, useState, type ReactNode } from "react";
import { brand, copy } from "@/lib/brand";
import { STAGES, aisleById, type AisleId, type ShelfItem } from "@/lib/desktop";
import { CataloguePause } from "@/components/CataloguePause";
import { PreLaunchNotice } from "@/components/PreLaunchNotice";
import { ContactForm } from "@/components/ContactForm";
import { AisleSymbol, AppIcon, Chevron, FolderIcon, Magnifier } from "./icons";
import { intercept, type DeskActions } from "./types";

/** A plain title bar: the lights on the left, the title in the middle. */
export function TitleBar({
  title,
  right,
}: {
  title?: string;
  right?: ReactNode;
}) {
  return (
    <div className="sm-titlebar" data-drag>
      <span className="sm-titlebar-t">{title}</span>
      {right && <span className="sm-titlebar-r">{right}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marketplace: the Finder of this desktop                             */
/* ------------------------------------------------------------------ */

type Place = { aisle: AisleId; sub: string | null };

/** One item on a shelf: its picture, its name, and its price or address. */
function ShelfTile({
  it,
  picked,
  onPick,
  actions,
}: {
  it: ShelfItem;
  picked: boolean;
  onPick: () => void;
  actions: DeskActions;
}) {
  return (
    <a
      className={`sm-item${picked ? " is-picked" : ""}${it.iconOnly ? " is-icon" : ""}`}
      href={it.href}
      {...(it.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={(e) =>
        intercept(e, () => {
          onPick();
          actions.openItem(it);
        })
      }
    >
      <span className="sm-thumb">
        {it.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.image} alt="" loading="lazy" />
        ) : (
          <AppIcon g="market" size={72} />
        )}
      </span>
      <span className="sm-iname">{it.title}</span>
      <span className={`sm-price${it.price === "Free" ? " is-free" : ""}`}>{it.price}</span>
    </a>
  );
}

/**
 * Laid out like a Finder window: a see-through sidebar running the full
 * height with the lights at its top, a toolbar over the content with the
 * folder's name, and icons on white. Aisles are grouped by the stage of a
 * founder's year. Every item is a real link, so the server HTML is a
 * catalogue a crawler can read.
 *
 * An aisle with subfolders (Useful websites, Video prompts) opens on its
 * pinned items and a folder for each subfolder, the subfolders also listed
 * under it in the sidebar. A search looks through the whole aisle.
 */
export function Marketplace({
  aisle,
  sub,
  onSub,
  items,
  paused,
  actions,
}: {
  aisle: AisleId;
  /** The open subfolder, or null for the aisle itself. */
  sub: string | null;
  onSub: (sub: string | null) => void;
  items: ShelfItem[];
  paused: boolean;
  actions: DeskActions;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [history, setHistory] = useState<{ back: Place[]; fwd: Place[] }>({ back: [], fwd: [] });
  const current = aisleById(aisle);
  // Subfolders with nothing in them stay hidden until something arrives.
  const hasItems = (aisleId: AisleId, subId: string) => items.some((i) => i.aisle === aisleId && i.sub === subId);
  const subs = (current.subs ?? []).filter((sf) => hasItems(aisle, sf.id));
  const subLabel = subs.find((s) => s.id === sub)?.label;
  const inAisle = items.filter((i) => i.aisle === aisle);
  const q = query.trim().toLowerCase();
  const matches = inAisle.filter((i) => `${i.title} ${i.blurb}`.toLowerCase().includes(q));
  // The aisle's front page: pinned items and its subfolders. Shown when it
  // has subfolders, none is open, and nothing is being searched for.
  const overview = subs.length > 0 && !sub && !q;
  const shelf = q ? matches : sub ? inAisle.filter((i) => i.sub === sub) : inAisle;
  const pinned = inAisle.filter((i) => i.pinned);
  const pausedHere = aisle === "tools" && paused;

  function go(to: Place) {
    if (to.aisle === aisle && to.sub === sub) return;
    setHistory((h) => ({ back: [...h.back, { aisle, sub }], fwd: [] }));
    setQuery("");
    if (to.aisle !== aisle) actions.openAisle(to.aisle);
    onSub(to.sub);
  }
  function jump(to: Place) {
    if (to.aisle !== aisle) actions.openAisle(to.aisle);
    onSub(to.sub);
  }

  const count = overview ? inAisle.length : shelf.length;

  return (
    <div className="sm-finder">
      <nav className="sm-side" aria-label="Aisles">
        <div className="sm-side-top" data-drag />
        {STAGES.map((s) => (
          <div key={s.label} className="sm-side-group">
            <div className="sm-side-h">{s.label}</div>
            {s.aisles.map((a) => (
              <div key={a.id}>
                <a
                  href={a.href}
                  className={`sm-side-i${a.id === aisle && !sub ? " is-on" : ""}${a.open ? "" : " is-soon"}`}
                  aria-current={a.id === aisle && !sub ? "page" : undefined}
                  onClick={(e) => intercept(e, () => go({ aisle: a.id, sub: null }))}
                >
                  <AisleSymbol name={a.glyph} size={16} className="sm-side-sym" />
                  {a.label}
                </a>
                {a.id === aisle && a.subs && (
                  <div className="sm-side-subs">
                    {a.subs.filter((sf) => hasItems(a.id, sf.id)).map((sf) => (
                      <a
                        key={sf.id}
                        href={a.href}
                        className={`sm-side-i sm-side-sub${sub === sf.id ? " is-on" : ""}`}
                        aria-current={sub === sf.id ? "page" : undefined}
                        onClick={(e) => intercept(e, () => go({ aisle: a.id, sub: sf.id }))}
                      >
                        <svg width="14" height="12" viewBox="0 0 16 13" aria-hidden="true" className="sm-side-sym">
                          <path d="M1 3a2 2 0 0 1 2-2h3.2l1.6 1.6H13a2 2 0 0 1 2 2V10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2z" fill="currentColor" opacity=".9" />
                        </svg>
                        {sf.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="sm-pane">
        <div className="sm-toolbar" data-drag>
          <div className="sm-nav">
            <button
              type="button"
              aria-label="Back"
              disabled={!history.back.length && !sub}
              onClick={() => {
                const prev = history.back[history.back.length - 1];
                if (!prev) return onSub(null); // up from a subfolder to its aisle
                setHistory((h) => ({ back: h.back.slice(0, -1), fwd: [{ aisle, sub }, ...h.fwd] }));
                jump(prev);
              }}
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              aria-label="Forward"
              disabled={!history.fwd.length}
              onClick={() => {
                const next = history.fwd[0];
                setHistory((h) => ({ back: [...h.back, { aisle, sub }], fwd: h.fwd.slice(1) }));
                jump(next);
              }}
            >
              <Chevron dir="right" />
            </button>
          </div>
          <h2 className="sm-toolbar-t">
            {subLabel ? (
              <>
                <button type="button" className="sm-crumb-up" onClick={() => go({ aisle, sub: null })}>
                  {current.label}
                </button>
                <span className="sm-crumb-sep" aria-hidden="true">›</span>
                {subLabel}
              </>
            ) : (
              current.label
            )}
          </h2>
          {current.open && !pausedHere && (
            <label className="sm-search">
              <Magnifier size={13} />
              <input
                id="sm-shelf-search"
                type="search"
                placeholder="Search"
                aria-label={`Search ${current.label}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          )}
        </div>

        <div className="sm-content" onPointerDown={(e) => e.target === e.currentTarget && setPicked(null)}>
          {pausedHere ? (
            <div className="sm-empty sm-empty-pause">
              <CataloguePause />
            </div>
          ) : !current.open ? (
            <div className="sm-empty">
              <FolderIcon glyph={current.glyph} size={96} />
              <h3>{current.label} is being stocked</h3>
              <p>This aisle opens soon. Tell us what you would want to find here.</p>
              <a href="/about#contact" onClick={(e) => intercept(e, () => actions.open("suggest"))}>
                Suggest something
              </a>
            </div>
          ) : overview ? (
            <div className="sm-overview">
              {pinned.length > 0 && (
                <section>
                  <h3 className="sm-sec-h">Pinned</h3>
                  <ul className="sm-pins">
                    {pinned.map((it) => (
                      <li key={it.id}>
                        <a
                          className="sm-pin"
                          href={it.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => intercept(e, () => actions.openItem(it))}
                        >
                          {it.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image} alt="" />
                          )}
                          <span>
                            <b>{it.title}</b>
                            <small>{it.blurb}</small>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h3 className="sm-sec-h">Folders</h3>
                <ul className="sm-grid">
                  {subs.map((sf) => {
                    const n = inAisle.filter((i) => i.sub === sf.id).length;
                    return (
                      <li key={sf.id}>
                        <button type="button" className="sm-item" onClick={() => go({ aisle, sub: sf.id })}>
                          <span className="sm-thumb">
                            <FolderIcon size={66} />
                          </span>
                          <span className="sm-iname">{sf.label}</span>
                          <span className="sm-price">
                            {n} {n === 1 ? "item" : "items"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          ) : shelf.length === 0 ? (
            <div className="sm-empty">
              <FolderIcon glyph={current.glyph} size={96} />
              <h3>{q ? "No results" : "This folder is empty"}</h3>
              <p>{q ? "Try another word." : "New things land here as they are approved."}</p>
            </div>
          ) : (
            <ul className="sm-grid">
              {shelf.map((it) => (
                <li key={it.id}>
                  <ShelfTile it={it} picked={picked === it.id} onPick={() => setPicked(it.id)} actions={actions} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="sm-pathbar">
          <span>
            {current.open && !pausedHere ? `${count} ${count === 1 ? "item" : "items"}` : "Opening soon"}
          </span>
          <span>{aisle === "sites" ? "Hand-picked, no affiliate links" : "Paid once, yours forever"}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quick Look                                                          */
/* ------------------------------------------------------------------ */

export function QuickLook({
  item,
  actions,
}: {
  item: ShelfItem;
  actions: DeskActions;
}) {
  const external = item.href.startsWith("http");
  const button = external ? (
    <a
      className="sm-btn"
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
    >
      Visit site
    </a>
  ) : (
    <a
      className="sm-btn"
      href={item.href}
      onClick={(e) => intercept(e, () => actions.openPage(item.href))}
    >
      {item.price === "Free" ? "Open" : `Get · ${item.price}`}
    </a>
  );
  return (
    <>
      <TitleBar title={item.title} right={button} />
      <div className="sm-look">
        <div className={`sm-look-shot${item.iconOnly ? " is-icon" : ""}`}>
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={`${item.title} preview`} />
          ) : (
            <AppIcon g="market" size={96} />
          )}
        </div>
        <div className="sm-look-txt">
          <h2>{item.title}</h2>
          {item.blurb && <p>{item.blurb}</p>}
          <p className="sm-look-facts">
            {item.facts}
            {item.by ? ` · by ${item.by}` : ""}
          </p>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Pages: our own site, inside a browser window                        */
/* ------------------------------------------------------------------ */

/** Pages that cannot work inside a frame: sign-in popups and Stripe both refuse it. */
const TOP_LEVEL = ["/login", "/checkout", "/account"];

/**
 * Our own pages in a browser-style window. Same origin, so the address bar can
 * follow the frame, and AppShell hides the site's header and footer inside it.
 */
export function WebView({
  path,
  onPath,
}: {
  path: string;
  onPath: (title: string, path: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [shown, setShown] = useState(path);

  function loaded() {
    const w = frame.current?.contentWindow;
    if (!w) return;
    try {
      const p = w.location.pathname + w.location.search + w.location.hash;
      // The desktop inside its own window would be a hall of mirrors.
      if (w.location.pathname === "/") {
        w.location.replace("/marketplace");
        return;
      }
      if (TOP_LEVEL.some((t) => w.location.pathname.startsWith(t))) {
        window.location.href = p;
        return;
      }
      setShown(p);
      onPath(w.document.title.split(" · ")[0] || "Pages", p);
    } catch {
      /* cross-origin: a link left the site. Nothing to read. */
    }
  }

  return (
    <div className="sm-web">
      <div className="sm-toolbar sm-web-bar" data-drag>
        <div className="sm-nav">
          <button
            type="button"
            aria-label="Back"
            onClick={() => frame.current?.contentWindow?.history.back()}
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label="Forward"
            onClick={() => frame.current?.contentWindow?.history.forward()}
          >
            <Chevron dir="right" />
          </button>
        </div>
        <div className="sm-addr" title={`${brand.domain}${shown}`}>
          <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
            <rect
              x="1"
              y="5"
              width="8"
              height="6.5"
              rx="1.5"
              fill="currentColor"
            />
            <path
              d="M2.8 5V3.6a2.2 2.2 0 0 1 4.4 0V5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
          <span>{brand.domain}</span>
          <span className="sm-addr-path">{shown === "/" ? "" : shown}</span>
        </div>
        <a
          className="sm-tool-btn"
          href={shown}
          target="_blank"
          rel="noopener"
          aria-label="Open in a new tab"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2h4v4M12 2L6.5 7.5M10 8.5V12H2V4h3.5" />
          </svg>
        </a>
      </div>
      <iframe ref={frame} src={path} title="Page" onLoad={loaded} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small windows                                                       */
/* ------------------------------------------------------------------ */

export function About({ actions }: { actions: DeskActions }) {
  return (
    <>
      <TitleBar />
      <div className="sm-about">
        <AppIcon g="about" size={104} />
        <h2>{brand.name}</h2>
        <p className="sm-about-ver">Pre-launch</p>
        <p>
          {copy.heroSub} <b>{copy.heroSubAccent}</b>
        </p>
        <div className="sm-about-btns">
          <a
            className="sm-btn sm-btn-plain"
            href="/about"
            onClick={(e) => intercept(e, () => actions.openPage("/about"))}
          >
            More about us
          </a>
          <a
            className="sm-btn sm-btn-plain"
            href="/sell"
            onClick={(e) => intercept(e, () => actions.openPage("/sell"))}
          >
            Sell your tool
          </a>
        </div>
      </div>
    </>
  );
}

/** The Trash, renamed. Empty, because nothing here renews. */
export function Bin() {
  return (
    <>
      <TitleBar
        title="Subscriptions"
        right={
          <button type="button" className="sm-btn sm-btn-plain" disabled>
            Empty
          </button>
        }
      />
      <div className="sm-content">
        <div className="sm-empty">
          <h3>Subscriptions</h3>
          <p>This folder is empty. Nothing in this market renews.</p>
        </div>
      </div>
    </>
  );
}

export function Waitlist() {
  return (
    <>
      <TitleBar title="Waitlist" />
      <div className="sm-waitlist">
        <PreLaunchNotice />
      </div>
    </>
  );
}

/**
 * Suggest something to add: the site's own contact form, opened on the
 * suggestion topic. The same form, the same route, the same Google Sheet;
 * only the starting topic differs.
 */
export function Suggest() {
  return (
    <>
      <TitleBar title="Suggest something" />
      <div className="sm-waitlist">
        <ContactForm initialTopic="suggest" />
      </div>
    </>
  );
}
