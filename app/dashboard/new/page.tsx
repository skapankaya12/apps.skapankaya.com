"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  createListing,
  updateListing,
  reserveListingId,
  getListingById,
  notifyListingSubmitted,
  requiresReReview,
  getCategories,
  subscribe,
  sellerProfileReady,
} from "@/lib/store";
import {
  uploadPackage,
  uploadDemoVideo,
  uploadPoster,
  uploadScreenshot,
} from "@/lib/storage";
import {
  useUploadSlot,
  doneSlot,
  isReady,
  isBusy,
  nextSlotId,
  type Slot,
} from "@/lib/uploads";
import {
  RUNTIME_LABELS,
  TAGLINE_MAX,
  TITLE_MAX,
  type Category,
  type Platform,
  type Runtime,
  type SetupMode,
  type Listing,
  type ListingStatus,
  type AppUser,
  type SellerProfile,
  PLATFORM_LABELS,
  SETUP_MODE_LABELS,
  SETUP_MODE_HINTS,
} from "@/lib/types";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";
import { Field, FormSection, inputClass } from "@/components/ui/form";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { ImportFromUrl } from "@/components/ImportFromUrl";
import { SellerAvatar } from "@/components/SellerAvatar";
import { ListingDetail } from "@/components/ListingDetail";
import type { ImportResult, SourceKind } from "@/lib/importClient";
import { SOURCE_LABELS } from "@/lib/importClient";
import { packageAccept, validatePackage, captureVideoPoster, validateDemo } from "@/lib/media";

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

  // Edit mode: /dashboard/new?edit=<listingId> loads any listing of the
  // seller's to edit, live ones included. Existing files are kept unless the
  // seller replaces them. Whether saving keeps it live or sends it back to the
  // queue depends on what they changed; see returnsToReview below.
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

const SETUP_MODES: SetupMode[] = ["one-command", "ai-assisted", "installer"];

/**
 * Whether an already-uploaded package suits the chosen setup method.
 *
 * Format only. Used for a package restored from a draft, where the File is long
 * gone and the stored path is all there is to go on.
 */
