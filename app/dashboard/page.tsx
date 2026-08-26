"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getListings,
  formatPrice,
  getIdToken,
  refreshPayoutStatus,
  setListingOnSale,
} from "@/lib/store";
import { brand } from "@/lib/brand";
import type { AppUser, Listing, SellerStats } from "@/lib/types";
import { Section, Button, ButtonLink, Badge, StatusBadge } from "@/components/ui";
import { Monogram } from "@/components/Monogram";

export default function DashboardPage() {
  const user = useUser();
  const listings = useStoreValue(() =>
    user ? getListings({ sellerId: user.uid }) : []
  );
  // Above the early return below, because a hook cannot be called
  // conditionally. The flag is what stops a buyer landing here from firing a
  // request for a seller's numbers they do not have.
  const stats = useSellerStats(user?.role === "seller" || user?.role === "admin");

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

  const live = listings.filter((l) => l.status === "approved");
  // Sales are counted across every listing, not just the live ones: a seller
  // who takes a tool off sale has still been paid for what it sold, and showing
  // that drop to zero would read as the marketplace losing their money.
  const totalSales = listings.reduce((s, l) => s + l.salesCount, 0);
  /*
    Earnings come from what was actually charged, not from the listing's price
    today.

    This used to be `salesCount * priceCents`, which quietly rewrote history
    whenever a price changed: ten sales at $15 became $400 of "earnings" after a
    rise to $40. The real amounts are on the purchase rows, which a seller
    cannot read (they belong to the buyer), so the sum arrives from the server.
  */
  const netCents = stats
    ? Math.round(stats.grossCents * (1 - brand.commissionRate))
    : null;

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
        <Stat label="Live listings" value={String(live.length)} />
        <Stat label="Total sales" value={String(totalSales)} />
        <Stat
          label="Your earnings (net)"
          value={netCents === null ? "…" : formatPrice(netCents)}
          hint={
            stats && !stats.complete
              ? "partial: some older sales aren't counted yet"
              : `after ${Math.round(brand.commissionRate * 100)}% fee`
          }
        />
      </div>

      {/* Payouts */}
      <PayoutsCard user={user} />

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
        // overflow-x-auto, not overflow-hidden: with five columns this table no
        // longer fits a phone, and the choice is between scrolling it and
        // crushing the columns until the actions are unreadable.
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">App</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Saves</th>
                <th className="px-5 py-3 font-medium">Sales</th>
                {/* A real label, not an sr-only span: absolutely positioned
                    sr-only text inside a horizontally scrolled table escapes
                    the scroll container and stretches the document instead. */}
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id} className="border-t border-[var(--border)]">
                  <td className="px-5 py-4">
                    <ListingName listing={l} />
                    {l.status === "rejected" && l.reviewNote && (
                      <p className="mt-2 text-xs text-[var(--danger)]">
                        Rejected: {l.reviewNote}
                      </p>
                    )}
                    {l.status === "unlisted" && (
                      <p className="mt-2 text-xs text-[var(--muted)]">
                        Not on sale. Everyone who already bought it keeps their
                        download.
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-4 tabular-nums">{formatPrice(l.priceCents)}</td>
                  {/* The true count, not the public one: a seller should see
                      that forty people saved a tool and none bought it, which
                      is the most useful thing this number can tell them. */}
                  <td className="px-5 py-4 tabular-nums text-[var(--muted)]">
                    {stats ? (stats.saves[l.id] ?? 0) : "…"}
                  </td>
                  <td className="px-5 py-4 tabular-nums">{l.salesCount}</td>
                  <td className="px-5 py-4">
                    <RowActions listing={l} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

/**
 * The listing's name, linked to its public page only when there is one.
 *
 * Previously this rendered href="#" for anything not approved, which looks like
 * a link, tabs like a link, and does nothing.
 */
function ListingName({ listing }: { listing: Listing }) {
  const inner = (
    <>
      <Monogram title={listing.title} className="h-9 w-9 rounded-lg text-sm" />
      <span>
        <span className="font-medium">{listing.title}</span>
        <span className="block text-xs text-[var(--muted)]">
          v{listing.version}
        </span>
      </span>
    </>
  );

  if (listing.status !== "approved") {
    return <div className="flex items-center gap-3">{inner}</div>;
  }
  return (
    <Link href={`/app/${listing.slug}`} className="flex items-center gap-3">
      {inner}
    </Link>
  );
}

/**
 * Edit, and take off sale or put back.
 *
 * Edit is offered for every status. It used to appear only on a rejected
 * listing, which left a seller with a live tool no way to fix a typo in it at
 * all: the route existed, but nothing linked to it.
 */
function RowActions({ listing }: { listing: Listing }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onSale = listing.status === "approved";
  const reviewed = onSale || listing.status === "unlisted";

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      await setListingOnSale(listing.id, !onSale);
    } catch {
      setError("Didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      <ButtonLink
        href={`/dashboard/new?edit=${listing.id}`}
        variant="secondary"
        size="sm"
      >
        Edit
      </ButtonLink>
      {reviewed && (
        <Button variant="ghost" size="sm" onClick={toggle} disabled={busy}>
          {busy ? "…" : onSale ? "Take off sale" : "Put back on sale"}
        </Button>
      )}
      {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
    </div>
  );
}

/**
 * The signed-in seller's own numbers, from /api/seller/stats.
 *
 * Fetched rather than read from the store because the rows behind them are
 * private in the Firestore rules: a save is readable only by the person who
 * made it and a purchase only by its buyer, so these totals exist server-side
 * or not at all. Null while in flight, so the dashboard can say "not known
 * yet" rather than showing a zero that means something else.
 */
function useSellerStats(enabled: boolean): SellerStats | null {
  const [stats, setStats] = useState<SellerStats | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/seller/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (alive && res.ok) setStats(data as SellerStats);
      } catch {
        // A missing number is not worth an error state on the dashboard.
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return stats;
}

function PayoutsCard({ user }: { user: AppUser }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Kept apart from `error` so the expected pre-launch case isn't shown in red.
  const [notice, setNotice] = useState("");

  const active = user.stripeChargesEnabled === true;
  const started = Boolean(user.stripeAccountId);

  // Once onboarding has started but isn't confirmed active, re-sync from Stripe.
  // Covers the return from Express onboarding: the status route updates the user
  // doc and the live listener flips the badge to "Active". Runs once per mount
  // while pending (the `account.updated` webhook is intentionally not wired).
  useEffect(() => {
    if (started && !active) refreshPayoutStatus();
  }, [started, active]);

  async function go() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const token = await getIdToken();
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      // Pre-launch this is the expected path, not a fault: payments aren't
      // switched on until the public launch. Say so plainly, so a seller
      // listing early doesn't read it as the site being broken.
      if (data.error === "not-configured") {
        setNotice(
          "Payouts open in September, before the public launch. You can list your tool now and connect your bank then — nothing can be sold until you do."
        );
      } else {
        setError("Couldn't start payout setup. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Payouts</h2>
            {active ? (
              <Badge tone="success">Active</Badge>
            ) : started ? (
              <Badge tone="warning">Finish setup</Badge>
            ) : (
              <Badge tone="neutral">Not set up</Badge>
            )}
          </div>
          <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
            {active
              ? "You're all set. Your share of each sale is paid out to your bank monthly, via Stripe."
              : "Connect your bank through Stripe to get paid. Buyers can't purchase your tools until this is done."}
          </p>
          {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
          {notice && (
            <p className="mt-3 max-w-md rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--foreground)]">
              {notice}
            </p>
          )}
        </div>
        <Button onClick={go} disabled={busy} variant={active ? "secondary" : "primary"}>
          {busy ? "…" : active ? "Manage payouts" : started ? "Finish setup" : "Set up payouts"}
        </Button>
      </div>
    </div>
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
