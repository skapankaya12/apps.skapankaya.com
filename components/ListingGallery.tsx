"use client";

import { useEffect, useRef, useState } from "react";

type MediaItem =
  | { kind: "video"; src: string }
  | { kind: "image"; src: string }
  /** Seed/older listings store a plain text label instead of an image URL. */
  | { kind: "label"; src: string };

function classify(src: string): MediaItem {
  return /^https?:\/\//.test(src) || src.startsWith("/")
    ? { kind: "image", src }
    : { kind: "label", src };
}

/**
 * The listing's media, as one gallery: the demo video first, then screenshots.
 *
 * Previously the video and the screenshot strip were separate — the video got
 * the full width and the screenshots were 5 tiny squares underneath with no way
 * to see one properly. Now everything shares a single stage with prev/next
 * arrows, a counter, and a thumbnail strip, so a buyer can actually look at
 * what they're buying.
 */
export function ListingGallery({
  demoVideo,
  screenshots,
  title,
}: {
  demoVideo?: string;
  screenshots: string[];
  title: string;
}) {
  const items: MediaItem[] = [
    ...(demoVideo ? [{ kind: "video" as const, src: demoVideo }] : []),
    ...screenshots.slice(0, 5).map(classify),
  ];

  const [index, setIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const count = items.length;
  const current = items[index];

  // Moving off the video should stop it — otherwise its audio keeps playing
  // over a screenshot the buyer has moved on to.
  useEffect(() => {
    if (current?.kind !== "video") videoRef.current?.pause();
  }, [current?.kind, index]);

  if (count === 0) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-sm text-[var(--muted)]">
        No demo video yet
      </div>
    );
  }

  function go(delta: number) {
    // Wrap around: with this few items, a dead-end arrow is more annoying than
    // a loop is confusing.
    setIndex((i) => (i + delta + count) % count);
  }

  return (
    <div>
      <div
        ref={stageRef}
        tabIndex={count > 1 ? 0 : -1}
        role={count > 1 ? "group" : undefined}
        aria-label={count > 1 ? `${title} media, ${index + 1} of ${count}` : undefined}
        onKeyDown={(e) => {
          if (count < 2) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            go(1);
          }
        }}
        className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-black outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        {current.kind === "video" ? (
          <video
            ref={videoRef}
            src={current.src}
            controls
            muted
            loop
            playsInline
            preload="metadata"
            className="aspect-video w-full"
          />
        ) : current.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.src}
            alt={`${title} — screenshot ${index + (demoVideo ? 0 : 1)}`}
            className="aspect-video w-full bg-[var(--surface-muted)] object-contain"
          />
        ) : (
          <div className="grid aspect-video place-items-center bg-[var(--surface-muted)] p-6 text-center text-sm text-[var(--muted)]">
            {current.src}
          </div>
        )}

        {count > 1 && (
          <>
            <Arrow direction="prev" onClick={() => go(-1)} />
            <Arrow direction="next" onClick={() => go(1)} />
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Show ${item.kind === "video" ? "demo video" : `image ${i + 1}`}`}
              aria-current={i === index}
              className={`relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === index
                  ? "border-[var(--accent)]"
                  : "border-transparent opacity-65 hover:opacity-100"
              }`}
            >
              {item.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.src}
                  alt=""
                  loading="lazy"
                  className="h-full w-full bg-[var(--surface-muted)] object-cover"
                />
              ) : item.kind === "video" ? (
                <span className="grid h-full w-full place-items-center bg-[var(--surface-muted)] text-[var(--muted)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              ) : (
                <span className="grid h-full w-full place-items-center bg-[var(--surface-muted)] p-1 text-[9px] leading-tight text-[var(--muted)]">
                  {item.src.slice(0, 40)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Arrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      onClick={onClick}
      aria-label={isPrev ? "Previous" : "Next"}
      // Always visible, not hover-only: the arrows are the affordance that
      // tells a buyer there's more than one image to look at, and hiding them
      // until hover means the ones who need them most never find them.
      className={`absolute top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/75 ${
        isPrev ? "left-3" : "right-3"
      }`}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={isPrev ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
      </svg>
    </button>
  );
}
