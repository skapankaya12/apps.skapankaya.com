import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * /login is linked from the navbar on every public page, so Googlebot sees it
 * constantly. It's allowed through robots.txt on purpose — that's what lets
 * Googlebot fetch this `noindex` and drop the page instead of indexing the
 * bare URL from anchor text. See app/robots.ts.
 *
 * `follow: true`: don't index this page, but the links on it are still worth
 * crawling.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
