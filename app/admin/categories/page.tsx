"use client";

import { useState } from "react";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getCategories,
  countListingsInCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
} from "@/lib/store";
import { toCategoryId, type CategoryDef } from "@/lib/types";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3.5 py-2 text-sm outline-none focus:border-[var(--accent)]";

/**
 * The browse filters, as an admin screen.
 *
 * These used to be a hard-coded list in lib/types.ts, which meant the shape of
 * the marketplace could only change with a deploy. They're documents now, and
 * this is where they're written: add a filter when a new kind of tool starts
 * arriving, rename one that isn't landing with buyers, retire one nobody sells
 * into.
 *
 * The whole default set is written to Firestore on the first edit here (see
 * ensureCategoriesSeeded), so until someone touches this page the marketplace
 * browses off the defaults in code exactly as before.
 */
export default function AdminCategoriesPage() {
  const user = useUser();
  const categories = useStoreValue(getCategories);
  const counts = useStoreValue(() =>
    Object.fromEntries(
      getCategories().map((c) => [c.id, countListingsInCategory(c.id)])
    )
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user || user.role !== "admin") {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Admins only</h1>
        <p className="mt-2 text-[var(--muted)]">
          Browse filters shape what every buyer sees, so only marketplace admins
          can change them.
        </p>
        <ButtonLink href="/" className="mt-6" variant="secondary">Home</ButtonLink>
      </Section>
    );
  }

  /** Every write goes through here, so one failure can't leave the page stuck. */
  async function run(action: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't save. Check your admin access and try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section className="max-w-4xl py-12">
      <ButtonLink href="/admin" variant="ghost" size="sm">← Admin console</ButtonLink>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Browse filters</h1>
      <p className="mt-1 max-w-2xl text-[var(--muted)]">
        The chips buyers filter by on the home page and /browse, and the list
        sellers pick from when they submit a tool. Changes are live immediately
        — no deploy.
      </p>

      {error && (
        <p className="mt-6 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="mt-8 space-y-3">
        {categories.map((c, i) => (
          <CategoryRow
            key={c.id}
            category={c}
            count={counts[c.id] ?? 0}
            others={categories.filter((o) => o.id !== c.id)}
            isFirst={i === 0}
            isLast={i === categories.length - 1}
            busy={busy}
            onSave={(patch) => run(() => updateCategory(c.id, patch))}
            onMove={(dir) => run(() => moveCategory(c.id, dir))}
            onDelete={(reassignTo) => run(() => deleteCategory(c.id, reassignTo))}
          />
        ))}
      </div>

      <NewCategoryForm
        busy={busy}
        existingIds={categories.map((c) => c.id)}
        onCreate={(label, hint) => run(() => createCategory(label, hint))}
      />
    </Section>
  );
}

/** One filter: rename it, reword its hint, reorder it, or retire it. */
function CategoryRow({
  category,
  count,
  others,
  isFirst,
  isLast,
  busy,
  onSave,
  onMove,
  onDelete,
}: {
  category: CategoryDef;
  count: number;
  others: CategoryDef[];
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onSave: (patch: { label: string; hint: string }) => Promise<void>;
  onMove: (direction: -1 | 1) => Promise<void>;
  onDelete: (reassignTo?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(category.label);
  const [hint, setHint] = useState(category.hint ?? "");
  const [confirming, setConfirming] = useState(false);
  // Where this filter's tools go when it's retired. Only asked for when it
  // actually has any — see deleteCategory.
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Name
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Hint for sellers
            </label>
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="What belongs in here"
              className={`${inputClass} mt-1`}
            />
          </div>
          {/*
            The id is deliberately not editable: it's the value stored on every
            listing filed here, so changing it would strand them. Renaming is
            free precisely because the id stays put.
          */}
          <p className="text-xs text-[var(--muted)]">
            Filed on listings as <span className="font-mono">{category.id}</span> — renaming
            doesn&apos;t change that, so nothing gets re-filed.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy || !label.trim()}
              onClick={async () => {
                await onSave({ label, hint });
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setLabel(category.label);
                setHint(category.hint ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{category.label}</span>
              <Badge tone={count > 0 ? "accent" : "neutral"}>
                {count} {count === 1 ? "tool" : "tools"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {category.hint || "No hint yet — sellers see nothing under the picker."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <IconButton
              label="Move up"
              disabled={busy || isFirst}
              onClick={() => onMove(-1)}
            >
              ↑
            </IconButton>
            <IconButton
              label="Move down"
              disabled={busy || isLast}
              onClick={() => onMove(1)}
            >
              ↓
            </IconButton>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </Button>
            {/* A plain button rather than <Button variant="ghost">: the shared
                variants set their own text colour, and two competing text-*
                utilities resolve by stylesheet order, not by which one is
                written last. */}
            <button
              disabled={busy}
              onClick={() => setConfirming((v) => !v)}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)] disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {confirming && !editing && (
        <div className="mt-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger-soft)]/40 p-4">
          {count > 0 ? (
            <>
              <p className="text-sm">
                <strong>{count}</strong> {count === 1 ? "tool is" : "tools are"} filed
                under “{category.label}”. Deleting it moves {count === 1 ? "it" : "them"} to
                another filter — they stay published either way.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="text-sm">Move to</label>
                <select
                  value={moveTo}
                  onChange={(e) => setMoveTo(e.target.value)}
                  className="rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
                >
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy || !moveTo}
                  onClick={async () => {
                    await onDelete(moveTo);
                    setConfirming(false);
                  }}
                >
                  Move &amp; delete
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">
                Delete “{category.label}”? Nothing is filed under it.
              </p>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  await onDelete();
                  setConfirming(false);
                }}
              >
                Delete
              </Button>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewCategoryForm({
  busy,
  existingIds,
  onCreate,
}: {
  busy: boolean;
  existingIds: string[];
  onCreate: (label: string, hint: string) => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [hint, setHint] = useState("");

  const id = toCategoryId(label);
  const taken = Boolean(id) && existingIds.includes(id);

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-[var(--border-strong)] p-5">
      <h2 className="font-semibold">Add a filter</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        New filters go to the end of the row, so adding one never reshuffles the
        chips buyers already know.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Name
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Customer support"
            className={`${inputClass} mt-1`}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Hint for sellers
          </label>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Inboxes, help docs, ticket triage"
            className={`${inputClass} mt-1`}
          />
        </div>
      </div>

      {id && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Filed on listings as <span className="font-mono">{id}</span>
          {taken && (
            <span className="text-[var(--danger)]"> — that filter already exists.</span>
          )}
        </p>
      )}

      <Button
        className="mt-4"
        disabled={busy || !label.trim() || !id || taken}
        onClick={async () => {
          await onCreate(label, hint);
          setLabel("");
          setHint("");
        }}
      >
        Add filter
      </Button>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border)] text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)] disabled:opacity-40 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
