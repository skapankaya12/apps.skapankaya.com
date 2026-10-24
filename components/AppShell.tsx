"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { markClientReady } from "@/lib/store";
import { SiteChrome } from "./desktop/SiteChrome";
import { VerifyEmailBanner } from "./VerifyEmailBanner";

/**
 * The frame around every page.
 *
 * The homepage is the desktop itself (components/desktop/Desktop.tsx), its own
 * menu bar, dock and windows. Every other page sits on the same desktop as a
 * single window (SiteChrome). The old floating header and footer, and the
 * homepage they framed, are kept unrouted in archive/old-homepage/.
 *
 * The "new this week" popup is gone from both: the same news is in the
 * desktop's Notification Centre.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Wire up Firestore listeners + auth after mount, so the first client
    // render still matches the server (empty), then live data streams in.
    markClientReady();
    // A page opened inside one of the desktop's browser windows is a frame of
    // our own site. Its menu bar, dock and window frame would be a second
    // desktop inside the first, so the CSS drops them under this attribute.
    if (window.self !== window.top) document.documentElement.dataset.embedded = "1";
  }, []);

  if (pathname === "/") return <>{children}</>;

  return (
    <SiteChrome>
      <VerifyEmailBanner />
      <main>{children}</main>
    </SiteChrome>
  );
}
