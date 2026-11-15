"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getAuthResolved, getIdToken } from "@/lib/store";
import { grokBotGroupLabel } from "@/lib/grokBots";
import type { BotSubmission } from "@/lib/botSubmissions";
import { Section, Button } from "@/components/ui";

/**
 * The review queue for Grok Bots their makers sent in.
 *
 * Its own screen beside /admin/free, because the question is the same kind:
 * is the link real, is the summary honest, does it belong. Not "is this
 * software safe", which is the listing review. Check before approving: the
 * link opens, the summary says what the bot does in plain words, it is not a
 * trading, betting or crypto bot, and it is not already listed.
 *
 * Reads and writes go through /api/admin/grok-bots, which checks the admin
 * role on the server; the role check here only decides what to draw.
 */
async function adminApi<T>(init: RequestInit & { json?: unknown } = {}): Promise<{ status: number; data: T }> {
  const token = await getIdToken();
  const res = await fetch("/api/admin/grok-bots", {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.json === undefined ? undefined : JSON.stringify(init.json),
  });
  return { status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

export default function AdminBotsPage() {
  const user = useUser();
  const resolved = useStoreValue(getAuthResolved);
  const isAdmin = user?.role === "admin";
  const [items, setItems] = useState<BotSubmission[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { status, data } = await adminApi<{ submissions?: BotSubmission[] }>({ method: "GET" });
    if (status !== 200) {
      setError("Couldn't load the queue.");
      return;
    }
    setItems(data.submissions ?? []);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [isAdmin, load]);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError("");
    const { status } = await adminApi({ method: "POST", json: { id, action, note: notes[id] ?? "" } });
    setBusy(null);
    if (status !== 200) return setError("That didn't save. Try again.");
    await load();
  }

  if (!resolved) return <Section className="py-12"><div className="h-40" /></Section>;
  if (!isAdmin) {
    return (
      <Section className="py-16 text-center">
        <p className="text-[var(--muted)]">This page is for admins.</p>
      </Section>
    );
  }

  const pending = (items ?? []).filter((s) => s.status === "pending");
  const decided = (items ?? []).filter((s) => s.status !== "pending");

  return (
    <Section className="py-12">
      <Link href="/admin" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Admin
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Grok Bots from makers</h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Check the link opens, the summary is honest and plain, it isn&apos;t a trading, betting or crypto bot, and it isn&apos;t
        already listed. Approved bots show on the Grok Bots page straight away, marked as added by their maker.
      </p>
      {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

      <h2 className="mt-10 text-lg font-semibold">Waiting for review ({pending.length})</h2>
      {items === null ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Nothing waiting.</p>
      ) : (
        <ul className="mt-3 space-y-4">
          {pending.map((s) => (
            <li key={s.id} className="rounded-2xl border border-[var(--border)] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold hover:underline">
                  {s.name}
                </a>
                <span className="text-sm text-[var(--muted)]">{grokBotGroupLabel(s.group)}</span>
              </div>
              <p className="mt-1">{s.summary}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Sent by {s.submitterName}
                {s.submitterHandle ? ` (@${s.submitterHandle})` : ""}
                {s.creator ? ` · x.ai says it's by ${s.creator}` : ""} · {new Date(s.updatedAt).toLocaleDateString()}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-[var(--muted)]">{s.url}</p>
              <textarea
                className="mt-4 w-full resize-none rounded-xl border border-[var(--border-strong)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                rows={2}
                placeholder="Note to the maker (optional; sent with the decision)"
                value={notes[s.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
              />
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={busy === s.id} onClick={() => decide(s.id, "approve")}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" disabled={busy === s.id} onClick={() => decide(s.id, "reject")}>
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="mt-12 text-lg font-semibold">Decided</h2>
          <ul className="mt-3 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
            {decided.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                    {s.name}
                  </a>
                  <p className="text-sm text-[var(--muted)]">
                    {s.status === "approved" ? "Approved" : "Rejected"}
                    {s.reviewNote ? `: ${s.reviewNote}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === s.id}
                  onClick={() => decide(s.id, s.status === "approved" ? "reject" : "approve")}
                >
                  {s.status === "approved" ? "Take down" : "Approve after all"}
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}
