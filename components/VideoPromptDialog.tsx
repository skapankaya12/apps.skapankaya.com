"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { buttonClass } from "./ui";
import type { VideoPromptItem } from "./VideoPromptGallery";

type Step = { label: string; text: string };

type PromptFile = {
  steps: Step[];
  /** The creator's own words, when the steps above are our rewrite of them. */
  original?: Step[];
  credit: { by: string; byUrl: string; note: string; source: string; sourceUrl: string };
};

/**
 * Bracketed placeholders a prompt expects you to replace: [your product],
 * <website url>, {Topic}. Angle brackets only count when there is a space
 * inside, because <inputs> and <direction> are structure the agent reads, not
 * blanks for the reader to fill.
 */
const PLACEHOLDER = /(\[[^\]\n]{2,60}\]|<[a-z][^>\n]*\s[^>\n]*>|\{[A-Za-z][^}\n]{1,40}\})/g;

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(PLACEHOLDER).map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded bg-[var(--accent-soft)] px-0.5 text-[var(--accent)]"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

function promptText(p: PromptFile) {
  return p.steps.length === 1
    ? p.steps[0].text
    : p.steps.map((s) => `${s.label}:\n${s.text}`).join("\n\n");
}

/**
 * The prompt wrapped as a brief an agent can act on without a second message:
 * whose product it is for, what to ask before starting, what to render with,
 * and where the prompt came from. The prompt itself goes in untouched.
 */
function agentBrief(item: VideoPromptItem, p: PromptFile) {
  const tool = item.tags.includes("hyperframes")
    ? "- Use HyperFrames (npx hyperframes), as the prompt asks."
    : "- Use what you can run here: plain HTML and JavaScript, Remotion or HyperFrames.";
  const steps =
    p.steps.length === 1
      ? `<prompt>\n${p.steps[0].text}\n</prompt>`
      : "Do these in order, and show me the result after each one.\n\n" +
        p.steps.map((s) => `<prompt step="${s.label}">\n${s.text}\n</prompt>`).join("\n\n");
  return [
    "I want a product video for my own product. Use the prompt below as the brief.",
    "",
    "Before you start:",
    "- Ask me for anything you need about my product: its name, what it does and who it is for, its URL, screenshots, and brand colours and fonts.",
    "- Wherever the prompt names another product or brand, or has a placeholder in brackets, use mine instead.",
    tool,
    "- Draw every frame in code as a function of time, then render the finished video to MP4.",
    "",
    `${p.original ? "Based on a prompt by" : "Prompt by"} ${p.credit.by} (${p.credit.byUrl}):`,
    "",
    steps,
  ].join("\n");
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API refused (older Safari, a non-secure origin): fall back to
    // a selected textarea, which every browser still copies from.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

/**
 * One prompt, readable and ready to copy, without leaving the page.
 *
 * The prompt is fetched when the dialog opens rather than shipped with the
 * page: two hundred prompts would triple what every visitor downloads to read
 * the one or two they open. A native <dialog> gives Escape, focus trapping and
 * the backdrop for free.
 */
export function VideoPromptDialog({
  item,
  onClose,
}: {
  item: VideoPromptItem | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<{ id: string; prompt: PromptFile | null } | null>(null);
  const [copied, setCopied] = useState<"agent" | "text" | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);

  useEffect(() => {
    if (!item) return;
    let live = true;
    fetch(`/video-prompts/prompts/${item.id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((p: PromptFile | null) => {
        if (live) setData({ id: item.id, prompt: p });
      });
    return () => {
      live = false;
    };
  }, [item]);

  const prompt = item && data?.id === item.id ? data.prompt : undefined;

  async function onCopy(kind: "agent" | "text") {
    if (!item || !prompt) return;
    const ok = await copy(kind === "agent" ? agentBrief(item, prompt) : promptText(prompt));
    if (ok) {
      setCopied(kind);
      setTimeout(() => setCopied((c) => (c === kind ? null : c)), 2000);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="prompt-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog element itself.
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-[var(--shadow-lg)] backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      {item && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start gap-4 border-b border-[var(--border)] p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt=""
              className={`h-16 w-24 shrink-0 rounded-md object-cover ${item.video ? "hidden" : "hidden sm:block"}`}
            />
            <div className="min-w-0 flex-1">
              <h2 id="prompt-dialog-title" className="text-lg font-semibold tracking-tight">
                {item.title}
              </h2>
              {prompt && (
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {prompt.original ? "Based on a prompt by" : "By"}{" "}
                  <a
                    href={prompt.credit.byUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[var(--accent)] hover:underline"
                  >
                    {prompt.credit.by}
                  </a>
                  . {prompt.credit.note} From{" "}
                  <a
                    href={prompt.credit.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-[var(--accent)] hover:underline"
                  >
                    {prompt.credit.source}
                  </a>
                  .
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {item.video && (
              // Muted so it may autoplay; the controls are there to unmute.
              <video
                key={item.id}
                src={item.video}
                poster={item.image}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="mb-5 max-h-[45vh] w-full rounded-xl bg-black object-contain"
              />
            )}
            {prompt === undefined ? (
              <p className="text-sm text-[var(--muted)]">Loading the prompt…</p>
            ) : prompt === null ? (
              <p className="text-sm text-[var(--muted)]">
                This prompt could not be loaded.{" "}
                <a href={item.href} target="_blank" rel="noopener noreferrer nofollow" className="text-[var(--accent)] hover:underline">
                  Open the original
                </a>
                .
              </p>
            ) : (
              <div className="space-y-5">
                {prompt.steps.map((s) => (
                  <div key={s.label}>
                    {prompt.steps.length > 1 && (
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                        {s.label}
                      </p>
                    )}
                    <div className="whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 font-mono text-[0.82rem] leading-relaxed">
                      <Highlighted text={s.text} />
                    </div>
                  </div>
                ))}
                {prompt.original && (
                  <details className="group rounded-xl border border-[var(--border)]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
                      <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">›</span>
                      {prompt.credit.by}&apos;s original prompt
                    </summary>
                    <div className="space-y-3 whitespace-pre-wrap break-words border-t border-[var(--border)] p-4 text-sm leading-relaxed text-[var(--muted)]">
                      {prompt.original.map((s) => (
                        <p key={s.label}>
                          {prompt.original!.length > 1 && <strong>{s.label}: </strong>}
                          {s.text}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] p-4">
            <button
              type="button"
              disabled={!prompt}
              onClick={() => onCopy("agent")}
              className={buttonClass("primary", "md", "flex-1 sm:flex-none")}
            >
              {copied === "agent" ? "Copied" : "Copy for your agent"}
            </button>
            <button
              type="button"
              disabled={!prompt}
              onClick={() => onCopy("text")}
              className={buttonClass("secondary", "md", "flex-1 sm:flex-none")}
            >
              {copied === "text" ? "Copied" : "Copy text"}
            </button>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="ml-auto hidden text-sm text-[var(--accent)] hover:underline sm:inline"
            >
              See the video
            </a>
          </div>
        </div>
      )}
    </dialog>
  );
}
