"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signIn,
  signUp,
  becomeSeller,
  requestPasswordReset,
  signInWithGoogle,
} from "@/lib/store";
import { brand } from "@/lib/brand";
import { validateAvatar, AVATAR_ACCEPT } from "@/lib/media";
import { SellerAvatar } from "@/components/SellerAvatar";
import { Section, Button } from "@/components/ui";

type Mode = "signin" | "signup" | "reset";
type AccountKind = "buy" | "sell";

const ACCOUNT_KINDS: { id: AccountKind; label: string; hint: string }[] = [
  { id: "buy", label: "Buy tools", hint: "Own them, no subscription" },
  { id: "sell", label: "Sell my tools", hint: "List what you built" },
];

const KEEP_PCT = Math.round((1 - brand.commissionRate) * 100);

/**
 * What each side of the marketplace gets, beside the choice that picks it.
 *
 * Deliberately not new marketing copy. The buyer lines are the three clauses of
 * the pitch in lib/brand.ts, taken apart; the seller lines are the three
 * economics cards on /sell, shortened. A claim that appears in only one of
 * those places would be a claim nobody is maintaining.
 */
const SIDE_FACTS: Record<AccountKind, { label: string; body: string }[]> = {
  buy: [
    { label: "Pay once", body: "No subscription, and nothing to renew." },
    { label: "Run it yourself", body: "Tools run on your own machine, not on ours." },
    { label: "Keep it for good", body: "Your library holds everything you buy." },
  ],
  sell: [
    { label: `Keep ${KEEP_PCT}% of every sale`, body: "All-inclusive fee. No listing fees, no monthly cost." },
    { label: "List in about 10 minutes", body: "Upload your package, describe it, set a price." },
    { label: "Automatic payouts", body: "Connect Stripe once. Your share lands after each sale." },
  ],
};

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

  // What brought them here. `?intent=sell` is set by the Start selling button
  // (components/StartSellingButton.tsx), which is the only way to become a
  // seller: without it, somebody who pressed that button while signed out
  // would sign up, land back on /sell, and have to press it a second time.
  // Anyone who closed the tab first stayed a buyer for good.
  const sellIntent = sp.get("intent") === "sell";

  const [mode, setMode] = useState<Mode>(sellIntent ? "signup" : "signin");
  const [kind, setKind] = useState<AccountKind>(sellIntent ? "sell" : "buy");
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

  /**
   * Whether this account should end up as a seller.
   *
   * Signing up, it is whatever they picked. Signing in, the picker is not on
   * screen, so the only signal is the button that sent them here, and an
   * existing seller or admin is left alone by becomeSeller either way.
   */
  function wantsSeller(): boolean {
    return mode === "signup" ? kind === "sell" : sellIntent;
  }

  /**
   * Where to go once they are in. `next` is the listing form when the Start
   * selling button sent them, so somebody who arrived that way and then picked
   * Buy tools has to be sent somewhere else: the form would only tell them they
   * need a seller account.
   */
  function destination(): string {
    if (sellIntent && !wantsSeller()) return "/browse";
    return next;
  }

  async function handleGoogle() {
    setError("");
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      if (wantsSeller()) await becomeSeller();
      router.push(destination());
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
      // After the account exists, never before: the role lives on a document
      // that sign-up has only just written.
      if (wantsSeller()) await becomeSeller();
      router.push(destination());
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

  // Two columns, because the account has two sides and the page now asks which
  // one somebody is. Only sign-up earns the width: the picker and what it means
  // move out of the form and into the space beside it, which leaves the card
  // the length it was before any of this was added. Signing in is three fields
  // and has nothing to say, so it stays the narrow card it always was.
  const wide = mode === "signup";

  return (
    <Section className={wide ? "max-w-5xl py-14 sm:py-20" : "max-w-md py-20"}>
      <div
        className={
          wide
            ? "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-x-16 lg:gap-y-8"
            : ""
        }
      >
        <div className="lg:col-start-1 lg:row-start-1">
          <h1
            className={`font-semibold tracking-tight ${
              wide ? "text-3xl sm:text-4xl" : "text-2xl"
            }`}
          >
            {title}
          </h1>
          <p className="mt-3 max-w-md text-sm text-[var(--muted)]">{subtitle}</p>

          {/* Out here rather than in the form, and ahead of the Google button,
              because it governs both ways in. Google cannot ask this itself: it
              does not distinguish signing up from signing in, so whatever is
              chosen here is the only thing we know about somebody arriving that
              way. */}
          {mode === "signup" && (
            <fieldset className="mt-8">
              <legend className="text-sm font-medium">What brings you here?</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
                {ACCOUNT_KINDS.map((option) => {
                  const selected = kind === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setKind(option.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                          : "border-[var(--border)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      <span className="block text-sm font-medium">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-[var(--muted)]">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                Buyers can start selling later, from the Sell page.
              </p>
            </fieldset>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)] sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          {mode !== "reset" && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full"
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
                          onChange={(e) => pickAvatar(e.target.files?.[0] ?? null)}
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

        {/* Beside the picker on a wide screen, under the card on a narrow one.
            The form is what somebody came here for, so on a phone it must not
            sit below three facts about a choice they have already made. */}
        {mode === "signup" && (
          <div className="border-t border-[var(--border)] pt-8 sm:max-w-md lg:col-start-1 lg:row-start-2">
            {/* What the choice actually means, in the words the rest of the site
                already uses: the buyer lines are the three clauses of the pitch
                in lib/brand.ts, the seller lines are the three economics cards
                on /sell. Nothing is claimed here that is not claimed there, so
                this cannot drift away from either. */}
            <ul className="space-y-4 sm:max-w-md">
              {SIDE_FACTS[kind].map((fact) => (
                <li key={fact.label} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                  />
                  <span>
                    <span className="block text-sm font-medium">{fact.label}</span>
                    <span className="block text-sm text-[var(--muted)]">{fact.body}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Pre-launch. Somebody signing up to buy is the one person on this
                page who needs telling, and the seller beside them is being
                recruited precisely because of it. Remove at launch: see
                LAUNCH_CHECKLIST.md. */}
            {kind === "buy" && (
              <p className="mt-6 text-xs text-[var(--muted)] sm:max-w-md">
                Buying opens at the public launch. Your account and your saved
                tools are waiting for you when it does.
              </p>
            )}
          </div>
        )}
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
