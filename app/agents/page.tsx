import type { Metadata } from "next";
import { FeedPage } from "@/components/FeedPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "AI agents",
  description: "Claude Skills, MCP servers and ChatGPT apps, each one a job your AI assistant can take on.",
  alternates: { canonical: "/agents" },
};

/** The feed opened on AI agents. See components/FeedPage.tsx. */
export default function Page() {
  return <FeedPage kind="agent" />;
}
