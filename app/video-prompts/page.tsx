import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Video prompts",
  description: "Product films and motion styles made by asking an AI to write the video, each with the prompt behind it.",
  alternates: { canonical: "/video-prompts" },
};

/** The feed opened on Video prompts. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="video" />;
}
