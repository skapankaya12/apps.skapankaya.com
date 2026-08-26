"use client";

import { useEffect, useState } from "react";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getCategories, getAuthResolved } from "@/lib/store";
import {
  listAllFreeTools,
  createFreeTool,
  setFreeToolStatus,
  deleteFreeTool,
  type FreeToolDraft,
} from "@/lib/freeTools";
import {
  categoryLabel,
  DEFAULT_CATEGORIES,
  FREE_TOOL_TITLE_MAX,
  FREE_TOOL_DESCRIPTION_MAX,
  type CategoryDef,
  type FreeTool,
} from "@/lib/types";
import { Section, ButtonLink, Button, Badge, StatusBadge } from "@/components/ui";
import { Field, FormSection, inputClass } from "@/components/ui/form";
import { linkHost } from "@/lib/utils";

/**
 * The /free review queue, and the only way to add an entry today.
 *
 * Its own screen rather than a tab on /admin, because the question asked here
 * is a different one. A listing review is "is this software safe and does it do
 * what it says". A directory review is "is this real, does the link work, and
 * does it belong next to what we sell". Mixing the two queues would blur two
 * standards that the /free page tells visitors apart.
 *
 * Reads through lib/freeTools.ts rather than the store: nothing else on the
 * site renders this collection, so it does not need a live listener.
 */

const EMPTY: FreeToolDraft = {
  url: "",
  title: "",
  description: "",
  previewImage: "",
  category: DEFAULT_CATEGORIES[0].id,
};

export default function AdminFreeToolsPage() {
  const user = useUser();
  const categories = useStoreValue(getCategories);
  const authResolved = useStoreValue(getAuthResolved);
  const isAdmin = user?.role === "admin";

  const [tools, setTools] = useState<FreeTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<FreeToolDraft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  /*
   * Reloads are driven by a counter rather than by calling a fetch function
   * from the handlers, so every setState lands in a promise callback instead of
   * synchronously inside the effect body. Same shape as the user count on
   * /admin, and the `live` flag keeps a resolved fetch from writing to an
   * unmounted screen. `busy` covers the later reloads, so `loading` only has to
   * describe the first one.
   */
  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    listAllFreeTools()
      .then((rows) => {
        if (!live) return;
        setTools(rows);
        setError("");
      })
      .catch(() => {
        if (live) setError("Could not load the directory.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [isAdmin, reloadKey]);

  // Waiting on Firebase rather than flashing "Admins only" at an admin. Same
  // reasoning as /saved, and the reason this screen does not use `!user` alone.
  if (!authResolved) {
    return (
      <Section className="py-24 text-center">
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </Section>
    );
  }

  if (!user || !isAdmin) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Admins only</h1>
        <p className="mt-2 text-[var(--muted)]">
          This area is for marketplace admins.
        </p>
        <ButtonLink href="/" className="mt-6" variant="secondary">
          Home
        </ButtonLink>
      </Section>
    );
  }

  const valid =
    /^https:\/\/\S+$/.test(draft.url.trim()) &&
    draft.title.trim().length > 0 &&
    draft.title.length <= FREE_TOOL_TITLE_MAX &&
    draft.description.trim().length > 0 &&
    draft.description.length <= FREE_TOOL_DESCRIPTION_MAX;

  async function submit() {
    if (!valid || !user) return;
    setBusy(true);
    setError("");
    try {
      await createFreeTool(
        { ...draft, url: draft.url.trim(), title: draft.title.trim() },
        { uid: user.uid, displayName: user.displayName || "Admin" }
      );
      setDraft(EMPTY);
      reload();
    } catch {
      setError("Could not save. Check the security rules are deployed.");
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      reload();
    } catch {
      setError("That did not go through.");
    } finally {
      setBusy(false);
    }
  }

  const pending = tools.filter((t) => t.status === "pending");
  const rest = tools.filter((t) => t.status !== "pending");

  return (
    <Section className="py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Free tools</h1>
          <p className="mt-1 text-[var(--muted)]">
            The directory at /free. Checked for relevance and a working link,
            not for security.
          </p>
        </div>
        <ButtonLink href="/admin" variant="secondary" size="sm">
          Back to console
        </ButtonLink>
      </div>

      {error && (
        <p className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
          {error}
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <FormSection title="Add an entry">
          <Field label="Link" hint="https only. Where the tool actually lives.">
            <input
              className={inputClass}
              value={draft.url}
              placeholder="https://"
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          </Field>
          <Field
            label="Name"
            counter={{ value: draft.title, max: FREE_TOOL_TITLE_MAX }}
          >
            <input
              className={inputClass}
              maxLength={FREE_TOOL_TITLE_MAX}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Field
            label="Description"
            hint="Our words, not theirs. What it does and who it is for."
            counter={{
              value: draft.description,
              max: FREE_TOOL_DESCRIPTION_MAX,
            }}
          >
            <textarea
              className={inputClass}
              rows={3}
              maxLength={FREE_TOOL_DESCRIPTION_MAX}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </Field>
          <Field label="Preview image" hint="Optional. A URL we already host.">
            <input
              className={inputClass}
              value={draft.previewImage}
              onChange={(e) =>
                setDraft({ ...draft, previewImage: e.target.value })
              }
            />
          </Field>
          <Field label="Category">
            <select
              className={inputClass}
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              {(categories.length ? categories : DEFAULT_CATEGORIES).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </FormSection>
        <Button className="mt-5" onClick={submit} disabled={!valid || busy}>
          {busy ? "Saving..." : "Add to queue"}
        </Button>
      </div>

      <Queue
        title={`In the queue (${pending.length})`}
        tools={pending}
        categories={categories}
        busy={busy}
        onApprove={(id) => act(id, () => setFreeToolStatus(id, "approved"))}
        onReject={(id) => act(id, () => setFreeToolStatus(id, "rejected"))}
        onDelete={(id) => act(id, () => deleteFreeTool(id))}
      />
      <Queue
        title={`Reviewed (${rest.length})`}
        tools={rest}
        categories={categories}
        busy={busy}
        onApprove={(id) => act(id, () => setFreeToolStatus(id, "approved"))}
        onReject={(id) => act(id, () => setFreeToolStatus(id, "rejected"))}
        onDelete={(id) => act(id, () => deleteFreeTool(id))}
      />

      {loading && <p className="mt-8 text-sm text-[var(--muted)]">Loading...</p>}
    </Section>
  );
}

function Queue({
  title,
  tools,
  categories,
  busy,
  onApprove,
  onReject,
  onDelete,
}: {
  title: string;
  tools: FreeTool[];
  categories: CategoryDef[];
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      {tools.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Nothing here.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {tools.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{t.title}</h3>
                    <StatusBadge status={t.status} />
                    <Badge>{categoryLabel(t.category, categories)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {t.description}
                  </p>
                  {/* The link opens so the reviewer can actually check it,
                      which is the entire standard this queue applies. */}
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-2 inline-block break-all text-xs text-[var(--accent)] hover:underline"
                  >
                    {linkHost(t.url)} &#8599;
                  </a>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Submitted by {t.submitterName}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {t.status !== "approved" && (
                    <Button size="sm" disabled={busy} onClick={() => onApprove(t.id)}>
                      Approve
                    </Button>
                  )}
                  {t.status !== "rejected" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => onReject(t.id)}
                    >
                      Reject
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => onDelete(t.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
