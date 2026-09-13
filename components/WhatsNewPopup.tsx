"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { getAuthResolved } from "@/lib/store";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  WHATS_NEW_CLOSED_KEY,
  WHATS_NEW_MAX_ROWS,
  WHATS_NEW_NEVER_KEY,
  WHATS_NEW_SNOOZE_MS,
  WHATS_NEW_WINDOW_MS,
  type WhatsNewItem,
} from "@/lib/whatsNew";
import { UserAvatars } from "./ui/user-avatars";
import { Monogram } from "./Monogram";
import { SellerAvatar } from "./SellerAvatar";

/**
 * "New this week": the listings that went on sale in the last seven days,
 * shown once a visit to people who are not signed in.
 *
 * Drawn from the seller emails in design/emails/ (the card, the gradient
 * words, the lowercase voice, the image beside the text), at popup size. One
 * or two new tools read as sentences ("meet X, built by Y"); three or more
 * turn into a table, since a paragraph per tool stops being news by the third.
 *
 * Nothing shows when nothing is new. A signed-in account is a seller or an
 * admin in this phase, who already knows. `?whatsnew` on any page opens it
 * regardless, for a look: `?whatsnew` alone with this week's listings,
 * `?whatsnew=3` with the three most recent whatever their age, and in
 * development `?whatsnew=sample-4` with four invented ones. A preview
 * remembers nothing, so it never snoozes the real popup in that browser.
 */

/** Pages where a popup would get in the way of what the visitor came to do. */
const QUIET_PATHS = [
  "/login",
  "/checkout",
  "/cart",
  "/admin",
  "/dashboard",
  "/account",
  "/library",
];

/** Long enough for the page to be read first, short enough to still be the same visit. */
const OPEN_DELAY_MS = 1500;

type Preview = { count?: number; sample?: boolean };

function previewFromUrl(): Preview | null {
  const value = new URLSearchParams(window.location.search).get("whatsnew");
  if (value === null) return null;
  // Invented listings, for local design review only (lib/whatsNewSamples.ts).
  const sample =
    process.env.NODE_ENV === "development" && value.startsWith("sample");
  const n = Number.parseInt(sample ? value.slice("sample-".length) : value, 10);
  return {
    count: Number.isFinite(n) && n > 0 ? n : sample ? 2 : undefined,
    sample,
  };
}

async function loadItems(preview: Preview | null): Promise<WhatsNewItem[]> {
  // The environment check sits beside the import, not only in previewFromUrl,
  // so the production build can see the branch is dead and drop the chunk.
  if (process.env.NODE_ENV === "development" && preview?.sample) {
    const { sampleWhatsNew } = await import("@/lib/whatsNewSamples");
    return sampleWhatsNew(preview.count ?? 2);
  }
  const res = await fetch("/api/whats-new");
  if (!res.ok) return [];
  const { items } = (await res.json()) as { items: WhatsNewItem[] };
  if (preview?.count) return items.slice(0, preview.count);
  const since = Date.now() - WHATS_NEW_WINDOW_MS;
  return items.filter((i) => i.listedAt >= since);
}

