"use client";

import { useEffect, useRef, useState } from "react";
import { buttonClass } from "./ui";
import { VideoPromptDialog } from "./VideoPromptDialog";

export type VideoPromptItem = {
  id: string;
  group: string;
  title: string;
  href: string;
  image: string;
  /** A short clip of the video, played on hover and in the prompt panel. */
  video?: string;
  tags: string[];
};

/**
 * The menu, in the order a founder reaches for them. Grouped by what the video
 * is for rather than how it was made: nobody launching a product thinks "I
 * need something in Three.js", they think "I need a launch film". How it was
 * made stays on each card as its tags.
 */
export const VIDEO_GROUPS = [
  { id: "launch", label: "Launch films", blurb: "The short film for launch day." },
  { id: "demo", label: "Product demos", blurb: "Your real product UI, in motion." },
  { id: "app", label: "App previews", blurb: "Phone and desktop app previews for the stores and your site." },
  { id: "feature", label: "Feature announcements", blurb: "One new thing, shown well." },
  { id: "explainer", label: "Explainers", blurb: "What your product does and how it works." },
  { id: "brand", label: "Logo & brand reveals", blurb: "Logo intros, outros and brand films." },
  { id: "data", label: "Data & milestones", blurb: "Numbers that move: users, revenue, charts." },
  { id: "template", label: "Fill-in templates", blurb: "Prompts that ask about your product first, then build the video." },
  { id: "style", label: "Brand film styles", blurb: "Ten second films, one style each. Swap in your brand, copy and colours." },
] as const;

const TAG_LABELS: Record<string, string> = {
  canvas: "Canvas",
  svg: "SVG",
  threejs: "Three.js",
  shader: "GLSL",
  gsap: "GSAP",
  css: "CSS",
  audio: "Web Audio",
  playable: "Playable",
  particles: "Particles",
  pixel: "Pixel",
  webgl: "WebGL",
  physics: "Physics",
  "ai-image": "AI image",
  hyperframes: "HyperFrames",
  vertical: "9:16",
};

const PAGE = 48;
const PREVIEW = 6;

function readHash() {
  const h = window.location.hash.slice(1);
  return VIDEO_GROUPS.some((g) => g.id === h) ? h : "all";
}

/**
 * The prompt gallery on /video-prompts: a group menu on the left, cards on the
 * right. On a phone the menu becomes a row of chips above the cards.
 *
 * The chosen group lives in the URL hash so a link can point straight at
 * "App previews". It is read after mount rather than during render, because
 * the server has no hash and the first paint has to match what it sent.
 *
 * Every card credits whoever made it: the name links to the original, and the
 * image or "Prompt" opens the prompt here, cleaned up and ready to copy.
 */
export function VideoPromptGallery({ items }: { items: VideoPromptItem[] }) {
  const [group, setGroup] = useState<string>("all");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<VideoPromptItem | null>(null);

  useEffect(() => {
    const sync = () => {
      setGroup(readHash());
      setShown(PAGE);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function pick(id: string) {
    setGroup(id);
    setShown(PAGE);
    history.replaceState(null, "", id === "all" ? window.location.pathname : `#${id}`);
  }

  const groups = VIDEO_GROUPS.map((g) => ({
    ...g,
    items: items.filter((i) => i.group === g.id),
  })).filter((g) => g.items.length > 0);
  const current = groups.find((g) => g.id === group);

  const menu = [{ id: "all", label: "All", count: items.length }].concat(
    groups.map((g) => ({ id: g.id, label: g.label, count: g.items.length }))
  );

  return (
    <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="Kinds of video" className="lg:sticky lg:top-24 lg:self-start">
        <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
          {menu.map((m) => {
            const active = m.id === group;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => pick(m.id)}
                  className={`flex items-center justify-between gap-3 rounded-full border px-3.5 py-1.5 text-sm transition-colors lg:w-full lg:rounded-lg lg:border-transparent lg:px-3 lg:text-left ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] lg:hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="text-xs opacity-60">{m.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-8 min-w-0 lg:mt-0">
        {current ? (
          <section aria-labelledby={`group-${current.id}`}>
            <GroupHeading id={current.id} label={current.label} blurb={current.blurb} />
            <CardGrid items={current.items.slice(0, shown)} onOpen={setOpen} />
            {shown < current.items.length && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className={buttonClass("secondary")}
                >
                  Show more ({current.items.length - shown} left)
                </button>
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-14">
            {groups.map((g) => (
              <section key={g.id} aria-labelledby={`group-${g.id}`}>
                <GroupHeading id={g.id} label={g.label} blurb={g.blurb}>
                  {g.items.length > PREVIEW && (
                    <button
                      type="button"
                      onClick={() => pick(g.id)}
                      className="shrink-0 text-sm text-[var(--accent)] hover:underline"
                    >
                      See all {g.items.length}
                    </button>
                  )}
                </GroupHeading>
                <CardGrid items={g.items.slice(0, PREVIEW)} onOpen={setOpen} />
              </section>
            ))}
          </div>
        )}
      </div>

      <VideoPromptDialog item={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function GroupHeading({
  id,
  label,
  blurb,
  children,
}: {
  id: string;
  label: string;
  blurb: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`group-${id}`} className="text-xl font-semibold tracking-tight">
          {label}
        </h2>
        {children}
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">{blurb}</p>
    </div>
  );
}

function CardGrid({
  items,
  onOpen,
}: {
  items: VideoPromptItem[];
  onOpen: (item: VideoPromptItem) => void;
}) {
  return (
    <ul className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((e) => (
        <li
          key={e.id}
          className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--border-strong)]"
        >
          <CardMedia item={e} onOpen={() => onOpen(e)} />
          <div className="px-5 pb-5">
            <p className="mt-4 text-[0.95rem]">
              <a
                href={e.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
              >
                {e.title}
              </a>
              <span className="text-[var(--muted)]"> · </span>
              <button
                type="button"
                onClick={() => onOpen(e)}
                className="text-[var(--accent)] underline-offset-4 hover:underline"
              >
                Prompt
              </button>
            </p>
            {e.tags.length > 0 && (
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                {e.tags.map((t) => TAG_LABELS[t] ?? t).join(" · ")}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The card's picture, which plays its clip while the pointer is over it.
 *
 * The clip is not loaded until then: two hundred videos with preload would
 * cost every visitor megabytes for cards they never point at. Touch screens
 * have no hover, so on a phone the clip plays in the prompt panel instead, and
 * reduced motion keeps the still.
 */
function CardMedia({ item, onOpen }: { item: VideoPromptItem; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function start() {
    const v = ref.current;
    if (!v || !item.video) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!v.src) v.src = item.video;
    v.play().then(() => setPlaying(true), () => {});
  }

  function stop() {
    const v = ref.current;
    if (!v) return;
    v.pause();
    setPlaying(false);
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      aria-label={`Open the prompt: ${item.title}`}
      className="relative block overflow-hidden bg-[var(--surface-muted)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-full transition-transform duration-300 hover:scale-[1.03]"
      />
      {item.video && (
        <>
          <video
            ref={ref}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${
              playing ? "opacity-100" : "opacity-0"
            }`}
          />
          <span
            aria-hidden="true"
            className={`absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-opacity ${
              playing ? "opacity-0" : "opacity-100"
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
        </>
      )}
    </button>
  );
}
