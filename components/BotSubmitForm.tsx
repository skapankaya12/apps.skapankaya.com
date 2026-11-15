"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getAuthResolved, getIdToken } from "@/lib/store";
import { GROK_BOT_GROUPS, grokBotGroupLabel } from "@/lib/grokBots";
import { BOT_NAME_MAX, BOT_SUMMARY_MAX, checkBotDraft, parseBotUrl, type BotDraft, type BotSubmission } from "@/lib/botSubmissions";
import { Section, Button } from "@/components/ui";
import { Field, FormSection, inputClass } from "@/components/ui/form";

/**
 * Add your own Grok Bot. The share link is read first: the site opens it on
 * x.ai to check it exists and fills in the name and maker from its page. The
 * summary is the maker's own words, not the page's, because the page's text
 * is written for x.ai and usually runs long. Everything is reviewed before it
 * shows; the maker sees the state of what they sent underneath.
 */
type Check = { state: "idle" | "checking" | "ok" | "bad"; message?: string; creator?: string; description?: string };

async function api<T>(init: RequestInit & { json?: unknown } = {}): Promise<{ status: number; data: T }> {
  const token = await getIdToken();
  const res = await fetch("/api/grok-bots", {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

const STATUS_LABEL: Record<BotSubmission["status"], string> = {
  pending: "Waiting for review",
  approved: "Live on the Grok Bots page",
  rejected: "Not listed",
};

export function BotSubmitForm() {
  const user = useUser();
  const resolved = useStoreValue(getAuthResolved);
  const [draft, setDraft] = useState<BotDraft>({ url: "", name: "", summary: "", group: "" });
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [error, setError] = useState<{ field?: keyof BotDraft; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<BotSubmission | null>(null);
  const [mine, setMine] = useState<BotSubmission[]>([]);

  // The maker's own submissions, once we know who they are.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api<{ submissions?: BotSubmission[] }>({ method: "GET" }).then(({ data }) => {
      if (alive) setMine(data.submissions ?? []);
    });
    return () => {
      alive = false;
    };
  }, [user, sent]);

  const set = (k: keyof BotDraft) => (v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (error?.field === k) setError(null);
  };

  async function lookUp(url: string) {
    if (!parseBotUrl(url)) {
      setCheck(url.trim() ? { state: "bad", message: "That isn't a Grok Bot share link. It starts with https://x.ai/bot/" } : { state: "idle" });
      return;
    }
    setCheck({ state: "checking" });
    const { status, data } = await api<{ live?: boolean; name?: string; creator?: string; description?: string; error?: string }>({
      method: "POST",
      json: { check: url },
    });
    if (status === 409) return setCheck({ state: "bad", message: "That bot is already on The Solo Market." });
    if (status !== 200 || !data.live) return setCheck({ state: "bad", message: "That link doesn't open on x.ai. Check it's published and public." });
    setCheck({ state: "ok", creator: data.creator, description: data.description });
    if (data.name) setDraft((d) => (d.name ? d : { ...d, name: data.name!.slice(0, BOT_NAME_MAX) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const checked = checkBotDraft(draft);
    if (!checked.ok) return setError({ field: checked.field, message: checked.error });
    setBusy(true);
    setError(null);
    const { status, data } = await api<{ submission?: BotSubmission; field?: keyof BotDraft; message?: string }>({
      method: "POST",
      json: draft,
    });
    setBusy(false);
    if (status === 200 && data.submission) {
      setSent(data.submission);
      setDraft({ url: "", name: "", summary: "", group: "" });
      setCheck({ state: "idle" });
      return;
    }
    if (status === 429) return setError({ message: "That's a lot of bots in an hour. Try again a little later." });
    setError({ field: data.field, message: data.message ?? "Couldn't send that. Try again in a minute." });
  }

  if (!resolved) return <Section className="py-12"><div className="h-64" /></Section>;

  if (!user) {
    return (
      <Section className="py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Add your Grok Bot</h1>
          <p className="mt-3 text-[var(--muted)]">Sign in to send your bot. We review every one before it goes on the Grok Bots page.</p>
          <Link
            href={`/login?next=${encodeURIComponent("/grok-bots/submit")}`}
            className="mt-6 inline-flex rounded-full bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)]"
          >
            Sign in
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <Section className="py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/grok-bots" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
          ← Grok Bots
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Add your Grok Bot</h1>
        <p className="mt-2 text-[var(--muted)]">
          Share a bot you made. We review every one; once it&apos;s approved it sits with the other Grok Bots, marked as added by its maker.
        </p>

        {sent && (
          <div role="status" className="mt-6 rounded-2xl border border-[var(--success)]/40 bg-[var(--success-soft)] p-5">
            <p className="font-medium">{sent.name} is in the queue.</p>
            <p className="mt-1 text-sm text-[var(--muted)]">We&apos;ll email you when it&apos;s reviewed. You can send another below.</p>
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-8 space-y-8">
          <FormSection title="Your bot">
            <div className="space-y-5">
              <Field label="Share link" hint="In the Grok Bot app: Share, Publish, then Copy link.">
                <input
                  className={inputClass}
                  value={draft.url}
                  onChange={(e) => {
                    set("url")(e.target.value);
                    if (check.state !== "idle") setCheck({ state: "idle" });
                  }}
                  onBlur={(e) => lookUp(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    setTimeout(() => lookUp(text), 0);
                  }}
                  placeholder="https://x.ai/bot/…"
                  inputMode="url"
                  autoComplete="off"
                />
              </Field>
              {check.state === "checking" && <p className="-mt-3 text-xs text-[var(--muted)]">Opening it on x.ai…</p>}
              {check.state === "bad" && <p className="-mt-3 text-xs text-[var(--danger)]">{check.message}</p>}
              {check.state === "ok" && (
                <div className="-mt-2 rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--muted)]">
                  <p className="font-medium text-[var(--foreground)]">Found it{check.creator ? `, by ${check.creator}` : ""}.</p>
                  {check.description && <p className="mt-1">On x.ai: {check.description}</p>}
                </div>
              )}

              <Field label="Name" counter={{ value: draft.name, max: BOT_NAME_MAX }}>
                <input className={inputClass} value={draft.name} maxLength={BOT_NAME_MAX} onChange={(e) => set("name")(e.target.value)} />
              </Field>

              <Field label="What it does" hint="One sentence, in your own words." counter={{ value: draft.summary, max: BOT_SUMMARY_MAX }}>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  value={draft.summary}
                  maxLength={BOT_SUMMARY_MAX}
                  onChange={(e) => set("summary")(e.target.value)}
                  placeholder="Sorts your inbox every morning and drafts replies you approve."
                />
              </Field>

              <Field label="Group">
                <select className={inputClass} value={draft.group} onChange={(e) => set("group")(e.target.value)}>
                  <option value="">Pick the one it fits best</option>
                  <optgroup label="Work">
                    {GROK_BOT_GROUPS.filter((g) => g.side === "work").map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Life">
                    {GROK_BOT_GROUPS.filter((g) => g.side === "life").map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </Field>
            </div>
          </FormSection>

          {error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error.message}
            </p>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={busy || check.state === "checking"}>
              {busy ? "Sending…" : "Send for review"}
            </Button>
            <p className="text-xs text-[var(--muted)]">Bots that trade, bet or deal in crypto aren&apos;t listed.</p>
          </div>
        </form>

        {mine.length > 0 && (
          <div className="mt-14">
            <h2 className="text-lg font-semibold tracking-tight">What you&apos;ve sent</h2>
            <ul className="mt-3 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
              {mine.map((s) => (
                <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                      {s.name}
                    </a>
                    <p className="text-sm text-[var(--muted)]">{grokBotGroupLabel(s.group)}</p>
                    {s.status === "rejected" && s.reviewNote && <p className="mt-1 text-sm text-[var(--muted)]">{s.reviewNote}</p>}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      s.status === "approved"
                        ? "bg-[var(--success-soft)] text-[var(--success)]"
                        : s.status === "rejected"
                          ? "bg-[var(--surface-muted)] text-[var(--muted)]"
                          : "bg-[var(--warning-soft)] text-[var(--warning)]"
                    }`}
                  >
                    {STATUS_LABEL[s.status]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Section>
  );
}
