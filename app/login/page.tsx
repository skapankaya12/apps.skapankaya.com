"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signIn,
  signUp,
  requestPasswordReset,
  signInWithGoogle,
} from "@/lib/store";
import { brand } from "@/lib/brand";
import { validateAvatar, AVATAR_ACCEPT } from "@/lib/media";
import { SellerAvatar } from "@/components/SellerAvatar";
import { Section, Button } from "@/components/ui";

type Mode = "signin" | "signup" | "reset";

/**
 * Only ever redirect to a path on this site.
 *
 * `?next=` is attacker-controllable, and a login link on our own domain that
 * lands somewhere else after sign-in is a ready-made phishing flow ("your
 * session expired, sign in again" on a lookalike page). Anything that isn't a
 * single-slash relative path — absolute URLs, protocol-relative `//evil.com`,
 * backslash tricks — falls back to /browse.
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/browse";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/browse";
  return raw;
}

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = safeNext(sp.get("next"));

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // The photo is held here and only uploaded once the account exists, because
  // storage.rules scopes an avatar path to its owner's uid and there is no uid
  // to scope it to until then. See signUp in lib/store.ts.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  function pickAvatar(file: File | null) {
    setAvatarError("");
    const problem = file ? validateAvatar(file) : null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    if (problem || !file) {
      previewRef.current = null;
      setAvatarPreview(null);
      setAvatarFile(null);
      setAvatarError(problem ?? "");
      return;
    }
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setAvatarPreview(url);
    setAvatarFile(file);
  }

  // Release the object URL if they navigate away mid-signup.
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setResetSent(false);
  }

  async function handleGoogle() {
    setError("");
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      router.push(next);
    } catch (err: unknown) {
      // Closing the Google window is a decision, not a failure — say nothing.
      const code = (err as { code?: string })?.code ?? "";
      if (
        code !== "auth/popup-closed-by-user" &&
        code !== "auth/cancelled-popup-request"
      ) {
        setError(friendlyAuthError(err));
      }
      setGoogleBusy(false);
    }
  }

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "reset") {
      if (!email.includes("@")) {
        setError("Enter the email you signed up with.");
        return;
      }
      setBusy(true);
      try {
        await requestPasswordReset(email.trim());
        setResetSent(true);
      } catch (err: unknown) {
        setError(friendlyAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    if (mode === "signup" && name.trim().length < 2) {
      setError("Tell us your name (at least 2 characters).");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup")
        await signUp(email.trim(), password, name, avatarFile ?? undefined);
      else await signIn(email.trim(), password);
      router.push(next);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }

  // Password-reset confirmation.
  if (mode === "reset" && resetSent) {
    return (
      <Section className="max-w-md py-20">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-sm)]">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-soft)] text-2xl">
            ✉️
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            If an account exists for{" "}
            <span className="text-[var(--foreground)]">{email.trim()}</span>, we&apos;ve
            sent a link to reset your password. It may take a minute, and could land
            in spam.
          </p>
          <Button variant="secondary" className="mt-6" onClick={() => switchMode("signin")}>
            Back to sign in
          </Button>
        </div>
      </Section>
    );
  }

  const title =
    mode === "signin"
      ? `Sign in to ${brand.name}`
      : mode === "signup"
        ? `Create your ${brand.name} account`
        : "Reset your password";

  const subtitle =
    mode === "signin"
      ? "Welcome back. Sign in with Google, or your email and password."
      : mode === "signup"
        ? "One account to buy tools, and to sell your own. We'll email you a link to verify it."
        : "Enter your email and we'll send you a reset link.";

  return (
    <Section className="max-w-md py-20">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>

        {mode !== "reset" && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="mt-6 w-full"
              onClick={handleGoogle}
              disabled={busy || googleBusy}
            >
              <GoogleMark />
              {googleBusy ? "Opening Google…" : "Continue with Google"}
            </Button>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">or</span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>
          </>
        )}

        <form onSubmit={handle} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium" htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How buyers will see you"
                autoComplete="name"
                className={inputClass}
                autoFocus
              />

              {/* Beside the name rather than in its own section: the two answer
                  the same question, and the preview shows the initial they get
                  by default, so skipping this reads as a choice rather than as
                  something left undone. */}
              <div className="mt-3 flex items-center gap-3">
                <SellerAvatar
                  seller={{
                    displayName: name,
                    avatarUrl: avatarPreview ?? undefined,
                  }}
                  size={44}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-block cursor-pointer rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-xs font-medium hover:border-[var(--accent)]">
                      {avatarFile ? "Change photo" : "Add a photo"}
                      <input
                        type="file"
                        accept={AVATAR_ACCEPT}
                        className="hidden"
                        onChange={(e) =>
                          pickAvatar(e.target.files?.[0] ?? null)
                        }
                      />
                    </label>
                    {avatarFile && (
                      <button
                        type="button"
                        onClick={() => pickAvatar(null)}
                        className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Optional. You can add one later.
                  </p>
                </div>
              </div>
              {avatarError && (
                <p className="mt-2 text-xs text-[var(--danger)]">{avatarError}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputClass}
              autoFocus={mode !== "signup"}
            />
          </div>

          {mode !== "reset" && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="password">Password</label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => switchMode("reset")}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className={inputClass}
              />
            </div>
          )}

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={busy || googleBusy}
          >
            {busy
              ? "…"
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          {mode === "reset" ? (
            <>
              Remembered it?{" "}
              <button
                type="button"
                className="font-medium text-[var(--accent)] hover:underline"
                onClick={() => switchMode("signin")}
              >
                Back to sign in
              </button>
            </>
          ) : (
            <>
              {mode === "signin" ? "New here? " : "Already have an account? "}
              <button
                type="button"
                className="font-medium text-[var(--accent)] hover:underline"
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </>
          )}
        </p>
      </div>
    </Section>
  );
}

/** Google's four-colour "G", per their sign-in branding guidelines. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="h-[18px] w-[18px]">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]";

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "That email or password doesn't match. Try again.";
    case "auth/email-already-in-use":
      return "An account with that email already exists. Try signing in.";
    case "auth/weak-password":
      return "Please choose a password of at least 6 characters.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow popups and try again.";
    case "auth/account-exists-with-different-credential":
      return "You already have an account with that email. Sign in with your password instead.";
    case "auth/unauthorized-domain":
      return "Google sign-in isn't enabled for this address yet.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
