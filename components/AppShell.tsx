"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CATALOGUE_PAUSED } from "@/lib/brand";
import { markClientReady } from "@/lib/store";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
import { WhatsNewPopup } from "./WhatsNewPopup";

/**
 * Pages that run full screen with their own top bar and no site header: the
 * browse feed (components/MarketFeed.tsx) on every filter's page, whose menu
 * carries the site's links instead. The footer stays. They also skip the
 * "new this week" popup, since the feed opens its own guide.
 *
 * Exact paths only: /blog is the feed, /blog/some-post is an article with the
 * normal header, and /free/submit is a form.
 */
const BARE_ROUTES = new Set([
  "/", "/browse", "/marketplace", "/free", "/swaps", "/templates", "/plugins",
  "/grok-bots", "/agents", "/video-prompts", "/blog", "/reading", "/launches", "/perks",
]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // When Vercel refreshes the homepage in the background (ISR), the page is
  // stored with its address as "/index", its file name, and that reaches
  // usePathname in the browser too. Read it, and any trailing slash, as the
  // page it is, or the homepage would get the site header back after the
  // first refresh (it did, on 15 November).
  const path = !pathname || pathname === "/index" ? "/" : pathname.replace(/(.)\/$/, "$1");
  const bare = BARE_ROUTES.has(path);

  useEffect(() => {
    // Wire up Firestore listeners + auth after mount, so the first client
    // render still matches the server (empty), then live data streams in.
    markClientReady();
  }, []);

  return (
    <>
      {!bare && <Navbar />}
      {/* The header is fixed, so nothing below it reserves its height — this
          wrapper does, for the banner and the page alike. The homepage hero
          takes that height back with .hero-bleed so its gradient runs up
          behind the dock. */}
      <div className={`flex flex-1 flex-col ${bare ? "" : "pt-[var(--header-h)]"}`}>
        <VerifyEmailBanner />
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
      {/* Its cards carry the same broken images. */}
      {!CATALOGUE_PAUSED && !bare && <WhatsNewPopup />}
    </>
  );
}
