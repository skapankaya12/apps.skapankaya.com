import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Templates and kits",
  description: "Free starters, themes and component kits for your next app, site or docs.",
  alternates: { canonical: "/templates" },
};

/** The feed opened on Templates and kits. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="kit" />;
}
