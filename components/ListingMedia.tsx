"use client";

import { useRef, useState } from "react";

/**
 * A listing's visual. Shows a still first frame, and plays the demo video on
 * hover (muted + looping, which browsers allow without a user gesture).
 * Falls back to a title monogram when a listing has no video yet.
 *
 * The frame is 16:9 but demo videos are whatever shape the maker recorded —
 * a 16:10 Mac screen, a square capture, a phone in portrait. The video is
 * fitted inside the frame rather than filling it, so nothing is cropped: a
 * cropped preview cuts off exactly the chrome and edges that show what the
 * tool is. The leftover space is the surface colour, which reads as a letterbox.
 */
export function ListingMedia({
  src,
  title,
  className = "",
  rounded = "rounded-xl",
}: {
  src?: string;
  title: string;
  className?: string;
  rounded?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  function start() {
    const v = videoRef.current;
    if (!v) return;
    // play() rejects if the browser blocks it, so ignore rather than throw.
    v.play().then(() => setPlaying(true)).catch(() => {});
  }

  function stop() {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = 0;
    setPlaying(false);
  }

  if (!src || failed) {
    return (
      <div
        className={`grid aspect-video place-items-center bg-[var(--surface-muted)] ${rounded} ${className}`}
      >
        <span className="text-2xl font-semibold text-[var(--muted)]">
          {title.slice(0, 1).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className={`relative aspect-video overflow-hidden bg-[var(--surface-muted)] ${rounded} ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
      {/* Play affordance, hidden while the video is running */}
      <div
        className={`pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-200 ${
          playing ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
    </div>
  );
}
