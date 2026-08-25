"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import {
  getListingById,
  adminUpdateListing,
  getCategories,
} from "@/lib/store";
import { uploadDemoVideo, uploadPoster, uploadScreenshots } from "@/lib/storage";
import { captureVideoPoster, validateDemo } from "@/lib/media";
import {
  RUNTIME_LABELS,
  TAGLINE_MAX,
  TITLE_MAX,
  type Runtime,
  type SetupMode,
} from "@/lib/types";
import { safeHttpsUrl } from "@/lib/utils";
import { Section, Button, ButtonLink, StatusBadge } from "@/components/ui";
import { Field, inputClass } from "@/components/ui/form";
import { MarkdownEditor } from "@/components/MarkdownEditor";

/**
 * Admin edit for any listing on the marketplace.
 *
 * Sellers own their listings, but an admin has to be able to correct one
 * without waiting on the maker: a typo in a tagline, a tool filed under the
 * wrong browse filter, a demo video in a container half the buyers' browsers
 * refuse to play. Before this, the only admin-side fix was the category select
 * on the review page; anything else meant asking the seller to resubmit and
 * re-reviewing the whole listing.
 *
 * Saving here does NOT touch status — see adminUpdateListing. An approved tool
 * stays approved through an edit, because unpublishing a live product to fix
 * its spelling is not a trade any admin would choose.
 *
 * Two things are deliberately absent, and both are load-bearing rather than
 * unfinished (the store function spells out why): the seller identity, which
 * decides where the money goes, and the .zip package, which is the product
 * itself and is bound to the seller's own storage folder by the download route.
 */
export default function AdminEditListingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = useUser();
  const listing = useStoreValue(() => getListingById(params.id));
  const categories = useStoreValue(getCategories);

  if (!user || user.role !== "admin") {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Admins only</h1>
        <ButtonLink href="/" className="mt-6" variant="secondary">Home</ButtonLink>
      </Section>
    );
  }

  if (!listing) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Listing not found</h1>
        <ButtonLink href="/admin" className="mt-6" variant="secondary">
          Back to queue
        </ButtonLink>
      </Section>
    );
  }

  // Keyed by id so switching listings remounts with fresh state rather than
  // carrying the previous one's half-typed fields across.
  return (
    <EditForm
      key={listing.id}
      listing={listing}
      categories={categories}
      router={router}
      uploaderUid={user.uid}
    />
  );
}

