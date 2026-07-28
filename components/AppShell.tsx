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
      <VerifyEmailBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
