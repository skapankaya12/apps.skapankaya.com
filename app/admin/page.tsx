"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getListings, getCategories, formatPrice, fetchUserCount } from "@/lib/store";
import { categoryLabel } from "@/lib/types";
import { Section, ButtonLink, Badge, StatusBadge } from "@/components/ui";
import { AdminUsersPanel } from "@/components/AdminUsersPanel";
import { Monogram } from "@/components/Monogram";

export default function AdminPage() {
  const user = useUser();
  const all = useStoreValue(() => getListings());
  const categories = useStoreValue(getCategories);

  // Registered users. Not part of the store's live caches: nothing else on the
  // site needs the number, and counting accounts client-side would mean pulling
  // every user doc down. Fetched once, when an admin lands here.
  const [userCount, setUserCount] = useState<number | null>(null);
  const [usersOpen, setUsersOpen] = useState(false);
  const isAdmin = user?.role === "admin";
  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    fetchUserCount().then((n) => {
      if (live) setUserCount(n);
    });
    return () => {
      live = false;
    };
  }, [isAdmin]);

  if (!user || user.role !== "admin") {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Admins only</h1>
        <p className="mt-2 text-[var(--muted)]">
          This area is for marketplace admins. If that should be you, sign in
          with your admin account.
        </p>
        <ButtonLink href="/" className="mt-6" variant="secondary">Home</ButtonLink>
      </Section>
    );
  }

  const pending = all.filter((l) => l.status === "pending");
  const approved = all.filter((l) => l.status === "approved");
  const rejected = all.filter((l) => l.status === "rejected");
  const gmvCents = approved.reduce((s, l) => s + l.salesCount * l.priceCents, 0);

  return (
    <Section className="py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin console</h1>
        <p className="mt-1 text-[var(--muted)]">Review submissions and monitor the marketplace.</p>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Pending review" value={String(pending.length)} accent />
        <Stat label="Live listings" value={String(approved.length)} />
        {/* The only stat that isn't already on the page below it, so it's the
            only one worth opening: the panel lists who the accounts are. An
            ellipsis rather than 0 until the count arrives, so a slow or failed
            fetch never reads as an empty marketplace. */}
        <Stat
          label="Registered users"
          value={userCount === null ? "\u2026" : String(userCount)}
          onClick={() => setUsersOpen(true)}
        />
        <Stat label="Total GMV" value={formatPrice(gmvCents)} />
        <Stat
          label="Platform revenue"
          value={formatPrice(Math.round(gmvCents * 0.15))}
        />
      </div>

      {/* Review queue */}
      <div className="mt-12 flex items-center gap-3">
        <h2 className="text-lg font-semibold">Review queue</h2>
        {pending.length > 0 && <Badge tone="warning">{pending.length} waiting</Badge>}
      </div>

      {pending.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] py-14 text-center">
          <p className="text-[var(--muted)]">🎉 Queue is clear. No apps waiting for review.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {pending.map((l) => (
            <Link
              key={l.id}
              href={`/admin/${l.id}`}
              className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--border-strong)]"
            >
              <Monogram title={l.title} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{l.title}</span>
                  <Badge tone="neutral">{categoryLabel(l.category, categories)}</Badge>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {l.tagline} · by {l.sellerName} · {formatPrice(l.priceCents)}
                </p>
              </div>
              <span className="text-sm font-medium text-[var(--accent)]">Review →</span>
            </Link>
          ))}
        </div>
      )}

      {/* The other two admin screens. They used to be buttons beside the page
          title, which put marketplace-wide navigation above the one thing this
          page exists for. They belong after the queue they sit alongside: a
          listing review asks whether software is safe, a directory review asks
          whether a link is real and belongs, and the browse filters are what
          both get filed under.

          Nothing else in the app links to either route, so do not delete these
          without putting them somewhere: /admin/free is a review queue, and a
          queue nobody can reach is a queue nobody empties. */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <ButtonLink href="/admin/free" variant="secondary" size="sm">
          Free tools
        </ButtonLink>
        <ButtonLink href="/admin/categories" variant="secondary" size="sm">
          Browse filters
        </ButtonLink>
      </div>

      {/* Recently reviewed */}
      {(approved.length > 0 || rejected.length > 0) && (
        <>
          <h2 className="mt-12 text-lg font-semibold">All listings</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">App</th>
                  <th className="px-5 py-3 font-medium">Seller</th>
                  {/* Which browse filter it files under — editable on the
                      listing's review page. Shown here so a mis-filed tool can
                      be spotted without opening every one. */}
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Sales</th>
                  {/* Straight to the edit form. Most admin fixes — a typo, a
                      wrong filter, an unplayable demo — start from this table,
                      and routing them via the review page first is a click
                      spent re-reading a checklist nobody is filling in. */}
                  <th className="px-5 py-3 font-medium"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody>
                {[...approved, ...rejected].map((l) => (
                  <tr key={l.id} className="border-t border-[var(--border)]">
                    <td className="px-5 py-3">
                      <Link href={`/admin/${l.id}`} className="flex items-center gap-2 font-medium hover:text-[var(--accent)]">
                        {l.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[var(--muted)]">{l.sellerName}</td>
                    <td className="px-5 py-3 text-[var(--muted)]">
                      {categoryLabel(l.category, categories)}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-5 py-3 tabular-nums">{l.salesCount}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/${l.id}/edit`}
                        className="text-sm font-medium text-[var(--accent)] hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AdminUsersPanel open={usersOpen} onClose={() => setUsersOpen(false)} />
    </Section>
  );
}

function Stat({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  accent?: boolean;
  /** Present on stats that open something. Renders the tile as a button. */
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left ${
        accent
          ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]/40"
          : "border-[var(--border)] bg-[var(--surface)]"
      } ${
        onClick
          ? "transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
          : ""
      }`}
    >
      <div className="flex items-center gap-1 text-sm text-[var(--muted)]">
        {label}
        {onClick && (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M8 5l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </Tag>
  );
}
