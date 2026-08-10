import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Seller dashboard. Covers /dashboard and /dashboard/new — metadata is
 * inherited by every segment below this one, so the listing form doesn't need
 * its own copy. Allowed through robots.txt so Googlebot can fetch this
 * `noindex` — see app/robots.ts.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
