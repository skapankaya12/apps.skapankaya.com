"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { setPrefs, usePrefs, useViewport } from "./hooks";
import { AnimatePresence } from "motion/react";
import {
  LIGHT_WALLPAPERS,
  AISLES,
  aisleById,
  type AisleId,
  type MarketUpdate,
  type ShelfItem,
  type Wallpaper as WallpaperId,
} from "@/lib/desktop";
import { Wallpaper } from "./Wallpaper";
import { GlassAisle } from "./GlassAisle";
import { DeskFooter } from "./DeskFooter";
import { NotificationCentre } from "./NotificationCentre";
import { MenuBar } from "./MenuBar";
import { Dock, type DockEntry } from "./Dock";
import { Window } from "./Window";
import { About, Bin, Marketplace, QuickLook, Suggest, Waitlist, WebView } from "./apps";
import { ContextMenu, Launchpad, Notice, Spotlight, VerifyNotice } from "./overlays";
import { useStoreValue, useUser } from "@/lib/hooks";
import { isEmailVerified } from "@/lib/store";
import {
  AppIcon,
  BinIcon,
  DocIcon,
  PackageIcon,
  type Glyph,
} from "./icons";
import {
  WIN_TITLES,
  intercept,
  type DeskActions,
  type Look,
  type Win,
  type WinKind,
} from "./types";

/** Where each window opens on a large screen, before it is fitted to the real one. */
const FRAMES: Record<WinKind, Pick<Win, "x" | "y" | "w" | "h">> = {
  market: { x: 64, y: 52, w: 880, h: 560 },
  look: { x: 420, y: 96, w: 460, h: 480 },
  web: { x: 120, y: 64, w: 1000, h: 640 },
  waitlist: { x: 560, y: 110, w: 420, h: 500 },
  about: { x: 0, y: 120, w: 360, h: 380 },
  bin: { x: 300, y: 180, w: 420, h: 300 },
  suggest: { x: 520, y: 80, w: 460, h: 560 },
};

/** Which app icon stands for a minimised window. */
const MIN_ICON: Record<Exclude<WinKind, "bin">, Glyph> = {
  market: "market",
  look: "market",
  web: "pages",
  waitlist: "notes",
  about: "about",
  suggest: "notes",
};

/** Keeps a frame on screen: no wider or taller than the room, no corner off the edge. */
function fit(f: Pick<Win, "x" | "y" | "w" | "h">, [vw, vh]: [number, number]) {
  const w = Math.min(f.w, vw - 40);
  const h = Math.min(f.h, vh - 28 - 136);
  const x = Math.max(16, Math.min(f.x, vw - w - 16));
  const y = Math.max(36, Math.min(f.y, vh - h - 126));
  return { x, y, w, h };
}

/** One above whatever is on top now. */
function nextZ(w: Partial<Record<WinKind, Win>>) {
  return Math.max(10, ...Object.values(w).map((x) => x!.z)) + 1;
}

type Props = {
  items: ShelfItem[];
  /** The market's news, newest first, for the Notification Centre. */
  updates: MarketUpdate[];
  paused: boolean;
  /** The homepage's own words, kept in the HTML for anyone reading without eyes. */
  heading: string;
  sub: string;
};

/**
 * The homepage: a computer screen.
 *
 * One window per kind, kept in a single record. Focus is a z counter. Closing
 * removes the window; minimising keeps it, hidden, with its own icon in the
 * Dock. The Marketplace window is open in the server HTML, so the first frame
 * is a working shop and not an empty wallpaper.
 */
