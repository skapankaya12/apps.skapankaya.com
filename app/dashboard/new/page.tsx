"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  createListing,
  updateListing,
  reserveListingId,
  getListingById,
  notifyListingSubmitted,
  getCategories,
  subscribe,
} from "@/lib/store";
import {
  uploadPackage,
  uploadDemoVideo,
  uploadPoster,
  uploadScreenshots,
} from "@/lib/storage";
import {
  RUNTIME_LABELS,
  TAGLINE_MAX,
  TITLE_MAX,
  type Category,
  type Runtime,
  type SetupMode,
  type Listing,
  type AppUser,
} from "@/lib/types";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";
import { Field, FormSection, inputClass } from "@/components/ui/form";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { ImportFromUrl } from "@/components/ImportFromUrl";
import type { ImportResult, SourceKind } from "@/lib/importClient";
import { SOURCE_LABELS } from "@/lib/importClient";
import { MAX_PACKAGE_BYTES, captureVideoPoster, validateDemo } from "@/lib/media";
import { safeHttpsUrl } from "@/lib/utils";

export default function NewListingPage() {
  // useSearchParams needs a Suspense boundary in an otherwise-static route.
  return (
    <Suspense fallback={null}>
      <NewListingForm />
    </Suspense>
  );
}

/**
 * Resolves who's editing what, then hands a fully-known starting point to the
 * form below. Everything the form starts from — the listing being edited, any
 * saved draft — is settled *before* it mounts, so the form can initialize its
 * state instead of syncing it in an effect.
 */
function NewListingForm() {
  const user = useUser();
  const editId = useSearchParams().get("edit");

  // Edit mode: /dashboard/new?edit=<listingId> loads an existing (rejected or
  // pending) listing to edit and resubmit. Existing files are kept unless the
  // seller replaces them.
  const [editing, setEditing] = useState<Listing | undefined>(undefined);

  useEffect(() => {
    if (!editId) return;
    const read = () => setEditing(getListingById(editId));
    read();
    return subscribe(read);
  }, [editId]);

  if (!user || (user.role !== "seller" && user.role !== "admin")) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Create a listing</h1>
        <p className="mt-2 text-[var(--muted)]">You need a seller account.</p>
        <ButtonLink href="/sell" className="mt-6">Become a seller</ButtonLink>
      </Section>
    );
  }

  if (editId && !editing) {
    return (
      <Section className="py-24 text-center">
        <p className="text-sm text-[var(--muted)]">Loading your listing…</p>
      </Section>
    );
  }

  return <ListingForm user={user} editId={editId} editing={editing} />;
}

