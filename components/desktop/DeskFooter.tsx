"use client";

import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";
import { WALLPAPERS, type Wallpaper } from "@/lib/desktop";
import { BADGES } from "@/components/FooterBadges";
import { intercept, type DeskActions } from "./types";

const LINKS: { href: string; label: string; wide?: boolean }[] = [
  { href: "/about", label: "About", wide: true },
  { href: "/docs", label: "Docs", wide: true },
  { href: "/about#contact", label: "Contact", wide: true },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
];

/**
 * The site's footer on the desktop: a thin strip of glass along the bottom
 * edge, under the Dock, the way a status bar sits under everything else.
 *
 * It carries what the old footer did that a visitor or a crawler must always
 * be able to reach: the copyright, the legal pages, contact, and the
 * launch-board badges, which those boards ask to see on the homepage. The
 * photo credit for the NASA wallpapers sits here too, rather than floating on
 * the picture. Our own pages open in a desktop window; the badges leave the
 * site, so they open a new tab.
 */
export function DeskFooter({ wallpaper, actions }: { wallpaper: Wallpaper; actions: DeskActions }) {
  const credit = WALLPAPERS.find((w) => w.id === wallpaper)?.credit;
  return (
    <footer className="sm-foot">
      <span className="sm-foot-copy">
        © {new Date().getFullYear()} {brand.name}
        {credit && <span className="sm-foot-credit"> · Photo: {credit}</span>}
      </span>
      <VisitCount />
      <nav className="sm-foot-links" aria-label="Footer">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className={l.wide ? "sm-foot-wide" : undefined}
            onClick={(e) => intercept(e, () => actions.openPage(l.href))}
          >
            {l.label}
          </a>
        ))}
        {BADGES.length > 0 && <span className="sm-foot-sep" aria-hidden="true" />}
        {BADGES.map((b) => (
          <a key={b.href} href={b.href} target="_blank" rel="noopener" className="sm-foot-badge">
            {/* Their image on their host, as the badge is meant to be used. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.src} alt={b.alt} width={b.width} height={b.height} />
          </a>
        ))}
      </nav>
    </footer>
  );
}

const ID_KEY = "sm-visitor";
const COUNTED_KEY = "sm-counted";

/**
 * "● N online · N visitors", as AI Standings shows it. See app/api/visits for
 * what is counted and what is not. Checks in once a minute while the page is
 * visible. Shows nothing until the first answer, so it never flashes "0".
 * Skipped inside the desktop's Pages window, which is the same visitor.
 */
function VisitCount() {
  const [n, setN] = useState<{ visitors: number; online: number } | null>(null);

  useEffect(() => {
    if (window.self !== window.top) return;
    let id = "";
    let first = false;
    try {
      id = localStorage.getItem(ID_KEY) || "";
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(ID_KEY, id);
      }
      first = !localStorage.getItem(COUNTED_KEY);
    } catch {
      // Storage refused: still counted as online for this page, never as a visitor.
      id = crypto.randomUUID();
    }
    let live = true;
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, first }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d || !live) return;
          if (first) {
            try {
              localStorage.setItem(COUNTED_KEY, "1");
            } catch {}
            first = false;
          }
          setN({ visitors: d.visitors, online: Math.max(1, d.online) });
        })
        .catch(() => {});
    };
    ping();
    const t = setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      live = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);

  if (!n) return null;
  return (
    <span className="sm-foot-stats" aria-label={`${n.online} online, ${n.visitors} ${n.visitors === 1 ? "visitor" : "visitors"}`}>
      <i aria-hidden="true" />
      <b>{n.online.toLocaleString()}</b> online
      <span aria-hidden="true"> · </span>
      <b>{n.visitors.toLocaleString()}</b> {n.visitors === 1 ? "visitor" : "visitors"}
    </span>
  );
}
