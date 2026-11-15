import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Plugins and extensions",
  description: "Free plugins for Obsidian, VS Code, Figma and Raycast.",
  alternates: { canonical: "/plugins" },
};

/** The feed opened on Plugins and extensions. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="plugin" />;
}
