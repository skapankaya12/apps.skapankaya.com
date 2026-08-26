"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreValue, useUser } from "@/lib/hooks";
import { getCategories, getAuthResolved } from "@/lib/store";
import { importFromUrls, fetchImportedImage, ImportFailed } from "@/lib/importClient";
import { uploadFreeToolPreview } from "@/lib/storage";
import { createFreeTool } from "@/lib/freeTools";
import {
  DEFAULT_CATEGORIES,
  FREE_TOOL_TITLE_MAX,
  FREE_TOOL_DESCRIPTION_MAX,
} from "@/lib/types";
import { Section, Button, ButtonLink } from "@/components/ui";
import { Field, FormSection, inputClass } from "@/components/ui/form";

/**
 * Suggest a free tool for the /free directory.
 *
 * Deliberately not the listing form. That one asks for thirteen things because
 * it is describing something we are going to sell and deliver. This one asks
 * for four, because the entry is a link and a paragraph.
 *
 * The link is read first and the fields arrive filled in, using the same import
 * pipeline the listing form uses. The description is the exception: it arrives
 * as a starting point and the label says to rewrite it. Publishing a fetched
 * meta description verbatim is duplicate content pointing at a stronger
 * original, which is how a directory earns nothing.
 */
export default function SubmitFreeToolPage() {
  const user = useUser();
  const router = useRouter();
  const categories = useStoreValue(getCategories);
  const options = categories.length ? categories : DEFAULT_CATEGORIES;
  const authResolved = useStoreValue(getAuthResolved);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0].id);
  /* The source's image, still on the source's server. It is only pulled down
     and stored on submit, so a draft nobody finishes leaves nothing behind:
     no unreferenced upload sits in the bucket forever. */
  const [previewCandidate, setPreviewCandidate] = useState("");

  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // `!user` means "signed out" and "not heard back yet" alike, so waiting for
  // the answer is what stops a signed-in person being shown a sign-in prompt
  // for a moment on the way in. Same as /saved.
  if (!authResolved) {
    return (
      <Section className="py-24 text-center">
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </Section>
    );
  }

  if (!user) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Suggest a free tool</h1>
        <p className="mx-auto mt-2 max-w-md text-[var(--muted)]">
          Sign in first, so we can tell you when it goes up.
        </p>
        <ButtonLink href="/login?next=/free/submit" className="mt-6">
          Sign in
        </ButtonLink>
      </Section>
    );
  }

  if (done) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Thanks, that&apos;s in the queue</h1>
        <p className="mx-auto mt-2 max-w-md text-[var(--muted)]">
          We look at every suggestion by hand and check the link works before it
          goes up.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/free" variant="secondary">
            Back to free tools
          </ButtonLink>
          <Button
            variant="secondary"
            onClick={() => {
              setUrl("");
              setTitle("");
              setDescription("");
              setPreviewCandidate("");
              setDone(false);
            }}
          >
            Suggest another
          </Button>
        </div>
      </Section>
    );
  }

  async function readLink() {
    const trimmed = url.trim();
    if (!/^https:\/\/\S+$/.test(trimmed)) {
      setError("Paste a full https link.");
      return;
    }
    setFetching(true);
    setError("");
    try {
      const result = await importFromUrls([trimmed]);
      if (result.fields.title && !title) {
        setTitle(result.fields.title.value.slice(0, FREE_TOOL_TITLE_MAX));
      }
      // Tagline first: it is already one sentence, which is the shape a card
      // wants. The full description is a page and would be cut mid-thought.
      const blurb =
        result.fields.tagline?.value ?? result.fields.description?.value;
      if (blurb && !description) {
        setDescription(blurb.slice(0, FREE_TOOL_DESCRIPTION_MAX));
      }
      if (result.fields.category) setCategory(result.fields.category.value);
      if (result.images[0]) setPreviewCandidate(result.images[0].url);
      if (!result.fields.title && !blurb) {
        setError("We could not read much from that link. Fill it in by hand.");
      }
    } catch (err) {
      setError(
        err instanceof ImportFailed
          ? err.message
          : "Could not read that link."
      );
    } finally {
      setFetching(false);
    }
  }

  const valid =
    /^https:\/\/\S+$/.test(url.trim()) &&
    title.trim().length > 0 &&
    description.trim().length > 0;

  async function submit() {
    if (!valid || !user) return;
    setSaving(true);
    setError("");
    try {
      let previewImage = "";
      if (previewCandidate) {
        /* Best effort. A missing preview makes one card plainer; a failed
           submission because an image 404ed loses the whole suggestion. */
        try {
          const file = await fetchImportedImage(previewCandidate, 0);
          previewImage = await uploadFreeToolPreview(user.uid, file);
        } catch {
          previewImage = "";
        }
      }
      await createFreeTool(
        {
          url: url.trim(),
          title: title.trim(),
          description: description.trim(),
          previewImage,
          category,
        },
        { uid: user.uid, displayName: user.displayName || "Someone" }
      );
      setDone(true);
      router.refresh();
    } catch {
      setError("Could not send that. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section className="py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/free" className="text-sm text-[var(--muted)] hover:underline">
          &#8592; Free tools
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Suggest a free tool
        </h1>
        <p className="mt-3 text-[var(--muted)]">
          Something free and genuinely useful, made by an independent builder.
          Paste the link and we will read what we can from it.
        </p>

        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <FormSection title="The link">
            <Field label="Where it lives" hint="https only.">
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  value={url}
                  placeholder="https://"
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={readLink}
                  disabled={fetching || !url.trim()}
                >
                  {fetching ? "Reading..." : "Read link"}
                </Button>
              </div>
            </Field>
          </FormSection>

          <div className="mt-6">
            <FormSection title="What it is">
              <Field
                label="Name"
                counter={{ value: title, max: FREE_TOOL_TITLE_MAX }}
              >
                <input
                  className={inputClass}
                  maxLength={FREE_TOOL_TITLE_MAX}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>

              <Field
                label="Description"
                hint="In your own words. What it does and who it is for."
                counter={{
                  value: description,
                  max: FREE_TOOL_DESCRIPTION_MAX,
                }}
              >
                <textarea
                  className={inputClass}
                  rows={3}
                  maxLength={FREE_TOOL_DESCRIPTION_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              <Field label="Category">
                <select
                  className={inputClass}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {options.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
            </FormSection>
          </div>

          {previewCandidate && (
            <div className="mt-6">
              <p className="text-sm font-medium">Preview image</p>
              <p className="mb-2 mt-0.5 text-xs text-[var(--muted)]">
                Taken from the page. Saved with the entry if we publish it.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewCandidate}
                alt=""
                className="aspect-[16/9] w-full max-w-sm rounded-xl border border-[var(--border)] object-cover"
              />
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => setPreviewCandidate("")}
              >
                Remove
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
              {error}
            </p>
          )}

          <Button className="mt-6" onClick={submit} disabled={!valid || saving}>
            {saving ? "Sending..." : "Send for review"}
          </Button>
          <p className="mt-3 text-xs text-[var(--muted)]">
            We check that the link is real, works and belongs here. We do not
            host or review the software itself.
          </p>
        </div>
      </div>
    </Section>
  );
}
