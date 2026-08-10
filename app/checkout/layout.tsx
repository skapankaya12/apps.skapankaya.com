import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Covers /checkout/[slug] and /checkout/success. A checkout page is a
 * thin duplicate of the listing page it came from, and the success page is
 * meaningless without the query string — neither belongs in an index, and the
 * listing page at /app/[slug] is the one that should rank.
 *
 * Allowed through robots.txt so Googlebot can fetch this `noindex` — see
 * app/robots.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
