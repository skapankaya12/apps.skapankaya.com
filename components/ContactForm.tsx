"use client";

import { useState } from "react";
import { brand } from "@/lib/brand";
import { Button, Badge } from "./ui";

type Topic = "request" | "support" | "selling" | "other";

const TOPICS: { value: Topic; label: string; hint: string }[] = [
  {
    value: "request",
    label: "Request a tool",
    hint: "Describe the problem — we can often build it for you within a week.",
  },
  {
    value: "support",
    label: "Help with a tool I bought",
    hint: "Tell us which tool and what happened when you tried to run it.",
  },
  {
    value: "selling",
    label: "Selling on the marketplace",
    hint: "Questions about listing, pricing, reviews or payouts.",
  },
  { value: "other", label: "Something else", hint: "Anything else on your mind." },
];

export function ContactForm() {
  const [topic, setTopic] = useState<Topic>("request");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const active = TOPICS.find((t) => t.value === topic)!;
  const valid = email.includes("@") && message.trim().length > 10;

  if (sent) {
    return (
      <div className="rounded-2xl border border-[var(--success)]/40 bg-[var(--success-soft)] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--surface)] text-2xl">
          ✓
        </div>
        <h3 className="mt-4 text-lg font-semibold">Message sent</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          Thanks — we read every message and usually reply within one business
          day. If you requested a tool, we&apos;ll tell you whether we can build
          it and what it would cost.
        </p>
        <Button variant="secondary" className="mt-5" onClick={() => setSent(false)}>
          Send another
        </Button>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Demo: no backend yet. Wire this to a route handler that sends via Resend
    // (see EMAIL_SETUP.md) before launch.
    setSent(true);
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <label className="text-sm font-medium">What&apos;s this about?</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTopic(t.value)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              topic === t.value
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">{active.hint}</p>

      <div className="mt-5">
        <label className="text-sm font-medium" htmlFor="contact-email">
          Your email
        </label>
        <input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium" htmlFor="contact-message">
          {topic === "request" ? "What do you need it to do?" : "Your message"}
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder={
            topic === "request"
              ? "e.g. I get a messy CSV from our booking system every week and I need it cleaned and split by branch…"
              : "Tell us what's going on…"
          }
          className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={!valid}>
          Send message
        </Button>
        {!valid && <Badge tone="neutral">Add your email and a short message</Badge>}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Prefer email? Write to{" "}
        <span className="text-[var(--foreground)]">{brand.supportEmail}</span>.
      </p>
    </form>
  );
}