function snoozed(): boolean {
  try {
    if (localStorage.getItem(WHATS_NEW_NEVER_KEY)) return true;
    const closedAt = Number(localStorage.getItem(WHATS_NEW_CLOSED_KEY));
    return Date.now() - closedAt < WHATS_NEW_SNOOZE_MS;
  } catch {
    // Storage blocked: better to show it every visit than to never show it.
    return false;
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function makerLabel(maker: WhatsNewItem["maker"]): string {
  return maker.xHandle ? `@${maker.xHandle}` : maker.name;
}

export function WhatsNewPopup() {
  const user = useUser();
  const authResolved = useStoreValue(getAuthResolved);
  const pathname = usePathname();

  const [items, setItems] = useState<WhatsNewItem[] | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const opened = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened.current) return;
    const preview = previewFromUrl();
    if (!preview) {
      if (!authResolved || user) return;
      if (QUIET_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)))
        return;
      if (snoozed()) return;
    }

    let cancelled = false;
    const timer = setTimeout(
      async () => {
        try {
          const picked = await loadItems(preview);
          if (cancelled || picked.length === 0) return;
          opened.current = true;
          setIsPreview(Boolean(preview));
          setItems(picked);
        } catch {
          // Offline or the route failed: no popup is the right fallback.
        }
      },
      preview ? 0 : OPEN_DELAY_MS
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authResolved, user, pathname]);

  // Open as a modal once there is something to show. <dialog> brings Escape,
  // the focus trap and the inert page behind it for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!items || !dialog || dialog.open) return;
    dialog.showModal();
    // showModal focuses the close button, and Chrome rings it as if the
    // visitor had tabbed there. The card takes focus instead; Tab still
    // reaches the close button first.
    cardRef.current?.focus();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = before;
    };
  }, [items]);

  if (!items) return null;

  function close() {
    dialogRef.current?.close();
  }

  function neverAgain() {
    if (!isPreview) remember(WHATS_NEW_NEVER_KEY, "1");
    close();
  }

  // Escape, the close button, the backdrop and every link all land here.
  function onClosed() {
    if (!isPreview) remember(WHATS_NEW_CLOSED_KEY, String(Date.now()));
    setItems(null);
  }

  const count = items.length;
  const rows = items.slice(0, WHATS_NEW_MAX_ROWS);
  const extra = count - rows.length;
  const asTable = count > 2;

  // One face per maker, however many tools they shipped this week.
  const makers = [
    ...new Map(
      items.map((i) => [i.maker.handle ?? i.maker.name, i.maker] as const)
    ).values(),
  ];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="whats-new-title"
      onClose={onClosed}
      // <dialog> closes on Escape by itself in current browsers; this covers
      // the embedded and older ones that never fire its cancel event.
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      className="m-auto w-[calc(100%-24px)] max-w-[580px] overflow-visible bg-transparent p-0 backdrop:bg-[rgba(16,16,20,0.45)] backdrop:backdrop-blur-[2px]"
    >
      <MotionConfig reducedMotion="user">
        <motion.div
          ref={cardRef}
          tabIndex={-1}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="relative max-h-[calc(100dvh-24px)] overflow-y-auto outline-none rounded-[22px] border border-[#ececef] bg-white px-6 pb-7 pt-8 text-[#101014] shadow-[0_24px_60px_rgba(16,16,20,0.18)] sm:px-10 sm:pb-9 sm:pt-10"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-[#6b6b76] transition-colors hover:bg-[#f4f4f6] hover:text-[#101014] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path
                d="M3.5 3.5l9 9m0-9l-9 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Hero: the email's greeting on the left, and where Sevval's photo
              sat in the email, the faces of the people who built these. */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="pr-8 sm:pr-0">
              <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-[#4f46e5]">
                new this week
              </p>
              <h2
                id="whats-new-title"
                className="mt-3 text-[26px] font-extrabold leading-[32px] tracking-[-0.025em] sm:text-[30px] sm:leading-[36px]"
              >
                <span className="bg-gradient-to-r from-[#6a4bf0] to-[#2f8bff] bg-clip-text text-transparent">
                  {count} new {count === 1 ? "listing" : "listings"}
                </span>{" "}
                in the marketplace
              </h2>
            </div>
            <div className="flex shrink-0 flex-col items-start sm:items-center">
              <UserAvatars
                users={makers.map((m, i) => ({
                  id: m.handle ?? `${m.name}-${i}`,
                  name: m.name,
                  image: m.avatarUrl,
                }))}
                size={46}
                maxVisible={5}
                overlap={makers.length > 3 ? 60 : 72}
                focusScale={1.15}
              />
              <p className="mt-1.5 text-[12px] font-semibold leading-[20px] text-[#6b6b76]">
                {makers.length === 1 ? "the maker" : "the makers"}
              </p>
            </div>
          </div>

          <div className="mt-7 border-t border-[#ececef]">
            {asTable ? (
              <WhatsNewTable rows={rows} onPick={close} />
            ) : (
              <ul className="divide-y divide-[#ececef] border-b border-[#ececef]">
                {rows.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/app/${item.slug}`}
                      onClick={close}
                      className="group -mx-3 flex flex-col gap-4 rounded-2xl px-3 py-5 transition-colors hover:bg-[#f5f7ff] sm:flex-row sm:items-start"
                    >
                      <Thumb item={item} className="h-[80px] w-[120px] rounded-[10px]" />
                      <div className="min-w-0">
                        <p className="text-[16px] leading-[25px] text-[#3a3a48]">
                          meet{" "}
                          <strong className="font-extrabold text-[#101014]">
                            {item.title}
                          </strong>
                          , built by{" "}
                          <strong className="font-bold text-[#101014]">
                            {makerLabel(item.maker)}
                          </strong>
                          .
                        </p>
                        <p className="mt-1 text-[15px] leading-[23px] text-[#4a4a56]">
                          {item.tagline}
                        </p>
                        <span className="mt-2 inline-block text-[13px] font-bold text-[#4f46e5] group-hover:underline">
                          View listing →
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {extra > 0 && (
            <p className="mt-4 text-[14px] leading-[22px] text-[#4a4a56]">
              and{" "}
              <Link
                href="/browse"
                onClick={close}
                className="font-bold text-[#4f46e5] underline"
              >
                {extra} more
              </Link>{" "}
              in the marketplace.
            </p>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/browse"
              onClick={close}
              className="inline-block rounded-full bg-[#4f46e5] px-5 py-2.5 text-[14px] font-bold leading-[18px] text-white transition-colors hover:bg-[#4338ca]"
            >
              Browse the marketplace
            </Link>
            <button
              type="button"
              onClick={neverAgain}
              className="text-[13px] font-semibold text-[#6b6b76] underline decoration-[#dcdce1] underline-offset-4 transition-colors hover:text-[#101014] hover:decoration-current"
            >
              Don&rsquo;t show again
            </button>
          </div>
        </motion.div>
      </MotionConfig>
    </dialog>
  );
}

/**
 * Three or more: one row per tool, maker in its own column. The header row is
 * what makes it read as a table rather than a longer list of sentences.
 */
function WhatsNewTable({
  rows,
  onPick,
}: {
  rows: WhatsNewItem[];
  onPick: () => void;
}) {
  return (
    <>
      <p className="pt-5 text-[16px] leading-[25px] text-[#3a3a48]">
        meet the new tools, and the people who built them.
      </p>
      <div
        aria-hidden
        className="mt-4 hidden grid-cols-[64px_1fr_150px] gap-4 border-b border-[#ececef] pb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8f8f9c] sm:grid"
      >
        <span />
        <span>tool</span>
        <span>built by</span>
      </div>
      <ul className="divide-y divide-[#ececef] border-b border-[#ececef] max-sm:mt-3 max-sm:border-t">
        {rows.map((item) => (
          <li key={item.id}>
            <Link
              href={`/app/${item.slug}`}
              onClick={onPick}
              className="-mx-3 grid grid-cols-[64px_1fr] items-center gap-x-4 rounded-xl px-3 py-3 transition-colors hover:bg-[#f5f7ff] sm:grid-cols-[64px_1fr_150px]"
            >
              <Thumb item={item} className="h-[43px] w-[64px] rounded-[8px]" />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-extrabold leading-[22px] text-[#101014]">
                  {item.title}
                </p>
                <p className="truncate text-[13px] leading-[20px] text-[#4a4a56]">
                  {item.tagline}
                </p>
                <p className="truncate text-[12px] font-semibold leading-[20px] text-[#6b6b76] sm:hidden">
                  by {makerLabel(item.maker)}
                </p>
              </div>
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <SellerAvatar
                  seller={{ displayName: item.maker.name, avatarUrl: item.maker.avatarUrl }}
                  size={24}
                />
                <span className="truncate text-[13px] font-semibold text-[#3a3a48]">
                  {makerLabel(item.maker)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Thumb({ item, className }: { item: WhatsNewItem; className: string }) {
  if (!item.image) {
    return <Monogram title={item.title} className={`${className} text-lg`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.image}
      alt=""
      loading="lazy"
      className={`shrink-0 border border-[#ececef] object-cover ${className}`}
    />
  );
}
