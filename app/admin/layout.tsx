import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Unlike the account-gated pages, /admin stays disallowed in robots.txt — we
 * don't want it fetched at all, and it isn't linked from anywhere public, so
 * there's no anchor-text-only indexing risk to design around.
 *
 * This `noindex` is belt-and-braces on top of that: robots.txt is a request,
 * not an enforcement, and a crawler that ignores it should still be told not
 * to index. Covers /admin and /admin/[id].
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