function ListingForm({
  user,
  editId,
  editing,
}: {
  user: AppUser;
  editId: string | null;
  editing?: Listing;
}) {
  // Filling this form takes real effort, and until now a refresh or a stray
  // click on the nav threw all of it away.
  const draftKey = draftKeyFor(user.uid, editId);
  // Read once, at mount. The draft wins over the listing being edited, because
  // it's the newer intent.
  const [start] = useState(() => {
    const base = editing ? draftFromListing(editing) : EMPTY_DRAFT;
    const saved = readDraft(draftKey);
    return { values: saved ?? base, fromDraft: Boolean(saved) };
  });

  const [title, setTitle] = useState(start.values.title);
  const [tagline, setTagline] = useState(start.values.tagline);
  const [description, setDescription] = useState(start.values.description);
  const [category, setCategory] = useState<Category>(start.values.category);
  const categories = useStoreValue(getCategories);
  const [runtime, setRuntime] = useState<Runtime>(start.values.runtime);
  const [setupMode, setSetupMode] = useState<SetupMode>(start.values.setupMode);
  const [price, setPrice] = useState(start.values.price);
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [sellerBio, setSellerBio] = useState(start.values.sellerBio);
  const [sellerEmail, setSellerEmail] = useState(start.values.sellerEmail);
  const [sellerWebsite, setSellerWebsite] = useState(start.values.sellerWebsite);
  const [submitted, setSubmitted] = useState(false);
  // Never restored from a draft: an acknowledgment you didn't tick this time
  // isn't an acknowledgment. It is kept when resuming your own live listing.
  const [agreed, setAgreed] = useState(Boolean(editing));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [demoError, setDemoError] = useState("");

  // Fixed for the life of the form: replacing either means picking a new file,
  // which is tracked by packageFile / demoFile above.
  const existingPackage = editing?.packagePath ?? null;
  const existingDemo = editing?.demoVideo ?? null;
  // Screenshots are the exception — individual ones can be removed.
  const [existingShots, setExistingShots] = useState<string[]>(
    editing?.screenshots ?? []
  );

  /**
   * Fields currently holding imported text, and where each came from.
   *
   * An entry lives exactly as long as the value is still the machine's: the
   * seller types in the field and it goes. That's what makes the "check these"
   * prompt actionable rather than decorative — the chips that remain are
   * precisely the values nobody has looked at yet.
   */
  const [imported, setImported] = useState<Partial<Record<ImportedKey, SourceKind>>>({});
  /**
   * Dropdowns the seller has chosen for themselves.
   *
   * Text fields can be left alone when they're non-empty, but category and
   * runtime always hold *something* — so "empty" can't be the test for whether
   * import may write to them. Touching one is.
   */
  const [touched, setTouched] = useState<Set<ImportedKey>>(new Set());

  const [savedAt, setSavedAt] = useState<number | null>(
    start.fromDraft ? start.values.savedAt : null
  );
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const router = useRouter();

  // An admin can retire a filter between the day a draft is saved and the day
  // it's submitted. Fall back to the first live one, so a tool is never filed
  // under a category that no longer exists and nobody can browse to. Derived
  // rather than stored, so a filter reappearing restores the seller's choice.
  const activeCategory =
    categories.some((c) => c.id === category)
      ? category
      : (categories[0]?.id ?? category);

  const draft: Draft = {
    title, tagline, description, category: activeCategory, runtime, setupMode,
    price, sellerBio, sellerEmail, sellerWebsite, savedAt: 0,
  };
  const draftJson = JSON.stringify(draft);

  function saveDraft() {
    const now = Date.now();
    writeDraft(draftKey, { ...draft, savedAt: now });
    setSavedAt(now);
  }

  // Autosave shortly after typing stops, so the explicit button below is a
  // reassurance rather than a requirement.
  useEffect(() => {
    if (submitted) return;
    if (draftJson === EMPTY_DRAFT_JSON) return;
    const t = setTimeout(() => {
      const now = Date.now();
      writeDraft(draftKey, { ...JSON.parse(draftJson), savedAt: now });
      setSavedAt(now);
    }, 800);
    return () => clearTimeout(t);
  }, [draftJson, draftKey, submitted]);

  // Files can't go in localStorage, so they're the one thing a reload really
  // does destroy. That's what these two guards are protecting.
  const hasPickedFiles =
    Boolean(packageFile) || Boolean(demoFile) || screenshotFiles.length > 0;
  const hasWork = hasPickedFiles || draftJson !== EMPTY_DRAFT_JSON;
  const guard = hasWork && !submitted && !uploading;

  useEffect(() => {
    if (!guard) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [guard]);

  // In-app links (the nav, the footer, "← Dashboard") unmount this form, so
  // beforeunload never fires for them. Catch the click instead.
  useEffect(() => {
    if (!guard) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href || !href.startsWith("/")) return;
      if (anchor.target === "_blank") return;
      if (href === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeavingTo(href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [guard]);

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

  /**
   * Pour an import into the form, and report how much of it landed.
   *
   * Empty fields only. A seller who has already written their own tagline
   * doesn't want it replaced by a scraped one, and there is no undo on a form
   * — so the rule is that import adds, never overwrites. The dropdowns go by
   * `touched` instead of emptiness, because they always hold a default.
   */
  function applyImport(result: ImportResult): number {
    const marks: Partial<Record<ImportedKey, SourceKind>> = {};
    const fields = result.fields;

    if (fields.title && !title.trim()) {
      setTitle(fields.title.value);
      marks.title = fields.title.from;
    }
    if (fields.tagline && !tagline.trim()) {
      setTagline(fields.tagline.value);
      marks.tagline = fields.tagline.from;
    }
    if (fields.description && !description.trim()) {
      setDescription(fields.description.value);
      marks.description = fields.description.from;
    }
    if (fields.category && !touched.has("category")) {
      setCategory(fields.category.value);
      marks.category = fields.category.from;
    }
    if (fields.runtime && !touched.has("runtime")) {
      setRuntime(fields.runtime.value);
      marks.runtime = fields.runtime.from;
    }
    if (fields.sellerWebsite && !sellerWebsite.trim()) {
      setSellerWebsite(fields.sellerWebsite.value);
      marks.sellerWebsite = fields.sellerWebsite.from;
    }

    setImported((prev) => ({ ...prev, ...marks }));
    return Object.keys(marks).length;
  }

  /** The seller has made this field their own — drop the provenance chip. */
  function clearMark(key: ImportedKey) {
    setImported((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /** A dropdown the seller has set deliberately; import must leave it alone. */
  function markTouched(key: ImportedKey) {
    setTouched((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
    clearMark(key);
  }

  /** The provenance label for a field, or undefined once it's been edited. */
  function sourceOf(key: ImportedKey): string | undefined {
    const from = imported[key];
    return from ? SOURCE_LABELS[from] : undefined;
  }

  function addImportedScreenshot(file: File) {
    const room = Math.max(0, 5 - existingShots.length - screenshotFiles.length);
    if (room <= 0) return;
    setScreenshotFiles((prev) => [...prev, file]);
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
      // Storage paths are scoped by uid — see storage.rules; a seller may only
      // write inside their own folder.
      const uid = user!.uid;
      const [packagePath, demoUrl, newShotUrls, posterUrl] = await Promise.all([
        packageFile
          ? uploadPackage(uid, listingId, packageFile)
          : Promise.resolve(existingPackage!),
        demoFile
          ? uploadDemoVideo(uid, listingId, demoFile)
          : Promise.resolve(existingDemo!),
        screenshotFiles.length
          ? uploadScreenshots(uid, listingId, screenshotFiles)
          : Promise.resolve<string[]>([]),
        // A still cut from this exact video, so the card can never show a frame
        // of a demo that's been replaced. Best-effort: a file we can't decode
        // falls back to the first screenshot at render time.
        demoFile
          ? capturePoster(uid, listingId, demoFile)
          : Promise.resolve(editing?.posterImage),
      ]);
      const screenshots = [...existingShots, ...newShotUrls].slice(0, 5);

      const priceCents = Math.round(parseFloat(price || "0") * 100);
      const data = {
        sellerId: user!.uid,
        sellerName: user!.displayName,
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category: activeCategory,
        runtime,
        setupMode,
        priceCents,
        screenshots,
        demoVideo: demoUrl,
        posterImage: posterUrl,
        sellerBio: sellerBio.trim() || undefined,
        sellerEmail: sellerEmail.trim(), // required
        sellerWebsite: safeHttpsUrl(sellerWebsite),
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
      if (draftKey) clearDraft(draftKey); // it's in Firestore now
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
    const problem = await validateDemo(file);
    if (problem) {
      setDemoFile(null);
      setDemoError(problem);
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
  if (sellerWebsite.trim() && !safeHttpsUrl(sellerWebsite)) missing.push("a valid https:// website link");
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        {/* Only when creating. Editing a listing means the fields are already
            full, and import never overwrites — it would have nothing to do. */}
        {!editId && (
          <ImportFromUrl
            onApply={applyImport}
            onAddScreenshot={addImportedScreenshot}
            screenshotRoom={Math.max(
              0,
              5 - existingShots.length - screenshotFiles.length
            )}
            disabled={uploading}
          />
        )}

        {/* Sits above the fields, where a seller can reach it at any point
            without scrolling to the bottom of a long form. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-6">
          <Button
            type="button"
            variant="secondary"
            onClick={saveDraft}
            disabled={uploading}
          >
            Save draft
          </Button>
          {savedAt !== null && !uploading && (
            <span className="text-xs text-[var(--muted)]">
              Draft saved {savedAgo(savedAt)}. Files still need choosing.
            </span>
          )}
        </div>

        <FormSection title="Your tool">
          <Field
            label="App name"
            hint="Short and clear."
            counter={{ value: title, max: TITLE_MAX }}
            source={sourceOf("title")}
          >
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearMark("title");
              }}
              maxLength={TITLE_MAX}
              placeholder="e.g. CSV Cleaner"
              className={inputClass}
            />
          </Field>

          <Field
            label="One-line tagline"
            hint="One sentence."
            counter={{ value: tagline, max: TAGLINE_MAX }}
            source={sourceOf("tagline")}
          >
            <input
              value={tagline}
              onChange={(e) => {
                setTagline(e.target.value);
                clearMark("tagline");
              }}
              maxLength={TAGLINE_MAX}
              placeholder="What it does, in one sentence."
              className={inputClass}
            />
          </Field>

          <Field
            label="Description"
            hint="The main thing a buyer reads. What it solves, and how it runs."
            source={sourceOf("description")}
          >
            <MarkdownEditor
              value={description}
              onChange={(next) => {
                setDescription(next);
                clearMark("description");
              }}
              rows={10}
              placeholder="Describe the app…"
            />
          </Field>

          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="What job does it do?" source={sourceOf("category")}>
              <select
                value={activeCategory}
                onChange={(e) => {
                  setCategory(e.target.value);
                  markTouched("category");
                }}
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-[var(--muted)]">
                {categories.find((c) => c.id === activeCategory)?.hint}
              </p>
            </Field>

            <Field
              label="Runtime"
              hint="What a buyer needs installed to run it."
              source={sourceOf("runtime")}
            >
              <select
                value={runtime}
                onChange={(e) => {
                  setRuntime(e.target.value as Runtime);
                  markTouched("runtime");
                }}
                className={inputClass}
              >
                {(Object.keys(RUNTIME_LABELS) as Runtime[]).map((r) => (
                  <option key={r} value={r}>{RUNTIME_LABELS[r]}</option>
                ))}
              </select>
            </Field>
          </div>
        </FormSection>


        <FormSection title="Pricing">
          <Field
            label="Price (USD)"
            hint="Between $15 and $250."
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
        </FormSection>

        <FormSection title="Files">
          {/* App package upload */}
          <Field
            label="App package (.zip)"
            hint="Needs manifest.json, README.md, SETUP.md, LICENSE.md and src/. Max 200MB."
          >
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-6 text-sm hover:border-[var(--accent)]">
              <span className="text-[var(--muted)]">
                {packageFile ? (
                  <span className="text-[var(--foreground)]">📦 {packageFile.name}</span>
                ) : existingPackage ? (
                  <span className="text-[var(--foreground)]">
                    📦 {existingPackage.split("/").pop()}{" "}
                    <span className="text-[var(--muted)]">current, click to replace</span>
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


          {/* Demo video, required */}
          <Field
            label="Demo video (required)"
            hint="Up to 40 seconds. Export MP4 (H.264); .mov won't play on Android. Aim under 25MB."
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
                    ? "▶ Current demo video, click to replace"
                    : "Click to upload a demo video (mp4 or webm)"}
              </span>
              <span className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs">
                Browse
              </span>
              <input
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                onChange={(e) => pickDemo(e.target.files?.[0] ?? null)}
              />
            </label>
            {demoError && (
              <p className="mt-1.5 text-xs text-[var(--danger)]">{demoError}</p>
            )}
          </Field>


          {/* Screenshots, up to 5 */}
          <Field
            label="Screenshots (up to 5)"
            hint="Optional. Show the tool actually working."
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

        </FormSection>

        {/* Seller / contact info, shown to buyers on the listing page */}
        <FormSection
          title="About you"
          hint="Shown to buyers in the &ldquo;About the seller&rdquo; section."
        >
          <div className="space-y-6">
            <Field label="Short bio" hint="A sentence about who you are.">
              <textarea
                value={sellerBio}
                onChange={(e) => setSellerBio(e.target.value)}
                rows={3}
                placeholder="e.g. Indie maker building small, privacy-first tools for freelancers."
                className={`${inputClass} resize-y`}
              />
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Support email (required)" hint="Where buyers reach you for help.">
                <input
                  type="email"
                  required
                  value={sellerEmail}
                  onChange={(e) => setSellerEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </Field>
              <Field
                label="Website or profile"
                hint="Optional. A link buyers can check."
                source={sourceOf("sellerWebsite")}
              >
                <input
                  type="url"
                  value={sellerWebsite}
                  onChange={(e) => {
                    setSellerWebsite(e.target.value);
                    clearMark("sellerWebsite");
                  }}
                  placeholder="https://your-site.com"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </FormSection>

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

        <div className="flex flex-wrap items-center gap-3">
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

      {leavingTo && (
        <LeaveWarning
          hasPickedFiles={hasPickedFiles}
          onStay={() => setLeavingTo(null)}
          onLeave={() => {
            saveDraft();
            const href = leavingTo;
            setLeavingTo(null);
            router.push(href);
          }}
        />
      )}
    </Section>
  );
}

/**
 * Shown when the seller clicks away mid-listing. It's deliberately specific
 * about what survives: the typed fields are already in a draft, the chosen
 * files are not, and a vague "you have unsaved changes" wouldn't tell them
 * which one they're about to lose.
 */
function LeaveWarning({
  hasPickedFiles,
  onStay,
  onLeave,
}: {
  hasPickedFiles: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onStay}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
      >
        <h2 id="leave-title" className="text-lg font-semibold">
          Leave this listing?
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Everything you&apos;ve typed is saved as a draft and will be waiting
          when you come back.
          {hasPickedFiles && (
            <>
              {" "}
              <span className="text-[var(--foreground)]">
                The files you chose can&apos;t be saved.
              </span>{" "}
              You&apos;ll need to pick your package, demo video and screenshots
              again.
            </>
          )}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onStay}>
            Keep editing
          </Button>
          <Button variant="ghost" onClick={onLeave}>
            Leave anyway
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * The typed half of the form, kept in localStorage so a refresh, a crash or a
 * misclick doesn't cost the seller twenty minutes of writing. Files are not in
 * here and cannot be — the browser won't serialize a File — which is exactly
 * why leaving the page still warns.
 */
/** The fields a URL import is able to write to. */
type ImportedKey =
  | "title"
  | "tagline"
  | "description"
  | "category"
  | "runtime"
  | "sellerWebsite";

type Draft = {
  title: string;
  tagline: string;
  description: string;
  category: Category;
  runtime: Runtime;
  setupMode: SetupMode;
  price: string;
  sellerBio: string;
  sellerEmail: string;
  sellerWebsite: string;
  savedAt: number;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  tagline: "",
  description: "",
  category: "productivity",
  runtime: "node",
  setupMode: "one-command",
  price: "15",
  sellerBio: "",
  sellerEmail: "",
  sellerWebsite: "",
  savedAt: 0,
};

const EMPTY_DRAFT_JSON = JSON.stringify(EMPTY_DRAFT);

/** Scoped per seller and per listing, so drafts never leak between them. */
/**
 * Grab and upload a poster for a demo.
 *
 * Never fatal — a demo that saves without a poster is far better than one that
 * doesn't save. On failure it returns "" rather than undefined, and that matters:
 * the Firestore client ignores undefined fields, so undefined would leave the
 * PREVIOUS video's poster attached to the new video. "" clears it, and rendering
 * falls back to the first screenshot.
 */
async function capturePoster(
  uid: string,
  listingId: string,
  file: File
): Promise<string> {
  try {
    const blob = await captureVideoPoster(file);
    return blob ? await uploadPoster(uid, listingId, blob) : "";
  } catch {
    return "";
  }
}

function draftKeyFor(uid: string, editId: string | null) {
  return `solomarket:listing-draft:${uid}:${editId ?? "new"}`;
}

/** The editable fields of a listing being resubmitted. */
function draftFromListing(listing: Listing): Draft {
  return {
    title: listing.title,
    tagline: listing.tagline,
    description: listing.description,
    category: listing.category,
    runtime: listing.runtime,
    setupMode: listing.setupMode,
    price: String(listing.priceCents / 100),
    sellerBio: listing.sellerBio ?? "",
    sellerEmail: listing.sellerEmail ?? "",
    sellerWebsite: listing.sellerWebsite ?? "",
    savedAt: 0,
  };
}

function readDraft(key: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    // Merge over the defaults so a draft written by an older version of this
    // form (missing a field) still loads instead of blanking the input.
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    return null; // private mode, full quota, or hand-edited junk
  }
}

function writeDraft(key: string, draft: Draft) {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage unavailable or full: autosave is a convenience, never a blocker.
  }
}

function clearDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

function savedAgo(ts: number) {
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}


