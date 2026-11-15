import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Just launched",
  description: "Fresh launches from Show HN, picked for solo makers.",
  alternates: { canonical: "/launches" },
};

/** The feed opened on Just launched. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="launch" />;
}
