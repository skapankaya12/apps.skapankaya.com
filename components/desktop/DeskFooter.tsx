"use client";

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
