"use client";

import { useEffect, type ReactNode } from "react";
import { markClientReady } from "@/lib/store";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { VerifyEmailBanner } from "./VerifyEmailBanner";

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Wire up Firestore listeners + auth after mount, so the first client
    // render still matches the server (empty), then live data streams in.
    markClientReady();
  }, []);

  return (
    <>
      <Navbar />
      {/* The header is fixed, so nothing below it reserves its height — this
          wrapper does, for the banner and the page alike. The homepage hero
          takes that height back with .hero-bleed so its gradient runs up
          behind the dock. */}
      <div className="flex flex-1 flex-col pt-[var(--header-h)]">
        <VerifyEmailBanner />
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </>
  );
}
