import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Swap a subscription",
  description: "Self-hostable swaps for the subscriptions you already pay for, most of them open source.",
  alternates: { canonical: "/swaps" },
};

/** The feed opened on Swap a subscription. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="swap" />;
}