function EditForm({
  listing,
  categories,
  router,
  uploaderUid,
}: {
  listing: NonNullable<ReturnType<typeof getListingById>>;
  categories: ReturnType<typeof getCategories>;
  router: ReturnType<typeof useRouter>;
  uploaderUid: string;
}) {
  const [title, setTitle] = useState(listing.title);
  const [tagline, setTagline] = useState(listing.tagline);
  const [description, setDescription] = useState(listing.description);
  const [category, setCategory] = useState(listing.category);
  const [runtime, setRuntime] = useState<Runtime>(listing.runtime);
  const [setupMode, setSetupMode] = useState<SetupMode>(listing.setupMode);
  const [price, setPrice] = useState((listing.priceCents / 100).toFixed(2));
  const [version, setVersion] = useState(listing.version);
  const [sellerBio, setSellerBio] = useState(listing.sellerBio ?? "");
  const [sellerEmail, setSellerEmail] = useState(listing.sellerEmail ?? "");
  const [sellerWebsite, setSellerWebsite] = useState(listing.sellerWebsite ?? "");

  const [existingShots, setExistingShots] = useState<string[]>(listing.screenshots);
  const [shotFiles, setShotFiles] = useState<File[]>([]);
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demoError, setDemoError] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function pickDemo(file: File | null) {
    setDemoError("");
    if (!file) {
      setDemoFile(null);
      return;
    }
    // Same validator the seller form runs — an admin replacing a broken .mov
    // shouldn't be able to upload another one.
    const problem = await validateDemo(file);
    if (problem) {
      setDemoFile(null);
      setDemoError(problem);
      return;
    }
    setDemoFile(file);
  }

  const priceNum = parseFloat(price || "0");
  const missing: string[] = [];
  if (!title.trim()) missing.push("app name");
  if (!tagline.trim()) missing.push("tagline");
  if (description.trim().length <= 20) missing.push("a longer description");
  if (!(priceNum >= 15 && priceNum <= 250)) missing.push("a price between $15 and $250");
  if (!sellerEmail.trim() || !sellerEmail.includes("@")) missing.push("a support email");
  if (sellerWebsite.trim() && !safeHttpsUrl(sellerWebsite)) {
    missing.push("a valid https:// website link");
  }
  const valid = missing.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setError("");
    setSaving(true);
    try {
      // Uploaded under the ADMIN's uid, not the seller's: storage.rules only
      // lets a signed-in user write inside their own folder, so passing
      // listing.sellerId here would fail with a 403. Safe to diverge because
      // these are public marketing assets read straight from their URL — unlike
      // the .zip, whose path the download route binds back to the seller.
      const [demoUrl, newShotUrls, posterUrl] = await Promise.all([
        demoFile
          ? uploadDemoVideo(uploaderUid, listing.id, demoFile)
          : Promise.resolve(listing.demoVideo),
        shotFiles.length
          ? uploadScreenshots(uploaderUid, listing.id, shotFiles)
          : Promise.resolve<string[]>([]),
        // Replacing the demo re-cuts its poster. Without this, swapping a video
        // left the old recording's frame on the card until someone hovered —
        // the poster was the first screenshot, a separate file nobody thought
        // to change.
        demoFile
          ? capturePoster(uploaderUid, listing.id, demoFile)
          : Promise.resolve(listing.posterImage),
      ]);

      await adminUpdateListing(listing.id, {
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        category,
        runtime,
        setupMode,
        priceCents: Math.round(priceNum * 100),
        version: version.trim() || listing.version,
        screenshots: [...existingShots, ...newShotUrls].slice(0, 5),
        demoVideo: demoUrl,
        posterImage: posterUrl,
        // Empty string, not undefined: the client is configured with
        // ignoreUndefinedProperties, so an undefined field is dropped from the
        // update rather than written — which on an edit form means clearing a
        // bio appears to save and then silently keeps the old one. "" reads as
        // absent everywhere these are consumed.
        sellerBio: sellerBio.trim(),
        sellerEmail: sellerEmail.trim(),
        sellerWebsite: safeHttpsUrl(sellerWebsite) ?? "",
      });

      setShotFiles([]);
      setDemoFile(null);
      setSavedAt(Date.now());
    } catch (err) {
      console.error("[admin edit] save failed:", err);
      setError(
        "Couldn't save the listing. Check your admin access and connection, then try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section className="max-w-2xl py-12">
      <ButtonLink href={`/admin/${listing.id}`} variant="ghost" size="sm">
        ← Review page
      </ButtonLink>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Edit listing</h1>
        <StatusBadge status={listing.status} />
      </div>
      <p className="mt-1 text-[var(--muted)]">
        Editing <span className="text-[var(--foreground)]">{listing.title}</span> by{" "}
        <span className="text-[var(--foreground)]">{listing.sellerName}</span>. Saving
        keeps the current status — a live tool stays live.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Field
          label="App name"
          hint="Short and clear."
          counter={{ value: title, max: TITLE_MAX }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            className={inputClass}
          />
        </Field>

        {/*
          The slug is left alone on purpose. It's the listing's public URL, and
          it's already in search results, link previews and buyers' bookmarks —
          renaming a tool shouldn't quietly 404 everyone who saved it.
        */}
        <Field
          label="One-line tagline"
          hint="One sentence."
          counter={{ value: tagline, max: TAGLINE_MAX }}
        >
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={TAGLINE_MAX}
            className={inputClass}
          />
        </Field>

        <Field label="Description" hint="What problem it solves, and how it runs locally.">
          <MarkdownEditor value={description} onChange={setDescription} rows={12} />
        </Field>

        <Field
          label="Browse category"
          hint="Which filter buyers find it under. Sellers pick this themselves and often pick wrong."
        >
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {/* A listing can hold a category an admin has since removed. Keep
                it listed, marked, so the select shows what the listing actually
                says instead of silently reading as the first option. */}
            {!categories.some((c) => c.id === category) && (
              <option value={category}>{category} (removed filter)</option>
            )}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Runtime">
            <select
              value={runtime}
              onChange={(e) => setRuntime(e.target.value as Runtime)}
              className={inputClass}
            >
              {Object.entries(RUNTIME_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Setup">
            <select
              value={setupMode}
              onChange={(e) => setSetupMode(e.target.value as SetupMode)}
              className={inputClass}
            >
              <option value="one-command">No setup needed (1 command)</option>
              <option value="ai-assisted">Guided setup (AI-assisted)</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Price (USD)" hint="Between $15 and $250.">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputMode="decimal"
              className={inputClass}
            />
          </Field>

          <Field label="Version">
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              maxLength={20}
              className={inputClass}
            />
          </Field>
        </div>

        <Field
          label="Screenshots (up to 5)"
          hint="The first one is also the poster frame on the demo video and the browse card, so lead with the clearest shot."
        >
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {existingShots.map((url, i) => (
              <div
                key={`existing-${i}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]"
              >
                {/^https?:\/\//.test(url) || url.startsWith("/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  // Seed and older listings store a text label here, not a URL.
                  <span className="grid h-full w-full place-items-center p-1 text-center text-[9px] leading-tight text-[var(--muted)]">
                    {url}
                  </span>
                )}
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
            {shotFiles.map((file, i) => (
              <div
                key={i}
                className="relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-center"
              >
                <span className="text-xl">🖼️</span>
                <span className="line-clamp-2 text-[9px] leading-tight text-[var(--muted)]">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setShotFiles((p) => p.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--danger)] text-xs text-white"
                  aria-label="Remove screenshot"
                >
                  ✕
                </button>
              </div>
            ))}
            {existingShots.length + shotFiles.length < 5 && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--border-strong)] text-2xl text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                +
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files) return;
                    const room = Math.max(0, 5 - existingShots.length - shotFiles.length);
                    setShotFiles((p) => [...p, ...Array.from(files)].slice(0, p.length + room));
                  }}
                />
              </label>
            )}
          </div>
        </Field>

        <Field
          label="Demo video"
          hint="Upload a new video to replace the current one, or leave it alone to keep it. MP4 (H.264) only — .mov is refused, because that container doesn't play for buyers on Android. Up to 40 seconds and 150MB."
        >
          <label
            className={`flex cursor-pointer items-center justify-between rounded-xl border border-dashed px-4 py-6 text-sm hover:border-[var(--accent)] ${
              demoFile
                ? "border-[var(--success)] bg-[var(--success-soft)]"
                : "border-[var(--border-strong)] bg-[var(--surface-muted)]"
            }`}
          >
            <span className={demoFile ? "text-[var(--foreground)]" : "text-[var(--muted)]"}>
              {demoFile
                ? `▶ ${demoFile.name}`
                : listing.demoVideo
                  ? "▶ Current demo video — click to replace"
                  : "No demo video — click to upload one"}
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
          {demoError && <p className="mt-1.5 text-xs text-[var(--danger)]">{demoError}</p>}
        </Field>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
          <h2 className="text-sm font-semibold">About the seller (shown to buyers)</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            The blurb and contact details on the listing page. Who the seller
            <em> is</em> — and where their payouts go — isn&apos;t editable here.
          </p>
          <div className="mt-4 space-y-6">
            <Field label="Short bio">
              <textarea
                value={sellerBio}
                onChange={(e) => setSellerBio(e.target.value)}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </Field>
            <Field label="Support email">
              <input
                value={sellerEmail}
                onChange={(e) => setSellerEmail(e.target.value)}
                type="email"
                className={inputClass}
              />
            </Field>
            <Field label="Website" hint="Optional. Must be https://.">
              <input
                value={sellerWebsite}
                onChange={(e) => setSellerWebsite(e.target.value)}
                placeholder="https://"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        {/* The package is the product. See adminUpdateListing for why swapping
            it from here would break every buyer's download. */}
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted)]">
          The .zip package can&apos;t be replaced from here — downloads are bound
          to the seller&apos;s own upload. To ship new code, have the seller edit
          and resubmit from their dashboard.
        </p>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
          <Button type="submit" size="lg" disabled={!valid || saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => router.push(`/admin/${listing.id}`)}
          >
            Done
          </Button>
          {!valid && (
            <span className="text-xs text-[var(--muted)]">Needs {missing.join(", ")}.</span>
          )}
          {valid && savedAt !== null && !saving && (
            <span className="text-xs text-[var(--success)]">Saved — the listing is updated.</span>
          )}
        </div>
      </form>
    </Section>
  );
}

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
