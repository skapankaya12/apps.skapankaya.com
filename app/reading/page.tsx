import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Reading",
  description: "Essays and stories for people who build and sell on their own, on pricing, distribution and owning your work.",
  alternates: { canonical: "/reading" },
};

/** The feed opened on Reading. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="read" />;
}
