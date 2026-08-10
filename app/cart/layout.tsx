import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * A cart is per-visitor and empty for a crawler — nothing to index. Linked
 * from the navbar on every public page, so it's allowed through robots.txt
 * precisely so Googlebot can fetch this `noindex`. See app/robots.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: ReactNode }) {
  return children;
}
