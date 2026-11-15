import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Perks and credits",
  description: "Startup programs that give credits and discounts to people building on their own.",
  alternates: { canonical: "/perks" },
};

/** The feed opened on Perks and credits. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="perk" />;
}
