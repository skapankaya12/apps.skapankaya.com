"use client";

import Link from "next/link";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getListings, formatPrice } from "@/lib/store";
import { CATEGORY_LABELS } from "@/lib/types";
import { Section, ButtonLink, Badge, StatusBadge } from "@/components/ui";
import { Monogram } from "@/components/Monogram";

export default function AdminPage() {
  const user = useUser();
  const all = useStoreValue(() => getListings());

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
      <h1 className="text-3xl font-semibold tracking-tight">Admin console</h1>
      <p className="mt-1 text-[var(--muted)]">Review submissions and monitor the marketplace.</p>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label="Pending review" value={String(pending.length)} accent />
        <Stat label="Live listings" value={String(approved.length)} />
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
                  <Badge tone="neutral">{CATEGORY_LABELS[l.category]}</Badge>
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

      {/* Recently reviewed */}
      {(approved.length > 0 || rejected.length > 0) && (
        <>
          <h2 className="mt-12 text-lg font-semibold">All listings</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">App</th>
                  <th className="px-5 py-3 font-medium">Seller</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Sales</th>
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
                    <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-5 py-3 tabular-nums">{l.salesCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-[var(--accent)]/40 bg-[var(--accent-soft)]/40"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}
