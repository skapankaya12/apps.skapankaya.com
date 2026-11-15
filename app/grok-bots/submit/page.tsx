import type { Metadata } from "next";
import { BotSubmitForm } from "@/components/BotSubmitForm";

export const metadata: Metadata = {
  title: "Add your Grok Bot",
  description: "Share a Grok Bot you made. Every one is reviewed before it joins the Grok Bots on The Solo Market.",
  alternates: { canonical: "/grok-bots/submit" },
};

/** The form for makers to add their own Grok Bot. See components/BotSubmitForm.tsx. */
export default function SubmitGrokBotPage() {
  return <BotSubmitForm />;
}
