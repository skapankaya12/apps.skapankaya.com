"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, requestPasswordReset } from "@/lib/store";
import { brand } from "@/lib/brand";
import { Section, Button } from "@/components/ui";

type Mode = "signin" | "signup" | "reset";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/browse";

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setResetSent(false);
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
      if (mode === "signup") await signUp(email.trim(), password, name);
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
      ? "Welcome back. Sign in with your email and password."
      : mode === "signup"
        ? "One account to buy tools, and to sell your own. We'll email you a link to verify it."
        : "Enter your email and we'll send you a reset link.";

  return (
    <Section className="max-w-md py-20">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>

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

          <Button type="submit" className="w-full" size="lg" disabled={busy}>
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
