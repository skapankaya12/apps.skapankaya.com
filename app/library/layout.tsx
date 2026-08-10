import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * A buyer's own purchases. Nothing here is public, and the download links
 * especially shouldn't be in an index. Allowed through robots.txt so Googlebot
 * can fetch this `noindex` — see app/robots.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return children;
}
