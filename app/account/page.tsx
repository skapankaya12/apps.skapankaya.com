"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useStoreValue } from "@/lib/hooks";
import Link from "next/link";
import {
  updateDisplayName,
  changePassword,
  changeEmail,
  deleteAccount,
  hasPasswordSignIn,
  claimHandle,
  isHandleAvailable,
  saveSellerProfile,
} from "@/lib/store";
import { uploadAvatar } from "@/lib/storage";
import { validateAvatar, AVATAR_ACCEPT } from "@/lib/media";
import { handleProblem, suggestHandle } from "@/lib/handles";
import { safeHttpsUrl } from "@/lib/utils";
import { BIO_MAX, type AppUser } from "@/lib/types";
import { SellerAvatar } from "@/components/SellerAvatar";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

export default function AccountPage() {
  const user = useUser();
  // Google-only accounts have no password here, and their email lives with
  // Google — so those two panels would only offer them dead ends.
  const hasPassword = useStoreValue(hasPasswordSignIn);

  if (!user) {
    return (
      <Section className="py-24 text-center">
        <h1 className="text-2xl font-semibold">Account settings</h1>
        <p className="mt-2 text-[var(--muted)]">Sign in to manage your account.</p>
        <ButtonLink href="/login?next=/account" className="mt-6">Sign in</ButtonLink>
      </Section>
    );
  }

  return (
    <Section className="max-w-2xl py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Account settings</h1>
      <p className="mt-1 text-[var(--muted)]">
        Manage your profile, sign-in details, and account.
      </p>

      <div className="mt-8 space-y-6">
        <NameSection currentName={user.displayName} />
        {/* Sellers only: a buyer has no public page for any of this to appear
            on, so showing it would be asking for details nobody ever reads. */}
        {(user.role === "seller" || user.role === "admin") && (
          <>
            <HandleSection user={user} />
            <PublicProfileSection user={user} />
          </>
        )}
        {hasPassword ? (
          <>
            <PasswordSection />
            <EmailSection currentEmail={user.email} />
          </>
        ) : (
          <GoogleSection currentEmail={user.email} />
        )}
        <DangerSection hasPassword={hasPassword} />
      </div>
    </Section>
  );
}

