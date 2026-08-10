import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Bookmarks are per-visitor and empty for a crawler. Linked from the navbar on
 * every public page, so it's allowed through robots.txt precisely so Googlebot
 * can fetch this `noindex`. See app/robots.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function SavedLayout({ children }: { children: ReactNode }) {
  return children;
}
