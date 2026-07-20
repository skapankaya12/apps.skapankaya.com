"use client";

import Link from "next/link";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getListings, formatPrice } from "@/lib/store";
import { brand } from "@/lib/brand";
import { Section, ButtonLink, StatusBadge } from "@/components/ui";
import { Monogram } from "@/components/Monogram";

export default function DashboardPage() {
  const user = useUser();
  const listings = useStoreValue(() =>
    user ? getListings({ sellerId: user.uid }) : []
  );

  if (!user || (user.role !== "seller" && user.role !== "admin")) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Seller dashboard</h1>
        <p className="mt-2 text-[var(--muted)]">
          You need a seller account to view this.
        </p>
        <ButtonLink href="/sell" className="mt-6">Become a seller</ButtonLink>
      </Section>
    );
  }

  const approved = listings.filter((l) => l.status === "approved");
  const totalSales = approved.reduce((s, l) => s + l.salesCount, 0);
  const grossCents = approved.reduce((s, l) => s + l.salesCount * l.priceCents, 0);
  const netCents = Math.round(grossCents * (1 - brand.commissionRate));

  return (
    <Section className="py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Seller dashboard</h1>
          <p className="mt-1 text-[var(--muted)]">Welcome back, {user.displayName}.</p>
        </div>
        <ButtonLink href="/dashboard/new">+ New listing</ButtonLink>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Live listings" value={String(approved.length)} />
        <Stat label="Total sales" value={String(totalSales)} />
        <Stat
          label="Your earnings (net)"
          value={formatPrice(netCents)}
          hint={`after ${Math.round(brand.commissionRate * 100)}% fee`}
        />
      </div>

      {/* Listings */}
      <h2 className="mt-12 text-lg font-semibold">Your apps</h2>
      {listings.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] py-14 text-center">
          <p className="text-[var(--muted)]">No listings yet.</p>
          <ButtonLink href="/dashboard/new" className="mt-4" variant="secondary">
            Create your first listing
          </ButtonLink>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">App</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Sales</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-t border-[var(--border)]">
                  <td className="px-5 py-4">
                    <Link
                      href={l.status === "approved" ? `/app/${l.slug}` : "#"}
                      className="flex items-center gap-3"
                    >
                      <Monogram title={l.title} className="h-9 w-9 rounded-lg text-sm" />
                      <span>
                        <span className="font-medium">{l.title}</span>
                        <span className="block text-xs text-[var(--muted)]">
                          v{l.version}
                        </span>
                      </span>
                    </Link>
                    {l.status === "rejected" && l.reviewNote && (
                      <p className="mt-2 text-xs text-[var(--danger)]">
                        Rejected: {l.reviewNote}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-4 tabular-nums">{formatPrice(l.priceCents)}</td>
                  <td className="px-5 py-4 tabular-nums">{l.salesCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="text-sm text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-[var(--muted)]">{hint}</div>}
    </div>
  );
}
