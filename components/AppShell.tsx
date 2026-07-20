"use client";

import { useEffect, type ReactNode } from "react";
import { ensureSeeded, markClientReady } from "@/lib/store";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Seed demo data, then flip the hydration gate so live data renders.
    // Running after mount keeps the first client render matching the server.
    ensureSeeded();
    markClientReady();
  }, []);

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
