"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks";
import {
  updateDisplayName,
  changePassword,
  changeEmail,
  deleteAccount,
} from "@/lib/store";
import { Section, Button, ButtonLink, Badge } from "@/components/ui";

const inputClass =
  "w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

export default function AccountPage() {
  const user = useUser();

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
        <PasswordSection />
        <EmailSection currentEmail={user.email} />
        <DangerSection />
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

function DangerSection() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function remove() {
    setBusy(true);
    setMsg("");
    try {
      await deleteAccount(password);
      router.push("/");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't delete your account.");
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Delete account"
      description="Permanently deletes your account and sign-in. This can't be undone."
      danger
    >
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Current password"
        autoComplete="current-password"
        className={`${inputClass} max-w-xs`}
      />
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
        <Button variant="danger" onClick={remove} disabled={busy || !password || !confirm}>
          {busy ? "Deleting…" : "Delete my account"}
        </Button>
        {msg && <Badge tone="danger">{msg}</Badge>}
      </div>
    </Panel>
  );
}
