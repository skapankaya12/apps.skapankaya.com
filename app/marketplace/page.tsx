import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Small software made by solo developers. Buy it once, keep it, and run it on your own computer. No subscriptions.",
  alternates: { canonical: "/marketplace" },
};

/** The feed opened on Marketplace. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="tool" />;
}
