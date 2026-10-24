"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LIGHT_WALLPAPERS, aisleById, type MarketUpdate, type ShelfItem } from "@/lib/desktop";
import { MenuBar } from "./MenuBar";
import { Dock, type DockEntry } from "./Dock";
import { DeskFooter } from "./DeskFooter";
import { Wallpaper } from "./Wallpaper";
import { AppIcon, BinIcon } from "./icons";
import { setPrefs, usePrefs } from "./hooks";
import type { DeskActions } from "./types";
import { NotificationCentre } from "./NotificationCentre";
import { Spotlight } from "./overlays";
import { TitleBar, Waitlist } from "./apps";

type Feed = { items: ShelfItem[]; updates: MarketUpdate[] };
/** Fetched once per visit, the first time search or the clock is opened. */
let feedPromise: Promise<Feed> | null = null;
function loadFeed(): Promise<Feed> {
  feedPromise ??= fetch("/api/desktop")
    .then((r) => (r.ok ? (r.json() as Promise<Feed>) : { items: [], updates: [] }))
    .catch(() => {
      feedPromise = null;
      return { items: [], updates: [] };
    });
  return feedPromise;
}

/** The window title for a page, from the first part of its address. */
const TITLES: Record<string, string> = {
  marketplace: "Marketplace",
  app: "Marketplace",
  free: "Free & open source",
  "video-prompts": "Video prompts",
  blog: "Blog",
  about: "About",
  docs: "Docs",
  sell: "Sell your tool",
  seller: "Seller",
  "how-to-run": "How to run a tool",
  library: "Library",
  saved: "Saved",
  cart: "Cart",
  checkout: "Checkout",
  account: "Account",
  dashboard: "Seller dashboard",
  admin: "Admin",
  login: "Sign in",
  terms: "Terms",
  privacy: "Privacy",
  refunds: "Refunds",
};

/**
 * Every page except the homepage: the same desktop, with the page as a window.
 *
 * The menu bar, wallpaper, Dock and footer strip are the desktop's own, so
 * moving between the homepage and any page feels like one computer. Here they
 * navigate rather than open windows: there is only ever one window, the page.
 * Its close and minimise lights go back to the desktop; zoom widens it to the
 * full screen. Inside the window each page keeps its own design.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { look, wallpaper } = usePrefs();
  const [wide, setWide] = useState(false);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [panel, setPanel] = useState<"spot" | "centre" | "waitlist" | null>(null);

  // Search and the Notification Centre open in place, as on the desktop.
  // Their data is the homepage's, fetched the first time either is opened.
  const show = useCallback((p: "spot" | "centre") => {
    setPanel((cur) => (cur === p ? null : p));
    loadFeed().then(setFeed);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        show("spot");
      } else if (e.key === "Escape") {
        setPanel(null);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [show]);
  const section = pathname.split("/")[1] ?? "";
  const title = TITLES[section] ?? "The Solo Market";

  const actions = useMemo<DeskActions>(() => {
    const go = (path: string) => router.push(path);
    return {
      openAisle: (id) => go(aisleById(id).href),
      openItem: (item) => (item.href.startsWith("http") ? window.open(item.href, "_blank", "noopener") : go(item.href)),
      openPage: go,
      open: (kind) => go(kind === "about" ? "/about" : kind === "market" ? "/marketplace" : kind === "suggest" ? "/about#contact" : "/"),
      close: () => go("/"),
      minimise: () => go("/"),
      zoom: () => setWide((w) => !w),
      focus: () => {},
      spotlight: () => show("spot"),
      launchpad: () => go("/"),
    };
  }, [router, show]);

  const here = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  const link = (key: string, label: string, href: string, icon: ReactNode): DockEntry => ({
    kind: "app",
    key,
    label,
    href,
    icon,
    running: here(href),
    onOpen: () => router.push(href),
  });
  const dock: DockEntry[] = [
    link("market", "Marketplace", "/marketplace", <AppIcon g="market" />),
    link("desk", "Desktop", "/", <AppIcon g="launchpad" />),
    link("about", "About", "/about", <AppIcon g="pages" />),
    link("free", "Free & open source", "/free", <AppIcon g="free" />),
    link("video", "Video prompts", "/video-prompts", <AppIcon g="video" />),
    link("blog", "Blog", "/blog", <AppIcon g="blog" />),
    link("sell", "Sell your tool", "/sell", <AppIcon g="sell" />),
    { kind: "sep", key: "s1" },
    link("library", "Library: what you own", "/library", <AppIcon g="library" />),
    link("saved", "Saved", "/saved", <AppIcon g="saved" />),
    { kind: "sep", key: "s2" },
    link("bin", "Subscriptions: where monthly bills go", "/", <BinIcon />),
  ];

  return (
    <div className={`sm-site wall-${wallpaper}${LIGHT_WALLPAPERS.includes(wallpaper) ? " wall-light" : ""}`} data-look={look}>
      <div data-site-chrome>
        <Wallpaper id={wallpaper} />
        <MenuBar
          actions={actions}
          activeKind={null}
          appName={title}
          wins={[]}
          look={look}
          setLook={(l) => setPrefs({ look: l })}
          wallpaper={wallpaper}
          setWallpaper={(w) => setPrefs({ wallpaper: w })}
          onClock={() => show("centre")}
        />
      </div>

      <div className={`sm-page${wide ? " is-wide" : ""}`}>
        <div className="sm-page-bar" data-site-chrome>
          <div className="sm-lights">
            <Link href="/" className="l-close" aria-label="Close, back to the desktop">
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" /></svg>
            </Link>
            <button type="button" className="l-min" aria-label="Minimise, back to the desktop" onClick={() => router.push("/")}>
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.8 6h6.4" /></svg>
            </button>
            <button type="button" className="l-zoom" aria-label={wide ? "Make the window smaller" : "Fill the screen"} onClick={() => setWide((w) => !w)}>
              <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.3 8.7V4.6l4.1 4.1zM8.7 3.3v4.1L4.6 3.3z" className="fill" /></svg>
            </button>
          </div>
          <span className="sm-page-title">{title}</span>
        </div>
        {children}
      </div>

      <div data-site-chrome>
        <AnimatePresence>
          {panel === "centre" && (
            <NotificationCentre
              key="centre"
              updates={feed?.updates ?? []}
              items={feed?.items ?? []}
              actions={actions}
              onWaitlist={() => setPanel("waitlist")}
              onClose={() => setPanel((p) => (p === "centre" ? null : p))}
            />
          )}
        </AnimatePresence>
        {panel === "spot" && <Spotlight items={feed?.items ?? []} actions={actions} onClose={() => setPanel(null)} />}
        {panel === "waitlist" && (
          <div className="sm-veil sm-veil-dim" onPointerDown={() => setPanel(null)}>
            <section className="sm-win sm-waitlist-win bar-short is-active" role="dialog" aria-label="Waitlist" onPointerDown={(e) => e.stopPropagation()}>
              <TitleBar title="Waitlist" />
              <Waitlist />
              <div className="sm-lights">
                <button type="button" className="l-close" aria-label="Close" onClick={() => setPanel(null)}>
                  <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" /></svg>
                </button>
                <button type="button" className="l-min" aria-label="Close" onClick={() => setPanel(null)} />
                <button type="button" className="l-zoom" aria-label="Close" onClick={() => setPanel(null)} />
              </div>
            </section>
          </div>
        )}
        <Dock entries={dock} />
        <DeskFooter wallpaper={wallpaper} actions={actions} />
      </div>
    </div>
  );
}
