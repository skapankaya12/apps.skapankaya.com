"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks";
import { createListing } from "@/lib/store";
import {
  CATEGORY_LABELS,
  CATEGORY_HINTS,
  RUNTIME_LABELS,
  type Category,
  type Runtime,
  type SetupMode,
} from "@/lib/types";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";

export default function NewListingPage() {
  const router = useRouter();
  const user = useUser();

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("spreadsheets");
  const [runtime, setRuntime] = useState<Runtime>("node");
  const [setupMode, setSetupMode] = useState<SetupMode>("one-command");
  const [price, setPrice] = useState("15");
  const [glyph, setGlyph] = useState("📦");
  const [fileName, setFileName] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [demoVideo, setDemoVideo] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!user || (user.role !== "seller" && user.role !== "admin")) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Create a listing</h1>
        <p className="mt-2 text-[var(--muted)]">You need a seller account.</p>
        <ButtonLink href="/sell" className="mt-6">Become a seller</ButtonLink>
      </Section>
    );
  }

  if (submitted) {
    return (
      <Section className="max-w-lg py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[var(--warning-soft)] text-3xl">
          🕓
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          Submitted for review
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Our team reviews every app before it goes live — usually within 1–2
          business days. You&apos;ll see the status update on your dashboard.
        </p>
        <ButtonLink href="/dashboard" className="mt-8">Back to dashboard</ButtonLink>
      </Section>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(price || "0") * 100);
    createListing({
      sellerId: user!.uid,
      sellerName: user!.displayName,
      title: title.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      category,
      runtime,
      setupMode,
      priceCents,
      glyph: glyph || "📦",
      screenshots,
      demoVideo,
      version: "1.0.0",
      packagePath: fileName ? `submissions/${fileName}` : undefined,
    });
    setSubmitted(true);
  }

  function addScreenshots(files: FileList | null) {
    if (!files) return;
    const names = Array.from(files).map((f) => f.name);
    setScreenshots((prev) => [...prev, ...names].slice(0, 5));
  }

  const valid =
    title.trim() &&
    tagline.trim() &&
    description.trim().length > 20 &&
    fileName &&
    demoVideo; // demo video is required

  return (
    <Section className="max-w-2xl py-12">
      <ButtonLink href="/dashboard" variant="ghost" size="sm">← Dashboard</ButtonLink>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">New listing</h1>
      <p className="mt-1 text-[var(--muted)]">
        Fill this in, upload your app package, and submit for review.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field label="App name" hint="Short and clear.">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. CSV Cleaner"
            className={inputClass}
          />
        </Field>

        <Field label="One-line tagline">
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="What it does, in one sentence."
            className={inputClass}
          />
        </Field>

        <Field label="Description" hint="What problem it solves, and how it runs locally.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Describe the app…"
            className={`${inputClass} resize-y`}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="What job does it do?">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className={inputClass}
            >
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              {CATEGORY_HINTS[category]}
            </p>
          </Field>

          <Field label="Runtime">
            <select
              value={runtime}
              onChange={(e) => setRuntime(e.target.value as Runtime)}
              className={inputClass}
            >
              {(Object.keys(RUNTIME_LABELS) as Runtime[]).map((r) => (
                <option key={r} value={r}>{RUNTIME_LABELS[r]}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Setup method">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["one-command", "ai-assisted"] as SetupMode[]).map((mode) => (
              <button
                type="button"
                key={mode}
                onClick={() => setSetupMode(mode)}
                className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                  setupMode === mode
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
                }`}
              >
                <span className="font-medium">
                  {mode === "one-command" ? "One command" : "AI-assisted"}
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  {mode === "one-command"
                    ? "Runs with a single terminal command."
                    : "Buyer's AI assistant sets it up from SETUP.md."}
                </span>
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Price (USD)" hint="Suggested range: $10–29.">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
                $
              </span>
              <input
                type="number"
                min="5"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`${inputClass} pl-7`}
              />
            </div>
          </Field>

          <Field label="Icon (emoji)">
            <input
              value={glyph}
              onChange={(e) => setGlyph(e.target.value.slice(0, 2))}
              placeholder="📦"
              className={inputClass}
            />
          </Field>
        </div>

        {/* App package upload */}
        <Field
          label="App package (.zip)"
          hint="Must contain manifest.json, README.md, SETUP.md, LICENSE.md and src/."
        >
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-6 text-sm hover:border-[var(--accent)]">
            <span className="text-[var(--muted)]">
              {fileName ? (
                <span className="text-[var(--foreground)]">📦 {fileName}</span>
              ) : (
                "Click to choose your .zip package"
              )}
            </span>
            <span className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs">
              Browse
            </span>
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
          </label>
        </Field>

        {/* Screenshots — up to 5 */}
        <Field
          label="Screenshots (up to 5)"
          hint="Show the tool actually working. Buyers who see it are far likelier to buy."
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {screenshots.map((name, i) => (
              <div
                key={i}
                className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-center"
              >
                <span className="text-xl">🖼️</span>
                <span className="line-clamp-2 text-[9px] leading-tight text-[var(--muted)]">{name}</span>
                <button
                  type="button"
                  onClick={() => setScreenshots((p) => p.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--danger)] text-xs text-white"
                  aria-label="Remove screenshot"
                >
                  ✕
                </button>
              </div>
            ))}
            {screenshots.length < 5 && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--border-strong)] text-2xl text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                +
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addScreenshots(e.target.files)}
                />
              </label>
            )}
          </div>
        </Field>

        {/* Demo video — required */}
        <Field
          label="Demo video (required)"
          hint="A short screen recording of the tool in action. This is required — it's the single biggest thing that sells a small tool."
        >
          <label
            className={`flex cursor-pointer items-center justify-between rounded-xl border border-dashed px-4 py-6 text-sm hover:border-[var(--accent)] ${
              demoVideo
                ? "border-[var(--success)] bg-[var(--success-soft)]"
                : "border-[var(--border-strong)] bg-[var(--surface-muted)]"
            }`}
          >
            <span className={demoVideo ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
              {demoVideo ? `▶ ${demoVideo}` : "Click to upload a demo video (mp4, mov, webm)"}
            </span>
            <span className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs">
              Browse
            </span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setDemoVideo(e.target.files?.[0]?.name ?? "")}
            />
          </label>
        </Field>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--muted)]">
          By submitting you confirm the tool is yours to sell, contains no
          malicious code, and discloses all network activity. We scan and
          human-review every submission before it goes live.
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={!valid}>
            Submit for review
          </Button>
          {!valid && (
            <Badge tone="neutral">
              Fill all fields, attach a package &amp; a demo video
            </Badge>
          )}
        </div>
      </form>
    </Section>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {hint && <p className="mb-1.5 mt-0.5 text-xs text-[var(--muted)]">{hint}</p>}
      {!hint && <div className="mb-1.5" />}
      {children}
    </div>
  );
}
