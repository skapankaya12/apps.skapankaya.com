"use client";

import { useState } from "react";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";

/**
 * Launch-list signup, shown inside the pre-launch card.
 *
 * Posts to /api/waitlist, which forwards to a Google Sheet through an Apps
 * Script webhook — the same server-to-server shape as the contact form, so the
 * script URL never reaches the browser.
 *
 * The copy states exactly what someone is signing up for. Under GDPR this is
 * consent-based marketing, so "one email, at launch" has to be the truth: if
 * that ever becomes a newsletter, the wording here changes first.
 */
export function WaitlistForm({
  label = "Want to know when it opens?",
  buttonLabel = "Notify me",
  inline = false,
}: {
  label?: string;
  buttonLabel?: string;
  /** One row, pill-shaped, for the homepage hero. */
  inline?: boolean;
} = {}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const valid = email.includes("@") && email.trim().length > 4;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || state === "busy") return;
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        setState("done");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setState("error");
      setMessage(
        data?.error === "rate-limited"
          ? "That's a few tries in a row — give it a minute."
          : data?.error === "not-configured"
            ? "The launch list isn't quite ready. Try again a little later."
            : "Couldn't save that. Please try again."
      );
    } catch {
      setState("error");
      setMessage("Network error. Please check your connection and try again.");
    }
  }

  if (state === "done" && inline) {
    return (
      <p className="mx-auto mt-6 max-w-md rounded-full bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--foreground)]">
        You&apos;re on the list. One email when buying opens.
      </p>
    );
  }

  if (inline) {
    return (
      <form onSubmit={submit} className="mx-auto mt-6 w-full max-w-md">
        <label htmlFor="hero-waitlist-email" className="sr-only">
          {label}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:rounded-full sm:border sm:border-[var(--border-strong)] sm:bg-[var(--background)] sm:p-1.5">
          <input
            id="hero-waitlist-email"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className="min-w-0 flex-1 rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] sm:border-0 sm:py-2"
          />
          <button
            type="submit"
            disabled={state === "busy"}
            className="shrink-0 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-[var(--background)] transition-opacity disabled:opacity-60 sm:py-2"
          >
            {state === "busy" ? "…" : buttonLabel}
          </button>
        </div>
        {state === "error" && <p className="mt-2 text-xs text-[var(--danger)]">{message}</p>}
      </form>
    );
  }

  if (state === "done") {
    return (
      <p className="mt-4 rounded-lg bg-[var(--accent-soft)] px-3 py-2.5 text-sm text-[var(--foreground)]">
        You&apos;re on the list. We&apos;ll email you when it opens in November.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <label htmlFor="waitlist-email" className="text-xs font-medium">
        {label}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="waitlist-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <LiquidMetalButton
          type="submit"
          disabled={!valid || state === "busy"}
          className="shrink-0 px-3.5 py-2"
        >
          {state === "busy" ? "…" : buttonLabel}
        </LiquidMetalButton>
      </div>
      {state === "error" && (
        <p className="mt-2 text-xs text-[var(--danger)]">{message}</p>
      )}
    </form>
  );
}
