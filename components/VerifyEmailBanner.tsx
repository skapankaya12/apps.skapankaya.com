"use client";

import { useState } from "react";
import { useStoreValue, useUser } from "@/lib/hooks";
import { isEmailVerified, resendVerification, refreshEmailVerified } from "@/lib/store";

/**
 * Global nudge shown when someone is signed in but hasn't verified their email.
 * Verification is link-based (Firebase sends the email); this banner lets them
 * re-send it and re-check once they've clicked the link, without a page reload.
 */
export function VerifyEmailBanner() {
  const user = useUser();
  const verified = useStoreValue(isEmailVerified);
  const [status, setStatus] = useState<"idle" | "resending" | "sent" | "checking" | "error">("idle");

  if (!user || verified) return null;

  async function resend() {
    setStatus("resending");
    try {
      await resendVerification();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  async function recheck() {
    setStatus("checking");
    try {
      const ok = await refreshEmailVerified();
      if (!ok) setStatus("idle");
      // If verified, the banner unmounts on the next store emit.
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="border-b border-[var(--warning)]/30 bg-[var(--warning-soft)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--foreground)]">
          <span aria-hidden className="mr-1.5">✉️</span>
          Please verify your email
          {user.email ? (
            <>
              {" "}— we sent a link to{" "}
              <span className="font-medium">{user.email}</span>.
            </>
          ) : (
            "."
          )}
          {status === "sent" && (
            <span className="ml-2 text-[var(--muted)]">Sent — check your inbox and spam.</span>
          )}
          {status === "error" && (
            <span className="ml-2 text-[var(--danger)]">Couldn&apos;t do that. Try again shortly.</span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={recheck}
            disabled={status === "checking"}
            className="font-medium text-[var(--accent)] hover:underline disabled:opacity-60"
          >
            {status === "checking" ? "Checking…" : "I've verified"}
          </button>
          <button
            onClick={resend}
            disabled={status === "resending"}
            className="font-medium text-[var(--foreground)] hover:underline disabled:opacity-60"
          >
            {status === "resending" ? "Sending…" : "Resend email"}
          </button>
        </div>
      </div>
    </div>
  );
}