function Panel({
  title,
  description,
  children,
  danger = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        danger
          ? "border-[var(--danger)]/40 bg-[var(--danger-soft,transparent)]"
          : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <h2 className={`font-semibold ${danger ? "text-[var(--danger)]" : ""}`}>{title}</h2>
      {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Feedback({ ok, msg }: { ok: boolean; msg: string }) {
  if (!msg) return null;
  return (
    <p className={`mt-3 text-sm ${ok ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
      {msg}
    </p>
  );
}

function NameSection({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await updateDisplayName(name);
      setOk(true);
      setMsg("Name updated.");
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : "Couldn't update your name.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Display name" description="The name shown on your profile and listings.">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className={`${inputClass} max-w-xs`}
        />
        <Button onClick={save} disabled={busy || name.trim() === currentName}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </div>
      <Feedback ok={ok} msg={msg} />
    </Panel>
  );
}

/**
 * The seller's handle: the {handle} in /seller/{handle}.
 *
 * Availability is checked as they type rather than on submit, because a taken
 * handle is the common case for anything short and finding out after pressing
 * Save is the annoying way to learn it. The check is advisory: claimHandle runs
 * the same test inside a transaction, which is what actually decides.
 */
function HandleSection({ user }: { user: AppUser }) {
  const [handle, setHandle] = useState(
    user.handle ?? suggestHandle(user.displayName)
  );
  // What the last completed check answered, and for which handle. Availability
  // is derived by comparing that against the field, so a stale answer for a
  // handle they have since edited simply stops matching and shows nothing. An
  // effect that reset the state on every keystroke would do the same job by
  // triggering an extra render pass.
  const [checked, setChecked] = useState<{ handle: string; free: boolean } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const trimmed = handle.trim().toLowerCase();
  const problem = handleProblem(trimmed);
  const unchanged = trimmed === (user.handle ?? "");

  const available =
    checked && checked.handle === trimmed ? checked.free : null;

  // Debounced so a check does not fire on every keystroke. A network answer
  // that arrives after the field has moved on is stored anyway: it is keyed by
  // the handle it describes, so it just stops being the one displayed.
  useEffect(() => {
    if (problem || unchanged) return;
    let alive = true;
    const timer = setTimeout(async () => {
      const free = await isHandleAvailable(trimmed).catch(() => null);
      if (alive && free !== null) setChecked({ handle: trimmed, free });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [trimmed, problem, unchanged]);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await claimHandle(trimmed);
      setOk(true);
      setMsg("Handle saved.");
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : "Couldn't save that handle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Your handle"
      description="The address of your public seller page."
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl border border-[var(--border-strong)] bg-[var(--background)] pl-4 focus-within:border-[var(--accent)]">
          <span className="text-sm text-[var(--muted)]">/seller/</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            maxLength={30}
            spellCheck={false}
            autoCapitalize="none"
            aria-label="Handle"
            className="w-44 bg-transparent px-1 py-2.5 text-sm outline-none"
          />
        </div>
        <Button
          onClick={save}
          disabled={busy || unchanged || Boolean(problem) || available === false}
        >
          {busy ? "Saving…" : user.handle ? "Change" : "Claim"}
        </Button>
        {user.handle && (
          <Link
            href={`/seller/${user.handle}`}
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            View page
          </Link>
        )}
      </div>

      {!unchanged && problem && (
        <p className="mt-3 text-sm text-[var(--muted)]">{problem}</p>
      )}
      {!unchanged && !problem && available === true && (
        <p className="mt-3 text-sm text-[var(--success)]">
          {trimmed} is available.
        </p>
      )}
      {!unchanged && !problem && available === false && (
        <p className="mt-3 text-sm text-[var(--danger)]">
          {trimmed} is taken.
        </p>
      )}
      {user.handle && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Your old handle keeps pointing here, so links people saved still work.
          You can change it again after 30 days.
        </p>
      )}
      <Feedback ok={ok} msg={msg} />
    </Panel>
  );
}

/**
 * Everything a buyer sees about the seller, in one place.
 *
 * These fields used to be asked for inside the listing form, once per tool. A
 * seller with three listings typed their bio three times and could not correct
 * it without sending all three back through review.
 */
function PublicProfileSection({ user }: { user: AppUser }) {
  const [bio, setBio] = useState(user.bio ?? "");
  const [supportEmail, setSupportEmail] = useState(user.supportEmail ?? "");
  const [website, setWebsite] = useState(user.website ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  // Show the newly chosen image straight away rather than after the save, so
  // picking the wrong file is obvious before it is uploaded anywhere. Built in
  // the picker rather than an effect: choosing a file is an event, and an
  // object URL created during render has to be torn down again on every change.
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  function setPreviewFor(file: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = file ? URL.createObjectURL(file) : null;
    previewRef.current = url;
    setPreview(url);
  }

  // Release the last object URL if they navigate away mid-edit.
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function pickAvatar(file: File | null) {
    setAvatarError("");
    const problem = file ? validateAvatar(file) : null;
    if (problem) {
      setAvatarFile(null);
      setPreviewFor(null);
      setAvatarError(problem);
      return;
    }
    setAvatarFile(file);
    setPreviewFor(file);
  }

  const emailBad = Boolean(supportEmail.trim()) && !supportEmail.includes("@");
  const websiteBad = Boolean(website.trim()) && !safeHttpsUrl(website);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      // Upload first: a failed upload must not leave the profile half-saved
      // with a bio that changed and a face that did not.
      const avatarUrl = avatarFile
        ? await uploadAvatar(user.uid, avatarFile)
        : undefined;
      await saveSellerProfile({
        bio,
        supportEmail,
        website: safeHttpsUrl(website) ?? "",
        avatarUrl,
      });
      setAvatarFile(null);
      setOk(true);
      setMsg("Profile saved.");
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : "Couldn't save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Public profile"
      description="Shown on your seller page and on every tool you list."
    >
      <div className="flex items-center gap-4">
        <SellerAvatar
          seller={{
            displayName: user.displayName,
            avatarUrl: preview ?? user.avatarUrl,
          }}
          size={56}
        />
        <div>
          <label className="inline-block cursor-pointer rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:border-[var(--accent)]">
            {user.avatarUrl || avatarFile ? "Change photo" : "Add a photo"}
            <input
              type="file"
              accept={AVATAR_ACCEPT}
              className="hidden"
              onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="mt-1.5 text-xs text-[var(--muted)]">
            Optional. PNG, JPEG or WebP, up to 2MB.
          </p>
        </div>
      </div>
      {avatarError && (
        <p className="mt-2 text-sm text-[var(--danger)]">{avatarError}</p>
      )}

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Short bio</span>
          <span className="ml-2 text-xs text-[var(--muted)]">
            A sentence about who you are.
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            rows={3}
            className={`${inputClass} mt-1.5 resize-y`}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Support email</span>
          <span className="ml-2 text-xs text-[var(--muted)]">
            Where buyers reach you for help.
          </span>
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
          {emailBad && (
            <span className="mt-1 block text-xs text-[var(--danger)]">
              That does not look like an email address.
            </span>
          )}
        </label>

        <label className="block">
          <span className="text-sm font-medium">Website</span>
          <span className="ml-2 text-xs text-[var(--muted)]">
            Optional. Must start with https://
          </span>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            className={`${inputClass} mt-1.5`}
          />
          {websiteBad && (
            <span className="mt-1 block text-xs text-[var(--danger)]">
              Needs to be a full https:// link.
            </span>
          )}
        </label>
      </div>

      <Button
        onClick={save}
        disabled={busy || emailBad || websiteBad}
        className="mt-5"
      >
        {busy ? "Saving…" : "Save profile"}
      </Button>
      <Feedback ok={ok} msg={msg} />
    </Panel>
  );
}

function GoogleSection({ currentEmail }: { currentEmail: string }) {
  return (
    <Panel
      title="Sign-in"
      description={`You sign in with Google as ${currentEmail}.`}
    >
      <p className="text-sm text-[var(--muted)]">
        Your password and email address are managed in your Google Account, so
        there&apos;s nothing to change here.
      </p>
    </Panel>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await changePassword(current, next);
      setOk(true);
      setMsg("Password updated.");
      setCurrent("");
      setNext("");
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : "Couldn't change your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Password" description="Choose a new password. You'll confirm your current one.">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          className={inputClass}
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password (6+ characters)"
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <Button
        className="mt-3"
        onClick={save}
        disabled={busy || !current || next.length < 6}
      >
        {busy ? "Updating…" : "Update password"}
      </Button>
      <Feedback ok={ok} msg={msg} />
    </Panel>
  );
}

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await changeEmail(password, email);
      setOk(true);
      setMsg(`Check ${email.trim()} for a link to confirm the change.`);
      setEmail("");
      setPassword("");
    } catch (e) {
      setOk(false);
      setMsg(e instanceof Error ? e.message : "Couldn't change your email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Email address"
      description={`Currently ${currentEmail}. We'll email a confirmation link to the new address.`}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="New email"
          autoComplete="email"
          className={inputClass}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          className={inputClass}
        />
      </div>
      <Button
        className="mt-3"
        onClick={save}
        disabled={busy || !email.includes("@") || !password}
      >
        {busy ? "Sending…" : "Change email"}
      </Button>
      <Feedback ok={ok} msg={msg} />
    </Panel>
  );
}

function DangerSection({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function remove() {
    setBusy(true);
    setMsg("");
    try {
      // Google accounts confirm it's them in the Google window instead.
      await deleteAccount(hasPassword ? password : undefined);
      router.push("/");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't delete your account.");
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Delete account"
      description={
        hasPassword
          ? "Permanently deletes your account and sign-in. This can't be undone."
          : "Permanently deletes your account and sign-in. You'll confirm with Google first. This can't be undone."
      }
      danger
    >
      {hasPassword && (
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          className={`${inputClass} max-w-xs`}
        />
      )}
      <label className="mt-3 flex items-start gap-2.5 text-sm text-[var(--muted)]">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--danger)]"
        />
        <span>I understand this permanently deletes my account and can&apos;t be undone.</span>
      </label>
      <div className="mt-3 flex items-center gap-3">
        <Button
          variant="danger"
          onClick={remove}
          disabled={busy || (hasPassword && !password) || !confirm}
        >
          {busy ? "Deleting…" : "Delete my account"}
        </Button>
        {msg && <Badge tone="danger">{msg}</Badge>}
      </div>
    </Panel>
  );
}
