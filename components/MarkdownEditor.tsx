"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { RichText } from "./RichText";

/**
 * The description field, with formatting controls.
 *
 * A listing description is the longest thing a seller writes and the main thing
 * a buyer reads, and until now it was an unstyled textarea: sellers reached for
 * ALL-CAPS LINES as headings because nothing else was available. The toolbar
 * writes the Markdown subset in lib/markdown, and Preview renders through the
 * very same <RichText> the listing page uses — so what a seller checks here is
 * literally what buyers get, not an approximation of it.
 *
 * The value stays plain text. Nothing here produces HTML, and the stored
 * description is still a string that reads fine unformatted.
 */
export function MarkdownEditor({
  value,
  onChange,
  rows = 10,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  /**
   * Where the caret should land once React has re-rendered with the new value.
   *
   * It can't be set inline: writing to the textarea fires onChange, and the
   * controlled re-render that follows puts the caret back at the end. So the
   * intended range is parked here and applied in the layout effect below, which
   * runs after the new value is committed but before the browser paints — the
   * seller never sees the caret jump.
   */
  const pendingSelection = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const range = pendingSelection.current;
    const el = ref.current;
    if (!range || !el) return;
    pendingSelection.current = null;
    el.setSelectionRange(range[0], range[1]);
  }, [value]);

  /**
   * Replace the current selection.
   *
   * execCommand is deprecated but it is still the only way to write into a
   * textarea and keep the browser's own undo stack, and losing ctrl+Z halfway
   * through a long description is worse than using a deprecated call. If it
   * refuses, fall through to setting the value directly.
   */
  function replaceSelection(next: string, selectStart: number, selectEnd: number) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    pendingSelection.current = [selectStart, selectEnd];
    let ok = false;
    try {
      ok = document.execCommand("insertText", false, next);
    } catch {
      ok = false;
    }
    if (!ok) {
      const before = el.value.slice(0, el.selectionStart);
      const after = el.value.slice(el.selectionEnd);
      onChange(before + next + after);
    }
  }

  /** Wrap the selection in a marker, or drop in a placeholder word to replace. */
  function wrap(marker: string, placeholderWord: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = el.value.slice(start, end);
    const body = selected || placeholderWord;
    const next = `${marker}${body}${marker}`;
    // With no selection, leave the placeholder word highlighted so typing
    // replaces it; with one, put the caret after what the seller just wrapped.
    const from = selected ? start + next.length : start + marker.length;
    const to = selected ? from : from + body.length;
    replaceSelection(next, from, to);
  }

  /** Put a prefix at the start of every selected line (headings, list items). */
  function prefixLines(prefix: string | ((i: number) => string), placeholderLine: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    // Grow the selection out to whole lines — a heading marker has to land at
    // the start of the line, not wherever the caret happened to be.
    const lineStart = el.value.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEndIndex = el.value.indexOf("\n", selectionEnd);
    const lineEnd = lineEndIndex === -1 ? el.value.length : lineEndIndex;
    const block = el.value.slice(lineStart, lineEnd) || placeholderLine;

    const next = block
      .split("\n")
      .map((line, i) => {
        const mark = typeof prefix === "string" ? prefix : prefix(i);
        // Toggle: applying the same prefix twice takes it back off.
        return line.startsWith(mark) ? line.slice(mark.length) : mark + line;
      })
      .join("\n");

    el.setSelectionRange(lineStart, lineEnd);
    replaceSelection(next, lineStart, lineStart + next.length);
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1 rounded-t-xl border border-b-0 border-[var(--border-strong)] bg-[var(--surface-muted)] px-2 py-1.5">
        <ToolbarButton label="Heading" title="Heading" onClick={() => prefixLines("## ", "Heading")}>
          <span className="text-sm font-bold">H</span>
        </ToolbarButton>
        <ToolbarButton label="Bold" title="Bold" onClick={() => wrap("**", "bold text")}>
          <span className="text-sm font-bold">B</span>
        </ToolbarButton>
        <ToolbarButton label="Italic" title="Italic" onClick={() => wrap("*", "italic text")}>
          <span className="font-serif text-sm italic">I</span>
        </ToolbarButton>
        <ToolbarButton label="Inline code" title="Inline code" onClick={() => wrap("`", "code")}>
          <span className="font-mono text-xs">{"</>"}</span>
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-[var(--border-strong)]" aria-hidden="true" />

        <ToolbarButton
          label="Bulleted list"
          title="Bulleted list"
          onClick={() => prefixLines("- ", "List item")}
        >
          <ListIcon ordered={false} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          title="Numbered list"
          onClick={() => prefixLines((i) => `${i + 1}. `, "List item")}
        >
          <ListIcon ordered />
        </ToolbarButton>

        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
          className={`ml-auto rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            preview
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          }`}
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {preview ? (
        <div
          className="min-h-[12rem] rounded-b-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-3"
          // Matches the width the listing page gives it, so a line that wraps
          // here wraps there.
        >
          {value.trim() ? (
            <RichText text={value} className="max-w-prose text-sm" />
          ) : (
            <p className="text-sm text-[var(--muted)]">Nothing to preview yet.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full resize-y rounded-b-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
      )}

      <p className="mt-1.5 text-xs text-[var(--muted)]">
        Select text and use the buttons, or type it directly:{" "}
        <code className="font-mono">**bold**</code>,{" "}
        <code className="font-mono">*italic*</code>,{" "}
        <code className="font-mono">## Heading</code>,{" "}
        <code className="font-mono">- list item</code>. Links are detected
        automatically. Press Preview to see it exactly as buyers will.
      </p>
    </div>
  );
}

function ToolbarButton({
  label,
  title,
  onClick,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // onMouseDown, not onClick: clicking a button blurs the textarea and
      // takes the selection with it, so the marker would land at the wrong
      // place (or nowhere). Preventing the default keeps the caret put.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label={label}
      title={title}
      className="grid h-7 w-7 place-items-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
    >
      {children}
    </button>
  );
}

function ListIcon({ ordered }: { ordered: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 6h11M9 12h11M9 18h11" />
      {ordered ? (
        <text x="1" y="9" fontSize="8" fill="currentColor" stroke="none">1</text>
      ) : (
        <>
          <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}
