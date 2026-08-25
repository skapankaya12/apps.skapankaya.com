"use client";

import { useEffect, useRef, useState } from "react";
import { fetchUsers } from "@/lib/store";
import type { AdminUserList, Role } from "@/lib/types";
import { Badge } from "@/components/ui";
import { Monogram } from "@/components/Monogram";

/**
 * Slide-over panel listing every registered account, opened from the
 * "Registered users" stat in the admin console.
 *
 * Fetched when it first opens rather than with the page: the console is opened
 * many times a day to clear the review queue, and the list is only wanted when
 * somebody asks for it. Kept in state afterwards so reopening is instant, with
 * a refresh for when it matters.
 */
export function AdminUsersPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [list, setList] = useState<AdminUserList | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // First open fetches; later opens reuse what's already here. The only state
  // this sets is in the promise callback, so opening the panel doesn't cascade
  // a second render before the request has even left.
  useEffect(() => {
    if (!open || list !== null || failed) return;
    let live = true;
    fetchUsers().then((next) => {
      if (!live) return;
      if (next === null) setFailed(true);
      else setList(next);
    });
    return () => {
      live = false;
    };
  }, [open, list, failed]);

  // Refresh, and Try again after a failure. An event handler, so it can set
  // state directly. It clears `failed` only on success: clearing it up front
  // would re-arm the effect above and fire a second, duplicate request.
  async function reload() {
    setBusy(true);
    const next = await fetchUsers();
    if (next === null) {
      setFailed(true);
    } else {
      setList(next);
      setFailed(false);
    }
    setBusy(false);
  }

  // Waiting on the first fetch, or on a manual refresh.
  const loading = busy || (open && list === null && !failed);

  // Escape closes, and the close button takes focus so the keyboard lands
  // inside the panel rather than back at the top of the page behind it.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const users = list?.users ?? null;
  const total = list?.total ?? 0;
  const counts = list?.counts;
  // Only ever true on a collection larger than the server's cap.
  const capped = list !== null && list.total > list.users.length;

  return (
    <>
      {/* Scrim. Click anywhere off the panel to dismiss. */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Registered users"
        aria-hidden={!open}
        // The panel stays mounted so it can slide, which would otherwise leave
        // its close button and links in the tab order behind the page. React 19
        // passes `inert` through, so a closed panel is out of reach of the
        // keyboard as well as the mouse.
        inert={!open}
        className={`fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold">Registered users</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {list === null
                ? "Everyone with an account, newest first."
                : `${total} ${total === 1 ? "account" : "accounts"}: ${counts?.seller ?? 0} selling, ${counts?.buyer ?? 0} buying, ${counts?.admin ?? 0} admin.`}
            </p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && users === null && (
            <p className="py-10 text-center text-sm text-[var(--muted)]">
              Loading accounts...
            </p>
          )}

          {failed && !loading && users === null && (
            <div className="py-10 text-center">
              <p className="text-sm text-[var(--muted)]">
                Could not load the accounts.
              </p>
              <button
                onClick={reload}
                className="mt-3 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {users !== null && users.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--muted)]">
              No accounts yet.
            </p>
          )}

          {users !== null && users.length > 0 && (
            <>
              <p className="pb-2 text-xs uppercase tracking-wide text-[var(--muted)]">
                Newest first
              </p>
              <ul className="divide-y divide-[var(--border)]">
                {users.map((u) => (
                  <li key={u.uid} className="flex items-center gap-3 py-3">
                    <Monogram
                      title={u.displayName || u.email || "?"}
                      className="h-9 w-9 text-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {u.displayName || "No name"}
                        </span>
                        <RoleBadge role={u.role} />
                        {u.role === "seller" && u.chargesEnabled && (
                          <Badge tone="success">Payouts on</Badge>
                        )}
                      </div>
                      <p className="truncate text-sm text-[var(--muted)]">
                        {u.email || "No email"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--muted)] tabular-nums">
                      {joined(u.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
              {capped && (
                <p className="pt-4 text-center text-xs text-[var(--muted)]">
                  Showing the {users.length} newest of {total}.
                </p>
              )}
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-3">
          {failed && users !== null && (
            <span className="text-xs text-[var(--muted)]">
              Could not refresh. Showing what loaded last.
            </span>
          )}
          <button
            onClick={reload}
            disabled={loading}
            className="text-sm font-medium text-[var(--accent)] hover:underline disabled:opacity-50"
          >
            Refresh
          </button>
        </footer>
      </aside>
    </>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const map = {
    admin: { tone: "accent" as const, label: "Admin" },
    seller: { tone: "neutral" as const, label: "Seller" },
    buyer: { tone: "neutral" as const, label: "Buyer" },
  };
  const { tone, label } = map[role];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Join date, or nothing when the account predates the createdAt field. */
function joined(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
