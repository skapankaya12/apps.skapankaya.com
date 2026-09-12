"use client";

import { useEffect, useRef, useState } from "react";
import { RichText } from "@/components/RichText";
import { uploadReviewImage } from "@/lib/storage";

/**
 * The review console's note editor: what the seller reads in the rejection
 * email and on their dashboard.
 *
 * It writes the same small Markdown subset as seller descriptions (lib/markdown)
 * plus screenshots, rather than HTML, so a note can never carry markup into an
 * email or a page; RichText and lib/noteEmail render it. Screenshots upload the
 * moment they are pasted, dropped or picked, to public/review/{uid}/, and go in
 * as `![screenshot](url)` on their own line.
 *
 * Two sizes over one value: a compact box beside the checklist, and an
 * expanded view with the text on one side and the note as the seller will see
 * it on the other, for writing something longer.
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** A screenshot still uploading sits in the text as this, until it resolves. */
export function noteIsUploading(note: string): boolean {
  return note.includes("](uploading:");
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  uid: string;
  listingId: string;
  placeholder?: string;
};

export function NoteEditor({ value, onChange, uid, listingId, placeholder }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  // Uploads finish after the text may have changed, so they edit the latest
  // value rather than the one they started from.
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  function set(next: string) {
    valueRef.current = next;
    onChange(next);
  }

  /** Replace the selection via `fn`, then put the caret where `fn` says. */
  function edit(fn: (sel: string, before: string, after: string) => [string, number, number]) {
    const el = areaRef.current;
    const text = valueRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const [insert, selFrom, selTo] = fn(text.slice(start, end), text.slice(0, start), text.slice(end));
    set(text.slice(0, start) + insert + text.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + selFrom, start + selTo);
    });
  }

  const bold = () =>
    edit((sel) => (sel ? [`**${sel}**`, 2, 2 + sel.length] : ["**bold**", 2, 6]));

  const list = (ordered: boolean) =>
    edit((sel, before) => {
      const lines = (sel || "").split("\n");
      const lead = before && !before.endsWith("\n") ? "\n" : "";
      const out = lines.map((l, i) => `${ordered ? `${i + 1}.` : "-"} ${l}`).join("\n");
      return [lead + out, lead.length + out.length, lead.length + out.length];
    });

  const link = () => {
    const url = window.prompt("Link address", "https://")?.trim();
    if (!url || !/^https:\/\/\S+$/.test(url)) return;
    edit((sel, before) => {
      const pad = before && !/\s$/.test(before) ? " " : "";
      const out = `${sel ? `${sel} ` : ""}${pad}${url}`;
      return [out, out.length, out.length];
    });
  };

  async function addImages(files: File[]) {
    setError("");
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_IMAGE_BYTES) {
        setError("That screenshot is over 5MB. Try a smaller one.");
        continue;
      }
      const token = `![Uploading screenshot…](uploading:${Date.now()}-${Math.random().toString(36).slice(2, 7)})`;
      edit((_sel, before, after) => {
        const lead = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
        const tail = after.startsWith("\n") ? "\n" : "\n\n";
        const out = `${lead}${token}${tail}`;
        return [out, out.length, out.length];
      });
      setUploading((n) => n + 1);
      try {
        const url = await uploadReviewImage(uid, listingId, file);
        set(valueRef.current.replace(token, `![screenshot](${url})`));
      } catch {
        set(valueRef.current.replace(`${token}\n`, "").replace(token, ""));
        setError("A screenshot didn't upload. Try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  /** Images from a file picker or a drop. */
  function imagesFrom(list: FileList | null): File[] {
    return Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
  }

  /** Images from a paste, where a screenshot arrives as a clipboard item. */
  function pastedImages(items: DataTransferItemList): File[] {
    return Array.from(items)
      .filter((i) => i.kind === "file" && i.type.startsWith("image/"))
      .map((i) => i.getAsFile())
      .filter((f): f is File => f !== null);
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] px-2 py-1.5">
      <ToolButton label="Bold" onClick={bold}><strong>B</strong></ToolButton>
      <ToolButton label="Bulleted list" onClick={() => list(false)}>• List</ToolButton>
      <ToolButton label="Numbered list" onClick={() => list(true)}>1. List</ToolButton>
      <ToolButton label="Link" onClick={link}>Link</ToolButton>
      <ToolButton label="Add a screenshot" onClick={() => pickerRef.current?.click()}>Screenshot</ToolButton>
      <input
        ref={pickerRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void addImages(imagesFrom(e.target.files));
          e.target.value = "";
        }}
      />
      <span className="ml-auto flex items-center gap-1">
        {!expanded && (
          <>
            <ToolButton label="Write" active={tab === "write"} onClick={() => setTab("write")}>Write</ToolButton>
            <ToolButton label="Preview" active={tab === "preview"} onClick={() => setTab("preview")}>Preview</ToolButton>
          </>
        )}
        <ToolButton label={expanded ? "Close the large editor" : "Open the large editor"} onClick={() => setExpanded((x) => !x)}>
          {expanded ? "Done" : "Expand"}
        </ToolButton>
      </span>
    </div>
  );

  const areaClass = expanded
    ? "h-full min-h-[240px] resize-none border-b border-[var(--border)] md:border-r md:border-b-0"
    : "min-h-[180px] resize-y";

  const area = (
    <textarea
      ref={areaRef}
      value={value}
      onChange={(e) => set(e.target.value)}
      onPaste={(e) => {
        const images = pastedImages(e.clipboardData.items);
        if (images.length) {
          e.preventDefault();
          void addImages(images);
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const images = imagesFrom(e.dataTransfer.files);
        if (images.length) {
          e.preventDefault();
          void addImages(images);
        }
      }}
      placeholder={placeholder}
      className={`w-full bg-transparent px-3 py-2.5 text-sm leading-relaxed outline-none ${areaClass}`}
    />
  );

  const preview = value.trim() ? (
    <RichText text={value} images className="text-sm" />
  ) : (
    <p className="text-sm text-[var(--muted)]">Nothing to preview yet.</p>
  );

  const status = (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs text-[var(--muted)]">
      <span>Paste or drop screenshots.</span>
      {uploading > 0 && <span>Uploading {uploading} screenshot{uploading === 1 ? "" : "s"}…</span>}
      {error && <span className="text-[var(--danger)]">{error}</span>}
    </div>
  );

  if (expanded) {
    return (
      <>
        {/* Keeps the sidebar's place while the large editor is open. */}
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-3 py-6 text-center text-xs text-[var(--muted)]">
          Editing in the large editor
        </div>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6"
          onMouseDown={(e) => e.target === e.currentTarget && setExpanded(false)}
        >
          <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
            <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-2">
              <h2 className="font-semibold">Note to seller</h2>
              <span className="text-xs text-[var(--muted)]">Right: what the seller sees. Esc to close.</span>
            </div>
            {toolbar}
            <div className="grid min-h-0 flex-1 md:grid-cols-2">
              {area}
              <div className="min-h-0 overflow-auto bg-[var(--surface-muted)] p-5">
                <div className="rounded-2xl border border-[#e1e7fd] bg-[#f5f7ff] p-5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                    From the review
                  </p>
                  {preview}
                </div>
              </div>
            </div>
            {status}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="mt-1.5 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--background)] focus-within:border-[var(--accent)]">
      {toolbar}
      {tab === "write" ? (
        area
      ) : (
        <div className="min-h-[180px] px-3 py-2.5">{preview}</div>
      )}
      {status}
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  active = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium hover:bg-[var(--surface-muted)] ${
        active ? "bg-[var(--surface-muted)] text-[var(--foreground)]" : "text-[var(--muted)]"
      }`}
    >
      {children}
    </button>
  );
}