export function Desktop({ items, updates, paused, heading, sub }: Props) {
  const [wins, setWins] = useState<Partial<Record<WinKind, Win>>>({
    market: { kind: "market", ...FRAMES.market, z: 10, min: false, max: false },
  });
  const [active, setActive] = useState<WinKind | null>("market");
  // While the catalogue is paused, open on the aisle with the most in it.
  const [aisle, setAisle] = useState<AisleId>(paused ? "sites" : "tools");
  const [subfolder, setSubfolder] = useState<string | null>(null);
  const [look, setLookState] = useState<ShelfItem | null>(null);
  const [page, setPage] = useState({ path: "/about", title: "Pages", n: 0 });
  const { look: appearance, wallpaper } = usePrefs();
  const viewport = useViewport();
  const [spot, setSpot] = useState(false);
  const [pad, setPad] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const [notice, setNotice] = useState(true);
  const [centre, setCentre] = useState(false);
  const user = useUser();
  const verified = useStoreValue(isEmailVerified);
  const [verifyHidden, setVerifyHidden] = useState(false);
  const needsVerify = !!user && !verified && !verifyHidden;
  const [picked, setPicked] = useState<string | null>(null);
  const lastPointer = useRef<string>("mouse");

  const setLook = (look: Look) => setPrefs({ look });
  const setWallpaper = (wallpaper: WallpaperId) => setPrefs({ wallpaper });

  const focus = useCallback((kind: WinKind) => {
    setWins((w) =>
      w[kind] ? { ...w, [kind]: { ...w[kind]!, z: nextZ(w), min: false } } : w,
    );
    setActive(kind);
  }, []);

  const open = useCallback((kind: WinKind) => {
    // About sits in the middle, the way an About window does.
    const frame =
      kind === "about"
        ? { ...FRAMES.about, x: (window.innerWidth - FRAMES.about.w) / 2 }
        : FRAMES[kind];
    setWins((w) =>
      w[kind]
        ? { ...w, [kind]: { ...w[kind]!, z: nextZ(w), min: false } }
        : {
            ...w,
            [kind]: { kind, ...frame, z: nextZ(w), min: false, max: false },
          },
    );
    setActive(kind);
  }, []);

  const close = useCallback((kind: WinKind) => {
    setWins((w) => {
      const next = { ...w };
      delete next[kind];
      return next;
    });
    setActive((a) => (a === kind ? null : a));
  }, []);

  const minimise = useCallback((kind: WinKind) => {
    setWins((w) =>
      w[kind] ? { ...w, [kind]: { ...w[kind]!, min: true } } : w,
    );
    setActive((a) => (a === kind ? null : a));
  }, []);

  const zoom = useCallback((kind: WinKind) => {
    setWins((w) =>
      w[kind] ? { ...w, [kind]: { ...w[kind]!, max: !w[kind]!.max } } : w,
    );
  }, []);

  const actions = useMemo<DeskActions>(
    () => ({
      open,
      close,
      minimise,
      zoom,
      focus,
      openAisle: (id) => {
        setAisle(id);
        setSubfolder(null);
        open("market");
      },
      openItem: (item) => {
        setLookState(item);
        open("look");
      },
      openPage: (path) => {
        setPage((p) => ({ path, title: "Pages", n: p.n + 1 }));
        open("web");
      },
      spotlight: () => setSpot(true),
      launchpad: () => setPad(true),
    }),
    [open, close, minimise, zoom, focus],
  );

  // Keyboard: ⌘K or Ctrl+K searches (⌘Space belongs to the visitor's own
  // computer), F4 shows every aisle, Escape closes whatever is on top.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSpot((s) => !s);
      } else if (e.key === "F4") {
        e.preventDefault();
        setPad((p) => !p);
      } else if (e.key === "Escape") {
        setSpot(false);
        setCtx(null);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  const list = Object.values(wins) as Win[];
  const minimised = list.filter((w) => w.min);

  const dock: DockEntry[] = [
    {
      kind: "app",
      key: "market",
      label: "Marketplace",
      href: "/marketplace",
      icon: <AppIcon g="market" />,
      running: !!wins.market,
      onOpen: () => (wins.market ? focus("market") : open("market")),
    },
    {
      kind: "app",
      key: "pad",
      label: "All aisles",
      icon: <AppIcon g="launchpad" />,
      onOpen: () => setPad(true),
    },
    {
      kind: "app",
      key: "web",
      label: "Pages",
      href: "/about",
      icon: <AppIcon g="pages" />,
      running: !!wins.web,
      onOpen: () => (wins.web ? focus("web") : actions.openPage("/about")),
    },
    {
      kind: "app",
      key: "free",
      label: "Free & open source",
      href: "/free",
      icon: <AppIcon g="free" />,
      onOpen: () => actions.openAisle("free"),
    },
    {
      kind: "app",
      key: "video",
      label: "Video prompts",
      href: "/video-prompts",
      icon: <AppIcon g="video" />,
      onOpen: () => actions.openAisle("video"),
    },
    {
      kind: "app",
      key: "waitlist",
      label: "Waitlist",
      icon: <AppIcon g="notes" />,
      running: !!wins.waitlist,
      onOpen: () => open("waitlist"),
    },
    {
      kind: "app",
      key: "sell",
      label: "Sell your tool",
      href: "/sell",
      icon: <AppIcon g="sell" />,
      onOpen: () => actions.openPage("/sell"),
    },
    { kind: "sep", key: "s1" },
    {
      kind: "app",
      key: "library",
      label: "Library: what you own",
      href: "/library",
      icon: <AppIcon g="library" />,
      onOpen: () => actions.openPage("/library"),
    },
    {
      kind: "app",
      key: "saved",
      label: "Saved",
      href: "/saved",
      icon: <AppIcon g="saved" />,
      onOpen: () => actions.openPage("/saved"),
    },
    ...minimised.map<DockEntry>((w) => ({
      kind: "app",
      key: `min-${w.kind}`,
      label: WIN_TITLES[w.kind],
      // A minimised window sits in the Dock as its own app's icon, on a small
      // page so it reads as a window rather than a second launcher.
      icon: (
        <span className="sm-dk-min">
          {w.kind === "bin" ? <BinIcon /> : <AppIcon g={MIN_ICON[w.kind]} />}
        </span>
      ),
      onOpen: () => focus(w.kind),
    })),
    { kind: "sep", key: "s2" },
    {
      kind: "app",
      key: "bin",
      label: "Subscriptions: where monthly bills go",
      icon: <BinIcon />,
      running: !!wins.bin,
      onOpen: () => open("bin"),
    },
  ];

  const titles: Record<WinKind, string> = {
    ...WIN_TITLES,
    market: aisleById(aisle).subs?.find((s) => s.id === subfolder)?.label ?? aisleById(aisle).label,
    look: look?.title ?? "Quick Look",
    web: page.title,
  };

  function body(kind: WinKind) {
    switch (kind) {
      case "market":
        return (
          <Marketplace
            aisle={aisle}
            sub={subfolder}
            onSub={setSubfolder}
            items={items}
            paused={paused}
            actions={actions}
          />
        );
      case "look":
        return look ? <QuickLook item={look} actions={actions} /> : null;
      case "web":
        return (
          <WebView
            key={page.n}
            path={page.path}
            onPath={(title, path) =>
              setPage((p) =>
                p.title === title && p.path === path
                  ? p
                  : { ...p, title, path },
              )
            }
          />
        );
      case "waitlist":
        return <Waitlist />;
      case "about":
        return <About actions={actions} />;
      case "bin":
        return <Bin />;
      case "suggest":
        return <Suggest />;
    }
  }

  function openIcon(e: ReactMouseEvent, run: () => void, id: string) {
    intercept(e, () =>
      lastPointer.current === "mouse" ? setPicked(id) : run(),
    );
  }

  return (
    <div
      className={`sm-desk wall-${wallpaper}${LIGHT_WALLPAPERS.includes(wallpaper) ? " wall-light" : ""}`}
      data-look={appearance}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
        if (e.target === e.currentTarget) setPicked(null);
      }}
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        setCtx({ x: e.clientX, y: e.clientY });
      }}
    >
      <Wallpaper id={wallpaper} />
      <h1 className="sr-only">{heading}</h1>
      <p className="sr-only">{sub}</p>

      <MenuBar
        actions={actions}
        activeKind={active}
        wins={list}
        look={appearance}
        setLook={setLook}
        wallpaper={wallpaper}
        setWallpaper={setWallpaper}
        onClock={() => {
          setNotice(false);
          setCentre((c) => !c);
        }}
      />

      <nav className="sm-icons" aria-label="Desktop">
        {AISLES.map((a, i) => (
          // A glass folder you can hover and click, with its name as a real
          // link underneath, so crawlers and keyboards still have an anchor.
          <div key={a.id} className="sm-dicon sm-dicon-glass">
            <span className="sm-dicon-art">
              <GlassAisle
                aisle={a}
                items={items}
                mode="icon"
                tone={LIGHT_WALLPAPERS.includes(wallpaper) ? "light" : "dark"}
                width={64}
                delay={i * 60}
                onOpenAisle={actions.openAisle}
                onItem={actions.openItem}
              />
            </span>
            <a
              href={a.href}
              className="sm-dicon-label"
              onClick={(e) => intercept(e, () => actions.openAisle(a.id))}
            >
              {a.label}
            </a>
          </div>
        ))}
        <a
          href="/about"
          className={`sm-dicon${picked === "readme" ? " is-picked" : ""}`}
          onClick={(e) => openIcon(e, () => actions.open("about"), "readme")}
          onDoubleClick={() => actions.open("about")}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), actions.open("about"))
          }
        >
          <span className="sm-dicon-art">
            <DocIcon size={58} />
          </span>
          <span className="sm-dicon-label">README.txt</span>
        </a>
        <a
          href="/sell"
          className={`sm-dicon${picked === "pkg" ? " is-picked" : ""}`}
          onClick={(e) => openIcon(e, () => actions.openPage("/sell"), "pkg")}
          onDoubleClick={() => actions.openPage("/sell")}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.preventDefault(), actions.openPage("/sell"))
          }
        >
          <span className="sm-dicon-art">
            <PackageIcon size={60} />
          </span>
          <span className="sm-dicon-label">Sell your tool.pkg</span>
        </a>
      </nav>

      <AnimatePresence>
        {list
          .filter((w) => !w.min)
          .map((w) => (
            <Window
              key={w.kind}
              win={{ ...w, ...fit(w, viewport) }}
              title={titles[w.kind]}
              bar={w.kind === "market" || w.kind === "web" ? "tall" : "short"}
              active={active === w.kind}
              onFocus={() => active !== w.kind && focus(w.kind)}
              onClose={() => close(w.kind)}
              onMinimise={() => minimise(w.kind)}
              onZoom={() => zoom(w.kind)}
              onFrame={(f) =>
                setWins((all) =>
                  all[w.kind]
                    ? { ...all, [w.kind]: { ...all[w.kind]!, ...f } }
                    : all,
                )
              }
            >
              {body(w.kind)}
            </Window>
          ))}
      </AnimatePresence>

      <AnimatePresence>
        {needsVerify && !centre && (
          <VerifyNotice key="verify" email={user!.email} onClose={() => setVerifyHidden(true)} />
        )}
        {notice && !needsVerify && (
          <Notice
            onWaitlist={() => {
              setNotice(false);
              open("waitlist");
            }}
            onClose={() => setNotice(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {centre && (
          <NotificationCentre
            updates={updates}
            items={items}
            actions={actions}
            onWaitlist={() => open("waitlist")}
            onClose={() => setCentre(false)}
          />
        )}
      </AnimatePresence>

      <Dock entries={dock} />
      <DeskFooter wallpaper={wallpaper} actions={actions} />

      {spot && (
        <Spotlight
          items={items}
          actions={actions}
          onClose={() => setSpot(false)}
        />
      )}
      {pad && <Launchpad actions={actions} items={items} onClose={() => setPad(false)} />}
      {ctx && (
        <ContextMenu
          at={ctx}
          actions={actions}
          setWallpaper={setWallpaper}
          onClose={() => setCtx(null)}
        />
      )}
    </div>
  );
}
