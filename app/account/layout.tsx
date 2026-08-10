import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Account settings — signed-in only, and a sign-in prompt to anyone else.
 * Linked from the navbar menu and from /terms and /privacy, so it's allowed
 * through robots.txt precisely so Googlebot can fetch this `noindex`.
 * See app/robots.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return children;
}
