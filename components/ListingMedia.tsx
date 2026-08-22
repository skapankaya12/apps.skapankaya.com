"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A listing's visual: a still image that plays the demo video while `play` is
 * true (muted + looping, which browsers allow without a user gesture). Falls
 * back to a title monogram when a listing has neither.
 *
 * Playback is driven by a prop rather than this component's own hover, because
 * this component is never actually hoverable. Its card stretches the title
 * link's ::after over the whole row to make the row clickable, and that overlay
 * sits on top of the media — so `onMouseEnter` here never fired and the demo
 * never played. The card owns the hover now (see ListingCard) and tells us. The
 * local handlers below stay as a fallback for any caller that doesn't pass
 * `play`, so this still works standalone.
 *
 * That still is the listing's first screenshot, passed in as the video's
 * poster. Relying on the video to render its own first frame put a black
 * rectangle on every card on a phone: touch devices never hover, so playback
 * never starts, and a demo in a container the browser can't decode (a .mov,
 * say) shows nothing anywhere. A poster paints immediately in both cases, and
 * survives the video failing outright.
 *
 * The frame is 16:9 but demo videos are whatever shape the maker recorded —
 * a 16:10 Mac screen, a square capture, a phone in portrait. The video is
 * fitted inside the frame rather than filling it, so nothing is cropped: a
 * cropped preview cuts off exactly the chrome and edges that show what the
 * tool is. The leftover space is the surface colour, which reads as a letterbox.
 */
export function ListingMedia({
  src,
  poster,
  title,
  play,
  className = "",
  rounded = "rounded-xl",
}: {
  src?: string;
  poster?: string;
  title: string;
  /** Whether the demo should be running. Omit to let this component's own hover decide. */
  play?: boolean;
  className?: string;
  rounded?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const controlled = play !== undefined;

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

  useEffect(() => {
    if (!controlled) return;
    if (play) start();
    else stop();
  }, [controlled, play]);

  if (!src || failed) {
    if (poster) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          loading="lazy"
          className={`aspect-video w-full bg-[var(--surface-muted)] object-contain ${rounded} ${className}`}
        />
      );
    }
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
      onMouseEnter={controlled ? undefined : start}
      onMouseLeave={controlled ? undefined : stop}
      onFocus={controlled ? undefined : start}
      onBlur={controlled ? undefined : stop}
      className={`relative aspect-video overflow-hidden bg-[var(--surface-muted)] ${rounded} ${className}`}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        /*
          Nothing is fetched until someone actually wants to watch. A demo is
          tens of megabytes, and a browse page of them was pulling all of it on
          load for videos most visitors never hover. The poster carries the
          visual until then; play() starts the fetch.

          Without a poster there'd be nothing at all to show, so those fall back
          to loading metadata for a first frame.
        */
        preload={poster ? "none" : "metadata"}
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