function packagePathSuits(path: string, mode: SetupMode): boolean {
  const isInstaller = path.toLowerCase().endsWith(".dmg");
  return mode === "installer" ? isInstaller : !isInstaller;
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
  const [platform, setPlatform] = useState<Platform>(start.values.platform);
  const [price, setPrice] = useState(start.values.price);
  const [version, setVersion] = useState(start.values.version);
  /*
    Where this listing's files go, fixed for the life of the form.

    Files upload as they are chosen now, which means the id they are keyed by
    has to exist before submit rather than being minted inside it. Reserving one
    is free: reserveListingId only generates a document id, it writes nothing.
    It is kept in the draft so coming back tomorrow keeps pointing at the
    uploads already made rather than orphaning them under a fresh id.
  */
  const [listingId] = useState(
    () => editId ?? (start.values.listingId || reserveListingId())
  );

  // Named rather than left to derive from the path: a seller who picked
  // "my-tool.zip" and comes back tomorrow should not be shown the document id
  // it was stored under.
  const pkg = useUploadSlot(
    start.values.packagePath
      ? doneSlot(start.values.packagePath, "Your uploaded package")
      : null
  );
  const demo = useUploadSlot(
    start.values.demoVideo ? doneSlot(start.values.demoVideo, "Current demo video") : null
  );
  const [shots, setShots] = useState<Slot[]>(() =>
    start.values.screenshots.map((url) => doneSlot(url))
  );
  const [posterUrl, setPosterUrl] = useState<string | undefined>(
    start.values.posterImage || undefined
  );
  /**
   * The package File, kept only so switching setup method can re-check it.
   * Not state: nothing renders from it, and it is deliberately not what the
   * form submits, which is the uploaded path in pkg.slot.
   */
  const pkgFile = useRef<File | null>(null);

  const [submitted, setSubmitted] = useState(false);
  // Where the listing landed after an edit. A presentation change keeps a live
  // tool live, so the confirmation must not claim it went off for review.
  const [resultStatus, setResultStatus] = useState<ListingStatus | null>(null);
  // Never restored from a draft: an acknowledgment you didn't tick this time
  // isn't an acknowledgment. It is kept when resuming your own live listing.
  const [agreed, setAgreed] = useState(Boolean(editing));
  // Submitting is now only the Firestore write, so this is brief. Waiting on
  // the files happens while the seller is still filling the form in.
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /** True while any file is still going up, which blocks submit. */
  const filesBusy =
    isBusy(pkg.slot) || isBusy(demo.slot) || shots.some((s) => isBusy(s));

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
  const [previewing, setPreviewing] = useState(false);
  const router = useRouter();

  // An admin can retire a filter between the day a draft is saved and the day
  // it's submitted. Fall back to the first live one, so a tool is never filed
  // under a category that no longer exists and nobody can browse to. Derived
  // rather than stored, so a filter reappearing restores the seller's choice.
  const isInstaller = setupMode === "installer";

  const activeCategory =
    categories.some((c) => c.id === category)
      ? category
      : (categories[0]?.id ?? category);

  /*
    The listing as it would be published, built from what is in the form.

    A seller could not see their own page before submitting it, so the first
    look at their own work was the same moment an admin saw it. Most of what a
    listing gets bounced for is obvious the instant you look at the page.

    Not a real Listing: it carries an id and a slug that match nothing, which is
    why ListingDetail is asked not to go looking for one.
  */
  const previewListing: Listing = {
    id: "preview",
    slug: "preview",
    sellerId: user.uid,
    sellerName: user.displayName,
    title: title.trim() || "Untitled tool",
    tagline: tagline.trim(),
    description: description.trim(),
    category: activeCategory,
    priceCents: Math.round(parseFloat(price || "0") * 100),
    runtime,
    platform: runtime === "binary" ? platform : undefined,
    setupMode,
    screenshots: shots
      .map((sh) => sh.value)
      .filter((v): v is string => Boolean(v)),
    demoVideo: demo.slot?.value,
    posterImage: posterUrl,
    status: "approved",
    version: version.trim() || "1.0.0",
    packagePath: pkg.slot?.value,
    salesCount: editing?.salesCount ?? 0,
    // Zero on a new listing rather than the clock: nothing on the page renders
    // these, and reading the time during render is not something a component is
    // allowed to do.
    createdAt: editing?.createdAt ?? 0,
    updatedAt: editing?.updatedAt ?? 0,
  };

  const draft: Draft = {
    title, tagline, description, category: activeCategory, runtime, setupMode,
    price, version, platform,
    listingId,
    packagePath: pkg.slot?.value ?? "",
    demoVideo: demo.slot?.value ?? "",
    posterImage: posterUrl ?? "",
    screenshots: shots.map((s) => s.value).filter((v): v is string => Boolean(v)),
    savedAt: 0,
  };
  const draftJson = JSON.stringify(draft);
  /*
    Whether the seller has actually done anything.

    listingId is left out of the comparison because it is reserved the moment
    the form mounts, so including it would make an untouched form look like work
    in progress: it would autosave an empty draft and warn about losing nothing
    on the way out.
  */
  const untouched = draftContent(draft) === EMPTY_DRAFT_CONTENT;

  function saveDraft() {
    const now = Date.now();
    writeDraft(draftKey, { ...draft, savedAt: now });
    setSavedAt(now);
  }

  // Autosave shortly after typing stops, so the explicit button below is a
  // reassurance rather than a requirement.
  useEffect(() => {
    if (submitted || untouched) return;
    const t = setTimeout(() => {
      const now = Date.now();
      writeDraft(draftKey, { ...JSON.parse(draftJson), savedAt: now });
      setSavedAt(now);
    }, 800);
    return () => clearTimeout(t);
  }, [draftJson, draftKey, submitted, untouched]);

  /*
    What leaving now would actually cost.

    It used to be the files: they lived in memory, so a reload destroyed them
    and the warning existed mostly to say so. They upload on pick now and the
    draft holds their references, so the only thing genuinely at risk is an
    upload still in flight, which navigating away does cancel.
  */
  const hasWork = !untouched;
  const guard = (hasWork || filesBusy) && !submitted && !saving;

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
    // An edit that never left the queue is the only case that went for review.
    const stayedLive = resultStatus === "approved" || resultStatus === "unlisted";
    return (
      <Section className="max-w-lg py-24 text-center">
        <div
          className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-3xl ${
            stayedLive ? "bg-[var(--success-soft)]" : "bg-[var(--warning-soft)]"
          }`}
        >
          {stayedLive ? "✓" : "🕓"}
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {stayedLive ? "Changes saved" : "Submitted for review"}
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          {stayedLive
            ? resultStatus === "approved"
              ? "Your listing is updated and still on sale. Nothing went offline."
              : "Your listing is updated. It stays off sale until you put it back."
            : "Our team reviews every app before it goes live, usually within 1 to 2 business days. You'll see the status update on your dashboard."}
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
    // fields.sellerWebsite is deliberately ignored. It used to fill a field on
    // this form; that field now lives on the seller's profile, and quietly
    // rewriting someone's profile from inside a listing form is a surprise.
    // The import adapters still return it, which costs nothing.

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
    if (shots.length >= 5) return;
    startShot(file);
  }

  /**
   * Write the listing. Nothing is uploaded here any more.
   *
   * Every file went up as it was chosen, so this is one Firestore write and
   * returns in a moment. It used to be a Promise.all of every upload, which for
   * a 500MB installer meant minutes of a disabled button and, on any failure,
   * the loss of the uploads that had already succeeded.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setError("");
    setSaving(true);
    try {
      const data = {
        sellerId: user.uid,
        sellerName: user.displayName,
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category: activeCategory,
        runtime,
        platform: runtime === "binary" ? platform : undefined,
        setupMode,
        priceCents: Math.round(parseFloat(price || "0") * 100),
        screenshots: shots
          .map((s) => s.value)
          .filter((v): v is string => Boolean(v))
          .slice(0, 5),
        demoVideo: demo.slot!.value!,
        posterImage: posterUrl,
        version: version.trim(),
        packagePath: pkg.slot!.value!,
      };

      let landedIn: ListingStatus = "pending";
      if (editId) {
        // Answers with where the listing ended up: a presentation edit keeps a
        // live tool live, anything touching the package sends it back.
        landedIn = await updateListing(editId, data, editing!);
        setResultStatus(landedIn);
      } else {
        await createListing(listingId, data);
      }
      // Best-effort admin notification, but only when there is actually
      // something to review. An in-place edit to a live listing never entered
      // the queue, and mailing "new listing to review" for a corrected typo is
      // how a review inbox stops being read.
      if (landedIn === "pending") await notifyListingSubmitted(listingId);
      if (draftKey) clearDraft(draftKey); // it's in Firestore now
      setSubmitted(true);
    } catch (err) {
      console.error("[new listing] submit failed:", err);
      setError("Couldn't save your listing. Please try again.");
      setSaving(false);
    }
  }

  /**
   * Take screenshots and start sending them straight away.
   *
   * Each gets its own slot, so one failing does not take the others with it and
   * the seller can see which landed.
   */
  function addScreenshots(files: FileList | null) {
    if (!files) return;
    const room = Math.max(0, 5 - shots.length);
    for (const file of Array.from(files).slice(0, room)) startShot(file);
  }

  function startShot(file: File) {
    const id = nextSlotId();
    setShots((prev) => [...prev, { id, name: file.name, progress: 0 }]);
    const patch = (fn: (s: Slot) => Slot) =>
      setShots((prev) => prev.map((s) => (s.id === id ? fn(s) : s)));

    uploadScreenshot(user.uid, listingId, file, (progress) =>
      patch((s) => ({ ...s, progress }))
    )
      .then((url) => patch((s) => ({ ...s, progress: 1, value: url })))
      .catch((err) => {
        console.error("[screenshot]", err);
        patch((s) => ({ ...s, error: "Upload failed. Remove it and try again." }));
      });
  }

  function removeShot(id: number) {
    setShots((prev) => prev.filter((s) => s.id !== id));
  }

  /**
   * Switching setup method can invalidate a package already uploaded: a .zip is
   * not an installer and a .dmg is not a source package. Drop it here, where
   * the seller is looking, rather than at submit when they've moved on.
   */
  function chooseSetupMode(mode: SetupMode) {
    setSetupMode(mode);
    if (!pkg.slot) return;
    // The File itself when this session chose it, because that also catches the
    // size limit changing: installers get 500MB and source packages 200MB, so
    // switching away from installer can make an accepted file too big. A
    // package restored from a draft is only known by its path, which still
    // settles the format question.
    const stillFits = pkgFile.current
      ? !validatePackage(pkgFile.current, mode)
      : !pkg.slot.value || packagePathSuits(pkg.slot.value, mode);
    if (!stillFits) {
      pkg.clear();
      pkgFile.current = null;
      setError(
        "That package doesn't match the setup method you picked. Choose the file again."
      );
    }
  }

  /**
   * Accept a package and start uploading it immediately.
   *
   * What counts as valid depends on the setup method: source in a .zip, or a
   * signed .dmg for a native app. lib/media owns both rules.
   */
  function pickPackage(file: File | null) {
    setError("");
    if (!file) return;
    const problem = validatePackage(file, setupMode);
    if (problem) {
      pkg.reject(file.name, problem);
      pkgFile.current = null;
      return;
    }
    pkgFile.current = file;
    void pkg.begin(file.name, (onProgress) =>
      uploadPackage(user.uid, listingId, file, onProgress)
    );
  }

  /**
   * Accept a demo and start uploading it, with the poster cut from it.
   *
   * Validated before anything is sent: the public bucket caps size and we only
   * want short clips, and a clear message here beats a raw 403 later.
   */
  async function pickDemo(file: File | null) {
    if (!file) return;
    const problem = await validateDemo(file);
    if (problem) {
      demo.reject(file.name, problem);
      return;
    }
    const url = await demo.begin(file.name, (onProgress) =>
      uploadDemoVideo(user.uid, listingId, file, onProgress)
    );
    // Only worth cutting a poster once the demo it belongs to is actually
    // stored. Best effort: a video we cannot decode falls back to the first
    // screenshot at render time.
    if (url) setPosterUrl(await capturePoster(user.uid, listingId, file));
  }

  // The seller's public details are on their profile now, so this form checks
  // that the profile is usable rather than collecting the same fields again.
  const profileReady = sellerProfileReady(user);

  /*
    Whether saving will take this listing off sale.

    Asked before anything is uploaded, so the package is represented by whether
    a new file has been chosen rather than by a path that does not exist yet.
    Everything else is compared through requiresReReview, which reads the same
    field list firestore.rules enforces.
  */
  const wasLive =
    editing?.status === "approved" || editing?.status === "unlisted";
  const returnsToReview =
    !editing ||
    !wasLive ||
    requiresReReview(editing, {
      packagePath: pkg.slot?.value,
      runtime,
      setupMode,
      platform: runtime === "binary" ? platform : undefined,
      version: version.trim(),
    });

  // Exactly what's still blocking submission, in field order — so the button's
  // hint names the culprit instead of a vague "fill all fields".
  const missing: string[] = [];
  if (!title.trim()) missing.push("app name");
  if (!tagline.trim()) missing.push("tagline");
  if (description.trim().length <= 20) missing.push("a longer description (20+ characters)");
  const priceNum = parseFloat(price || "0");
  if (!(priceNum >= 15 && priceNum <= 250)) missing.push("a price between $15 and $250");
  if (!/^\d+\.\d+(\.\d+)?$/.test(version.trim()))
    missing.push("a version like 1.0.0");
  if (!isReady(pkg.slot))
    missing.push(isBusy(pkg.slot) ? "the package to finish uploading" : "a package");
  if (!isReady(demo.slot))
    missing.push(
      isBusy(demo.slot) ? "the demo to finish uploading" : "a demo video"
    );
  if (shots.some((sh) => isBusy(sh))) missing.push("screenshots to finish uploading");
  if (!profileReady) missing.push("your seller profile");
  if (!agreed) missing.push("the acknowledgment");
  const valid = missing.length === 0;

  return (
    <Section className="max-w-2xl py-12">
      <ButtonLink href="/dashboard" variant="ghost" size="sm">← Dashboard</ButtonLink>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {editId ? "Edit listing" : "New listing"}
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        {!editId
          ? "Fill this in, upload your app package, and submit for review."
          : wasLive && !returnsToReview
            ? "Your edits go live as soon as you save. Files you don't replace stay as they are."
            : "Update your listing and send it back for review. Files you don't replace stay as they are."}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-10">
        {/* Only when creating. Editing a listing means the fields are already
            full, and import never overwrites — it would have nothing to do. */}
        {!editId && (
          <ImportFromUrl
            onApply={applyImport}
            onAddScreenshot={addImportedScreenshot}
            screenshotRoom={Math.max(0, 5 - shots.length)}
            disabled={saving}
          />
        )}

        {/* Sits above the fields, where a seller can reach it at any point
            without scrolling to the bottom of a long form. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-6">
          <Button
            type="button"
            variant="secondary"
            onClick={saveDraft}
            disabled={saving}
          >
            Save draft
          </Button>
          {/* Sits with Save draft rather than by the submit button: looking at
              your own page is something to do while writing it, not a final
              step before sending it off. */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setPreviewing(true)}
            disabled={saving}
          >
            Preview
          </Button>
          {savedAt !== null && !saving && (
            <span className="text-xs text-[var(--muted)]">
              {/* Files are in the draft now, so this no longer has to warn
                  that they are the one thing it cannot keep. */}
              Draft saved {savedAgo(savedAt)}.
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

          {/* Only a compiled app has a platform worth asking about. A script is
              portable because its runtime is, so asking would be noise on every
              listing to serve a minority of them. */}
          {runtime === "binary" && (
            <Field
              label="Runs on"
              hint="Buyers see this before they pay."
            >
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className={inputClass}
              >
                {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                  <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>
                ))}
              </select>
            </Field>
          )}
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
            <div className="grid gap-3 sm:grid-cols-3">
              {SETUP_MODES.map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => chooseSetupMode(mode)}
                  className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                    setupMode === mode
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  <span className="font-medium">{SETUP_MODE_LABELS[mode]}</span>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {SETUP_MODE_HINTS[mode]}
                  </span>
                </button>
              ))}
            </div>
          </Field>
        </FormSection>

        <FormSection title="Files">
          {/* Version sits with the package because that is what it describes.
              It had no input at all before: every listing was written as 1.0.0
              and stayed there, so the Library's "update available" flag could
              never fire for anyone. */}
          <Field
            label="Version"
            hint="Bump it when you upload a new package."
          >
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              spellCheck={false}
              className={`${inputClass} max-w-[160px]`}
            />
          </Field>

          {/* App package. Uploads as soon as it is chosen. */}
          <Field
            label={isInstaller ? "Installer (.dmg)" : "App package (.zip)"}
            hint={
              isInstaller
                ? "Signed and notarized. We check the signature before it goes live. Max 500MB."
                : "Needs manifest.json, README.md, SETUP.md, LICENSE.md and src/. Max 200MB."
            }
          >
            <FilePicker
              slot={pkg.slot}
              icon="📦"
              empty={
                isInstaller
                  ? "Click to choose your .dmg installer"
                  : "Click to choose your .zip package"
              }
              accept={packageAccept(setupMode)}
              onPick={(f) => pickPackage(f)}
            />
          </Field>

          {/* Demo video, required */}
          <Field
            label="Demo video (required)"
            hint="Up to 40 seconds. Export MP4 (H.264); .mov won't play on Android. Aim under 25MB."
          >
            <FilePicker
              slot={demo.slot}
              icon="▶"
              empty="Click to upload a demo video (mp4 or webm)"
              accept="video/mp4,video/webm"
              onPick={(f) => void pickDemo(f)}
            />
          </Field>

          {/* Screenshots, up to 5 */}
          <Field
            label="Screenshots (up to 5)"
            hint="Optional. Show the tool actually working."
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {shots.map((shot, i) => (
                <div
                  key={shot.id}
                  className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]"
                >
                  {shot.value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={shot.value}
                      alt={`Screenshot ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 p-2 text-center">
                      <span className="text-xl">{shot.error ? "⚠️" : "🖼️"}</span>
                      <span className="line-clamp-2 text-[9px] leading-tight text-[var(--muted)]">
                        {shot.error ?? shot.name}
                      </span>
                      {!shot.error && (
                        <ProgressBar fraction={shot.progress} className="w-4/5" />
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeShot(shot.id)}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--danger)] text-xs text-white"
                    aria-label="Remove screenshot"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {shots.length < 5 && (
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

        {/* Who the buyer is dealing with. Not asked for here any more: it
            belongs to the seller, not to one of their tools. This is a summary
            with a way to fix it, so a missing support email is caught before
            the submit button explains it in the abstract. */}
        <FormSection
          title="About you"
          hint="From your profile. Shown on every tool you list."
        >
          <SellerProfileSummary user={user} />
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

        {/* A live seller needs to know, before they press it, whether this
            button takes their tool off sale. Nothing said so before, and the
            answer used to be "always". */}
        {editId && wasLive && (
          <p
            className={`rounded-xl border px-4 py-3 text-sm ${
              returnsToReview
                ? "border-[var(--warning)] bg-[var(--warning-soft)] text-[var(--foreground)]"
                : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)]"
            }`}
          >
            {returnsToReview
              ? "You changed the package or how the tool runs, so this goes back for review. It comes off sale until that's done."
              : "These are presentation changes, so your listing stays exactly as it is on the marketplace while they save."}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={!valid || saving}>
            {saving
              ? "Saving…"
              : !editId
                ? "Submit for review"
                : returnsToReview
                  ? "Resubmit for review"
                  : "Save changes"}
          </Button>
          {!valid && !saving && (
            <Badge tone="neutral">Still needed: {missing.join(", ")}</Badge>
          )}
        </div>

        {error && (
          <p className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
      </form>

      {previewing && (
        <ListingPreview
          listing={previewListing}
          seller={{
            uid: user.uid,
            handle: user.handle,
            displayName: user.displayName,
            bio: user.bio,
            supportEmail: user.supportEmail,
            website: user.website,
            avatarUrl: user.avatarUrl,
            memberSince: user.createdAt,
          }}
          onClose={() => setPreviewing(false)}
        />
      )}

      {leavingTo && (
        <LeaveWarning
          uploadInFlight={filesBusy}
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
 * The listing as a buyer would meet it, over the form.
 *
 * Deliberately the real ListingDetail rather than a summary of it: a preview
 * that only approximates the page is a preview you cannot trust, and the
 * difference between the two is where the mistakes hide. It is handed the
 * seller's own profile because that is what the published page will show.
 */
function ListingPreview({
  listing,
  seller,
  onClose,
}: {
  listing: Listing;
  seller: SellerProfile;
  onClose: () => void;
}) {
  // Escape closes it, because this covers the whole form and a seller who
  // opened it mid-sentence wants out without hunting for a button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Listing preview"
      className="fixed inset-0 z-50 overflow-y-auto bg-[var(--background)]"
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div>
          <span className="font-medium">Preview</span>
          <span className="ml-2 text-sm text-[var(--muted)]">
            This is your page as a buyer sees it. Nothing here is live yet.
          </span>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Back to editing
        </Button>
      </div>
      <ListingDetail
        slug={listing.slug}
        initial={listing}
        seller={seller}
        preview
      />
    </div>
  );
}

/** A thin bar, 0 to 1. The only feedback a long upload used to have was none. */
function ProgressBar({
  fraction,
  className = "",
}: {
  fraction: number;
  className?: string;
}) {
  return (
    <span
      className={`block h-1 overflow-hidden rounded-full bg-[var(--border)] ${className}`}
    >
      <span
        className="block h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` }}
      />
    </span>
  );
}

/**
 * A drop target for one file, which starts uploading the moment it is chosen.
 *
 * Four states worth telling apart: nothing chosen, going up, landed, and
 * failed. The old field had one, and a seller waiting on a 500MB installer had
 * no way to tell a slow connection from a stalled one.
 */
function FilePicker({
  slot,
  icon,
  empty,
  accept,
  onPick,
}: {
  slot: Slot | null;
  icon: string;
  empty: string;
  accept: string;
  onPick: (file: File | null) => void;
}) {
  const done = isReady(slot);
  const busy = isBusy(slot);
  const failed = Boolean(slot?.error);

  return (
    <div>
      <label
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-6 text-sm hover:border-[var(--accent)] ${
          failed
            ? "border-[var(--danger)] bg-[var(--surface-muted)]"
            : done
              ? "border-[var(--success)] bg-[var(--success-soft)]"
              : "border-[var(--border-strong)] bg-[var(--surface-muted)]"
        }`}
      >
        <span className="min-w-0 flex-1">
          {slot ? (
            <>
              <span className="block truncate text-[var(--foreground)]">
                {icon} {slot.name}
              </span>
              {busy && (
                <span className="mt-2 flex items-center gap-2">
                  <ProgressBar fraction={slot.progress} className="w-40" />
                  <span className="text-xs tabular-nums text-[var(--muted)]">
                    {Math.round(slot.progress * 100)}%
                  </span>
                </span>
              )}
              {done && (
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Uploaded. Click to replace.
                </span>
              )}
            </>
          ) : (
            <span className="text-[var(--muted)]">{empty}</span>
          )}
        </span>
        <span className="shrink-0 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs">
          Browse
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>
      {slot?.error && (
        <p className="mt-1.5 text-xs text-[var(--danger)]">{slot.error}</p>
      )}
    </div>
  );
}

/**
 * Shown when the seller clicks away mid-listing. It's deliberately specific
 * about what survives, rather than a vague "you have unsaved changes".
 *
 * It used to warn that the chosen files would be lost, which was true when they
 * sat in memory until submit. They upload as they are picked now and the draft
 * keeps their references, so the only thing still at risk is an upload that has
 * not finished, which leaving really does cancel.
 */
function LeaveWarning({
  uploadInFlight,
  onStay,
  onLeave,
}: {
  uploadInFlight: boolean;
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
          Everything you&apos;ve typed is saved as a draft, and the files
          you&apos;ve uploaded are saved with it, so it will all be waiting when
          you come back.
          {uploadInFlight && (
            <>
              {" "}
              <span className="text-[var(--foreground)]">
                One of your files is still uploading.
              </span>{" "}
              Leaving now cancels it, and you&apos;ll need to choose that file
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
 * What buyers will see about the seller, read from their profile.
 *
 * A summary rather than a set of inputs. The seller's bio, contact and link
 * used to be asked for here, once per listing, which meant three tools carried
 * three copies of the same details and correcting one of them sent that listing
 * back through review. They live on the account now.
 *
 * Shown here anyway because this is the moment it matters: a seller about to
 * publish should see the face and the support address that go out with it, and
 * a missing support email should be visible now rather than as an entry in the
 * list of reasons the submit button is disabled.
 */
function SellerProfileSummary({ user }: { user: AppUser }) {
  const ready = sellerProfileReady(user);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start gap-3">
        <SellerAvatar seller={user} size={44} />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{user.displayName}</div>
          <p className="mt-0.5 break-words text-sm text-[var(--muted)]">
            {user.bio?.trim() || "No bio yet."}
          </p>
          <p className="mt-1 break-words text-xs text-[var(--muted)]">
            {user.supportEmail?.trim() || "No support email yet."}
            {user.handle ? ` · /seller/${user.handle}` : ""}
          </p>
        </div>
        <ButtonLink href="/account" variant="secondary" size="sm">
          Edit
        </ButtonLink>
      </div>

      {!ready && (
        <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--danger)]">
          {!user.supportEmail?.trim() && !user.handle
            ? "Add a support email and claim your handle before you publish."
            : !user.supportEmail?.trim()
              ? "Add a support email before you publish. Buyers need a way to reach you."
              : "Claim your handle before you publish."}
        </p>
      )}
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
  | "runtime";

type Draft = {
  title: string;
  tagline: string;
  description: string;
  category: Category;
  runtime: Runtime;
  setupMode: SetupMode;
  platform: Platform;
  price: string;
  version: string;
  /*
    The uploaded files, as the references they became.

    A File cannot be serialized, so the old draft held only the typed fields and
    told the seller so: "Draft saved. Files still need choosing." Now that the
    bytes go up on pick, what is left is a handful of strings, and coming back
    tomorrow no longer costs a 500MB re-upload.

    listingId comes with them because the uploads are stored under it. Losing it
    would leave the files orphaned in the bucket and the draft pointing at
    nothing.
  */
  listingId: string;
  packagePath: string;
  demoVideo: string;
  posterImage: string;
  screenshots: string[];
  savedAt: number;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  tagline: "",
  description: "",
  category: "productivity",
  runtime: "node",
  setupMode: "one-command",
  platform: "macos",
  price: "15",
  version: "1.0.0",
  listingId: "",
  packagePath: "",
  demoVideo: "",
  posterImage: "",
  screenshots: [],
  savedAt: 0,
};

/**
 * A draft reduced to what the seller actually filled in, in a stable key order.
 *
 * Drops the two fields that carry no intent: listingId, which is reserved on
 * mount, and savedAt, which is a clock reading.
 *
 * The sort matters more than it looks. This comparison used to stringify the
 * live draft against EMPTY_DRAFT directly, and the two literals happened to
 * list `platform` in different places. JSON.stringify follows insertion order,
 * so the strings never matched however empty the form was, and every visit to
 * this page autosaved a blank draft and armed the "are you sure you want to
 * leave" dialog over nothing.
 */
function draftContent(d: Draft): string {
  const rest: Partial<Draft> = { ...d };
  delete rest.listingId;
  delete rest.savedAt;
  return JSON.stringify(rest, Object.keys(rest).sort());
}

const EMPTY_DRAFT_CONTENT = draftContent(EMPTY_DRAFT);

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
    // Listings predate the platform field; macOS is the only installer format
    // accepted today, so it is the safe default rather than a guess.
    platform: listing.platform ?? "macos",
    price: String(listing.priceCents / 100),
    version: listing.version,
    listingId: listing.id,
    packagePath: listing.packagePath ?? "",
    demoVideo: listing.demoVideo ?? "",
    posterImage: listing.posterImage ?? "",
    screenshots: listing.screenshots ?? [],
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


