import type { Metadata } from "next";
import type { ReactNode } from "react";
import { brand } from "@/lib/brand";

/**
 * /sell is a client component (it reads the signed-in user to switch the CTA),
 * and client components can't export metadata — so it lives here. This is one
 * of the two pages we actually want to rank for: "where can I sell the small
 * tool I built".
 */
export const metadata: Metadata = {
  title: "Sell the tool you built",
  description: `Sell small software you already built to people who need it. List it once, keep ${Math.round(
    (1 - brand.commissionRate) * 100
  )}% of every sale, no subscription and no store fees. For solo builders, indie makers and anyone who fixed their own problem with code.`,
  alternates: { canonical: "/sell" },
};

export default function SellLayout({ children }: { children: ReactNode }) {
  return children;
}
