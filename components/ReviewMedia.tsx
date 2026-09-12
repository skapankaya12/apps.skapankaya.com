"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Listing } from "@/lib/types";
import { MAX_DEMO_SECONDS } from "@/lib/media";
import { isImageSrc } from "@/lib/utils";

/**
 * Everything visual a seller submitted, laid out for the person deciding on it.
 *
 * Not the buyer's gallery. That one is built to sell: one stage, muted video,
 * five screenshots at most, and a demo that fails to decode quietly steps aside.
 * A reviewer needs the opposite on every count. Every file is shown at once so
 * nothing hides behind an arrow, the video plays with sound because narration
 * is part of what is being approved, anything past the first five is shown
 * and flagged rather than dropped, and a file that will not load says so loudly
 * instead of disappearing, because a broken demo is a reason to reject.
 */
export function ReviewMedia({ listing }: { listing: Listing }) {
  const shots = listing.screenshots ?? [];
  const images = shots.filter(isImageSrc);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <DemoVideo listing={listing} />

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Screenshots ({shots.length})
          </h2>
          {images.length > 0 && (
            <span className="text-xs text-[var(--muted)]">
              Click one to see it full size
            </span>
          )}
        </div>
        {shots.length > 5 && (
          <p className="mt-2 text-sm text-[var(--warning)]">
            Only the first 5 appear on the listing page.
          </p>
        )}
        {shots.length === 0 ? (
          <Empty>No screenshots</Empty>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {shots.map((src, i) =>
              isImageSrc(src) ? (
                <Shot
                  key={`${i}-${src}`}
                  src={src}
                  n={i + 1}
                  hidden={i >= 5}
                  onOpen={() => setOpen(images.indexOf(src))}
                />
              ) : (
                // Seed listings store a text label rather than a file.
                <div
                  key={`${i}-${src}`}
                  className="grid aspect-video place-items-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4 text-center text-sm text-[var(--muted)]"
                >
                  {src}
                </div>
              )
            )}
          </div>
        )}
      </div>

      <CardImage listing={listing} />

      {open !== null && images.length > 0 && (
        <Lightbox
          images={images}
          index={open}
          onIndex={setOpen}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

/** The file's extension, read from a Storage URL's encoded object path. */
function extensionOf(src: string): string {
  try {
    const path = decodeURIComponent(new URL(src).pathname);
    const m = /\.([a-z0-9]{2,5})$/i.exec(path);
    return m ? m[1].toLowerCase() : "";
  } catch {
    return "";
  }
}

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function DemoVideo({ listing }: { listing: Listing }) {
  const src = listing.demoVideo;
  const [meta, setMeta] = useState<{ w: number; h: number; d: number } | null>(
    null
  );
  const [failed, setFailed] = useState(false);
  const ext = src ? extensionOf(src) : "";

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Demo video
        </h2>
        {src && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
            {meta && (
              <span className="tabular-nums">
                {meta.w}×{meta.h} ·{" "}
                <span
                  className={
                    meta.d > MAX_DEMO_SECONDS + 1
                      ? "font-semibold text-[var(--warning)]"
                      : undefined
                  }
                >
                  {formatDuration(meta.d)}
                </span>
              </span>
            )}
            {ext && <span className="uppercase">{ext}</span>}
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--accent)] hover:underline"
            >
              Open file
            </a>
          </span>
        )}
      </div>

      {!src ? (
        <Empty tone="warning">
          No demo video uploaded.
        </Empty>
      ) : failed ? (
        <Empty tone="danger">
          This video won&apos;t play in this browser
          {ext ? ` (.${ext})` : ""}. Buyers on it won&apos;t see a demo either.
          Try Open file, or ask the seller for an MP4.
        </Empty>
      ) : (
        <video
          key={src}
          src={src}
          controls
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setMeta({ w: v.videoWidth, h: v.videoHeight, d: v.duration });
          }}
          onError={() => setFailed(true)}
          className="mt-3 aspect-video w-full rounded-2xl border border-[var(--border)] bg-black object-contain"
        />
      )}
    </div>
  );
}

function Shot({
  src,
  n,
  hidden,
  onOpen,
}: {
  src: string;
  n: number;
  /** Past the first five, so buyers never see it. */
  hidden: boolean;
  onOpen: () => void;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="grid aspect-video place-items-center rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-center text-sm text-[var(--danger)]">
        <span>
          Screenshot {n} won&apos;t load.{" "}
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            Open file
          </a>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open screenshot ${n} full size`}
      className={`group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-left outline-none transition-colors hover:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${
        hidden ? "opacity-60" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Screenshot ${n}`}
        loading="lazy"
        onLoad={(e) =>
          setSize({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
        onError={() => setFailed(true)}
        className="aspect-video w-full object-contain"
      />
      <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-xs font-medium tabular-nums text-white">
        {n}
      </span>
      {size && (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-xs tabular-nums text-white">
          {size.w}×{size.h}
        </span>
      )}
    </button>
  );
}

/**
 * The still a browse card shows before its demo plays. Worth its own look: it
 * is the first thing a buyer sees of the tool, and it is cut from the video
 * automatically, so nobody chose it.
 */
function CardImage({ listing }: { listing: Listing }) {
  const fallback = listing.screenshots?.find(isImageSrc);
  const src = listing.posterImage || fallback;
  if (!src) return null;

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        Card image
      </h2>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Browse card image"
          loading="lazy"
          className="aspect-video w-56 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] object-contain"
        />
        <p className="max-w-xs text-sm text-[var(--muted)]">
          {listing.posterImage
            ? "The browse card shows this until the demo plays. It is the video's first frame."
            : "No frame was cut from the video, so the browse card uses the first screenshot."}
        </p>
      </div>
    </div>
  );
}

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const count = images.length;
  const go = useCallback(
    (delta: number) => onIndex((index + delta + count) % count),
    [index, count, onIndex]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    // The page behind would otherwise scroll under the wheel.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  const src = images[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Screenshot ${index + 1} of ${count}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-white">
        <span className="tabular-nums">
          {index + 1} / {count}
        </span>
        <div className="flex items-center gap-4">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:underline"
          >
            Open original
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-4 sm:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`Screenshot ${index + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain"
        />
        {count > 1 && (
          <>
            <LightboxArrow direction="prev" onClick={() => go(-1)} />
            <LightboxArrow direction="next" onClick={() => go(1)} />
          </>
        )}
      </div>
    </div>
  );
}

function LightboxArrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={isPrev ? "Previous screenshot" : "Next screenshot"}
      className={`absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 ${
        isPrev ? "left-2 sm:left-4" : "right-2 sm:right-4"
      }`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={isPrev ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </button>
  );
}

function Empty({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  const style =
    tone === "danger"
      ? "border-[var(--danger)] bg-[var(--danger-soft)] text-[var(--danger)]"
      : tone === "warning"
        ? "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--warning)]"
        : "border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--muted)]";
  return (
    <div className={`mt-3 rounded-xl border px-4 py-6 text-center text-sm ${style}`}>
      {children}
    </div>
  );
}
