"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/store";
import { brand } from "@/lib/brand";
import { Section, Button } from "@/components/ui";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/browse";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.includes("@") || password.length < 6) {
      setError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") await signUp(email.trim(), password);
      else await signIn(email.trim(), password);
      router.push(next);
    } catch (err: unknown) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }

  return (
    <Section className="max-w-md py-20">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin"
            ? `Sign in to ${brand.name}`
            : `Create your ${brand.name} account`}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {mode === "signin"
            ? "Welcome back. Sign in with your email and password."
            : "One account to buy tools, and to sell your own."}
        </p>

        <form onSubmit={handle} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            className="font-medium text-[var(--accent)] hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </Section>
  );
}

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
