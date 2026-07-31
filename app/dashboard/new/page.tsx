"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/lib/hooks";
import {
  createListing,
  updateListing,
  reserveListingId,
  getListingById,
  notifyListingSubmitted,
  subscribe,
} from "@/lib/store";
import {
  uploadPackage,
  uploadDemoVideo,
  uploadScreenshots,
} from "@/lib/storage";
import {
  CATEGORY_LABELS,
  CATEGORY_HINTS,
  RUNTIME_LABELS,
  type Category,
  type Runtime,
  type SetupMode,
  type Listing,
} from "@/lib/types";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";

export default function NewListingPage() {
  // useSearchParams needs a Suspense boundary in an otherwise-static route.
  return (
    <Suspense fallback={null}>
      <NewListingForm />
    </Suspense>
  );
}

function NewListingForm() {
  const user = useUser();
  const editId = useSearchParams().get("edit");

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("productivity");
  const [runtime, setRuntime] = useState<Runtime>("node");
  const [setupMode, setSetupMode] = useState<SetupMode>("one-command");
  const [price, setPrice] = useState("15");
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [sellerBio, setSellerBio] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerWebsite, setSellerWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [demoError, setDemoError] = useState("");

  // Edit mode: /dashboard/new?edit=<listingId> loads an existing (rejected or
  // pending) listing to edit and resubmit. Existing files are kept unless the
  // seller replaces them.
  const [editing, setEditing] = useState<Listing | undefined>(undefined);
  const [existingPackage, setExistingPackage] = useState<string | null>(null);
  const [existingDemo, setExistingDemo] = useState<string | null>(null);
  const [existingShots, setExistingShots] = useState<string[]>([]);
  const prefilled = useRef(false);

  useEffect(() => {
    if (!editId) return;
    const read = () => setEditing(getListingById(editId));
    read();
    return subscribe(read);
  }, [editId]);

  useEffect(() => {
    if (!editing || prefilled.current) return;
    prefilled.current = true;
    setTitle(editing.title);
    setTagline(editing.tagline);
    setDescription(editing.description);
    setCategory(editing.category);
    setRuntime(editing.runtime);
    setSetupMode(editing.setupMode);
    setPrice(String(editing.priceCents / 100));
    setSellerBio(editing.sellerBio ?? "");
    setSellerEmail(editing.sellerEmail ?? "");
    setSellerWebsite(editing.sellerWebsite ?? "");
    setExistingPackage(editing.packagePath ?? null);
    setExistingDemo(editing.demoVideo ?? null);
    setExistingShots(editing.screenshots ?? []);
    setAgreed(true);
  }, [editing]);

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
          Our team reviews every app before it goes live, usually within 1 to 2
          business days. You&apos;ll see the status update on your dashboard.
        </p>
        <ButtonLink href="/dashboard" className="mt-8">Back to dashboard</ButtonLink>
      </Section>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasPackage = Boolean(packageFile || existingPackage);
    const hasDemo = Boolean(demoFile || existingDemo);
    if (!hasPackage || !hasDemo || uploading) return;
    setError("");
    setUploading(true);
    try {
      // In edit mode reuse the listing id; otherwise reserve a fresh one. Only
      // upload files the seller actually changed — keep the rest as-is.
      const listingId = editId ?? reserveListingId();
      const [packagePath, demoUrl, newShotUrls] = await Promise.all([
        packageFile ? uploadPackage(listingId, packageFile) : Promise.resolve(existingPackage!),
        demoFile ? uploadDemoVideo(listingId, demoFile) : Promise.resolve(existingDemo!),
        screenshotFiles.length
          ? uploadScreenshots(listingId, screenshotFiles)
          : Promise.resolve<string[]>([]),
      ]);
      const screenshots = [...existingShots, ...newShotUrls].slice(0, 5);

      const priceCents = Math.round(parseFloat(price || "0") * 100);
      const data = {
        sellerId: user!.uid,
        sellerName: user!.displayName,
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        runtime,
        setupMode,
        priceCents,
        screenshots,
        demoVideo: demoUrl,
        sellerBio: sellerBio.trim() || undefined,
        sellerEmail: sellerEmail.trim(), // required
        sellerWebsite: sellerWebsite.trim() || undefined,
        version: editing?.version ?? "1.0.0",
        packagePath,
      };

      if (editId) {
        await updateListing(editId, data); // resets status to pending, clears note
      } else {
        await createListing(listingId, data);
      }
      // Best-effort admin notification (fires for both new and resubmitted).
      await notifyListingSubmitted(listingId);
      setSubmitted(true);
    } catch (err) {
      console.error("[new listing] submit failed:", err);
      setError(
        "Something went wrong uploading your files. Please check your connection and try again."
      );
      setUploading(false);
    }
  }

  function addScreenshots(files: FileList | null) {
    if (!files) return;
    const room = Math.max(0, 5 - existingShots.length);
    setScreenshotFiles((prev) => [...prev, ...Array.from(files)].slice(0, room));
  }

  function pickPackage(file: File | null) {
    setError("");
    if (file && file.size > MAX_PACKAGE_BYTES) {
      setPackageFile(null);
      setError("Your package is over the 200MB limit. Please slim it down.");
      return;
    }
    setPackageFile(file);
  }

  // Validate the demo before accepting it: public Storage caps at 50MB, and we
  // only want short clips (max 30s). Reject with a clear message rather than
  // letting the upload fail with a raw 403 later.
  async function pickDemo(file: File | null) {
    setDemoError("");
    if (!file) {
      setDemoFile(null);
      return;
    }
    if (file.size > MAX_DEMO_BYTES) {
      setDemoFile(null);
      setDemoError(
        "That video is too large — keep it under 50MB (a 30-second clip usually is)."
      );
      return;
    }
    let duration: number | null = null;
    try {
      duration = await readVideoDuration(file);
    } catch {
      duration = null; // couldn't read metadata; fall through and allow it
    }
    if (duration !== null && duration > MAX_DEMO_SECONDS + 1) {
      setDemoFile(null);
      setDemoError(
        `Demo videos must be 30 seconds or shorter (this one is ${Math.round(duration)}s).`
      );
      return;
    }
    setDemoFile(file);
  }

  // Exactly what's still blocking submission, in field order — so the button's
  // hint names the culprit instead of a vague "fill all fields".
  const missing: string[] = [];
  if (!title.trim()) missing.push("app name");
  if (!tagline.trim()) missing.push("tagline");
  if (description.trim().length <= 20) missing.push("a longer description (20+ characters)");
  const priceNum = parseFloat(price || "0");
  if (!(priceNum >= 15 && priceNum <= 250)) missing.push("a price between $15 and $250");
  if (!packageFile && !existingPackage) missing.push("a .zip package");
  if (!demoFile && !existingDemo) missing.push("a demo video");
  if (!sellerEmail.trim() || !sellerEmail.includes("@")) missing.push("a support email");
  if (!agreed) missing.push("the acknowledgment");
  const valid = missing.length === 0;

  return (
    <Section className="max-w-2xl py-12">
      <ButtonLink href="/dashboard" variant="ghost" size="sm">← Dashboard</ButtonLink>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {editId ? "Edit & resubmit" : "New listing"}
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        {editId
          ? "Update your listing and send it back for review. Files you don't replace stay as they are."
          : "Fill this in, upload your app package, and submit for review."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field label="App name" hint="Short and clear. Up to 50 characters.">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            placeholder="e.g. CSV Cleaner"
            className={inputClass}
          />
        </Field>

        <Field label="One-line tagline" hint="One sentence. Up to 90 characters.">
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={90}
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

          <Field
            label="Runtime"
            hint="What a buyer needs to run it: Node.js or Python for scripts, Browser for web tools, Desktop app for a packaged program, Other if unsure."
          >
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

        <Field
          label="Price (USD)"
          hint="Between $15 and $250. Want to list higher? Contact us about premium listings."
        >
          <div className="relative max-w-[200px]">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              $
            </span>
            <input
              type="number"
              min="15"
              max="250"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={`${inputClass} pl-7`}
            />
          </div>
        </Field>

        {/* App package upload */}
        <Field
          label="App package (.zip)"
          hint="Must contain manifest.json, README.md, SETUP.md, LICENSE.md and src/. Up to 200MB."
        >
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-6 text-sm hover:border-[var(--accent)]">
            <span className="text-[var(--muted)]">
              {packageFile ? (
                <span className="text-[var(--foreground)]">📦 {packageFile.name}</span>
              ) : existingPackage ? (
                <span className="text-[var(--foreground)]">
                  📦 {existingPackage.split("/").pop()}{" "}
                  <span className="text-[var(--muted)]">— current, click to replace</span>
                </span>
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
              onChange={(e) => pickPackage(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>

        {/* Screenshots, up to 5 */}
        <Field
          label="Screenshots (up to 5)"
          hint="Show the tool actually working. Buyers who see it are far likelier to buy."
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {existingShots.map((url, i) => (
              <div
                key={`existing-${i}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setExistingShots((p) => p.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--danger)] text-xs text-white"
                  aria-label="Remove screenshot"
                >
                  ✕
                </button>
              </div>
            ))}
            {screenshotFiles.map((file, i) => (
              <div
                key={i}
                className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-center"
              >
                <span className="text-xl">🖼️</span>
                <span className="line-clamp-2 text-[9px] leading-tight text-[var(--muted)]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setScreenshotFiles((p) => p.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--danger)] text-xs text-white"
                  aria-label="Remove screenshot"
                >
                  ✕
                </button>
              </div>
            ))}
            {existingShots.length + screenshotFiles.length < 5 && (
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

        {/* Demo video, required */}
        <Field
          label="Demo video (required)"
          hint="A short screen recording of the tool in action — max 30 seconds and 50MB. It's the single biggest thing that sells a small tool, so keep it tight."
        >
          <label
            className={`flex cursor-pointer items-center justify-between rounded-xl border border-dashed px-4 py-6 text-sm hover:border-[var(--accent)] ${
              demoFile || existingDemo
                ? "border-[var(--success)] bg-[var(--success-soft)]"
                : "border-[var(--border-strong)] bg-[var(--surface-muted)]"
            }`}
          >
            <span className={demoFile || existingDemo ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
              {demoFile
                ? `▶ ${demoFile.name}`
                : existingDemo
                  ? "▶ Current demo video — click to replace"
                  : "Click to upload a demo video (mp4, mov, webm)"}
            </span>
            <span className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs">
              Browse
            </span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => pickDemo(e.target.files?.[0] ?? null)}
            />
          </label>
          {demoError && (
            <p className="mt-1.5 text-xs text-[var(--danger)]">{demoError}</p>
          )}
        </Field>

        {/* Seller / contact info, shown to buyers on the listing page */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <h2 className="text-sm font-semibold">About you (shown to buyers)</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Buyers trust a real person behind a tool. This appears in the
            &ldquo;About the seller&rdquo; section of your listing.
          </p>
          <div className="mt-4 space-y-6">
            <Field label="Short bio" hint="A sentence or two about who you are and what you build.">
              <textarea
                value={sellerBio}
                onChange={(e) => setSellerBio(e.target.value)}
                rows={3}
                placeholder="e.g. Indie maker building small, privacy-first tools for freelancers."
                className={`${inputClass} resize-y`}
              />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Support email (required)" hint="Where buyers can reach you for help.">
                <input
                  type="email"
                  required
                  value={sellerEmail}
                  onChange={(e) => setSellerEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </Field>
              <Field label="Website or profile" hint="Optional. A link buyers can check.">
                <input
                  type="url"
                  value={sellerWebsite}
                  onChange={(e) => setSellerWebsite(e.target.value)}
                  placeholder="https://your-site.com"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--muted)]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            I confirm this tool is mine to sell, contains no malicious code, and
            discloses all network activity. I&apos;ll provide support for it and
            honor the 14-day refund policy. I understand every submission is
            scanned and human-reviewed before it goes live.
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={!valid || uploading}>
            {uploading
              ? "Uploading…"
              : editId
                ? "Resubmit for review"
                : "Submit for review"}
          </Button>
          {!valid && !uploading && (
            <Badge tone="neutral">Still needed: {missing.join(", ")}</Badge>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </form>
    </Section>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

// Upload limits. Demo video lives in public/ (Storage caps it at 50MB) and is
// meant to be a short clip; the package .zip goes to submissions/ (200MB cap).
const MAX_DEMO_BYTES = 50 * 1024 * 1024;
const MAX_DEMO_SECONDS = 30;
const MAX_PACKAGE_BYTES = 200 * 1024 * 1024;

/** Read a video file's duration (seconds) from its metadata, without playing it. */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = v.duration;
      URL.revokeObjectURL(v.src);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(v.src);
      reject(new Error("cannot read video metadata"));
    };
    v.src = URL.createObjectURL(file);
  });
}

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
