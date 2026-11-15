"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Thursday email, as AI Standings does it: a single-row bar that slides
 * up from the bottom of the screen once you have scrolled about two screens
 * down, and slides away again if you scroll back above that. It remembers
 * "closed" and "subscribed" in this browser so it never asks twice, has a
 * hidden field only bots fill in, and signs people up with a confirmation
 * email first (double opt-in).
 *
 * While it is up, the page gets bottom padding the height of the bar, so it
 * never covers the footer's last line.
 *
 * localStorage can throw (private mode, blocked storage); then the bar just
 * shows again next visit.
 */
const KEY = "tsm_nl";
/** How far down, in screen heights, before the bar slides up. */
const AFTER_SCREENS = 2;

type State = { kind: "idle" | "busy" | "ok" | "err"; msg?: string };

function remembered(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function remember(v: "closed" | "subscribed") {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
}

export function NewsletterBar() {
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });
  const bar = useRef<HTMLElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const company = useRef<HTMLInputElement>(null);

  // Up past two screens, down above them. Never yanked away while someone is
  // typing in it, and never again once closed or signed up.
  useEffect(() => {
    if (remembered()) {
      const t = setTimeout(() => setDone(true), 0);
      return () => clearTimeout(t);
    }
    const onScroll = () => {
      const typing = document.activeElement === email.current;
      const past = window.scrollY > window.innerHeight * AFTER_SCREENS;
      setShown((now) => (typing && now ? true : past));
    };
    const first = setTimeout(onScroll, 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(first);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Room under the footer for the bar while it is up.
  useEffect(() => {
    const h = shown && !done ? (bar.current?.offsetHeight ?? 0) + 32 : 0;
    document.body.style.paddingBottom = h ? `${h}px` : "";
    return () => {
      document.body.style.paddingBottom = "";
    };
  }, [shown, done]);

  if (done && !shown) return null;

  function finish(v: "closed" | "subscribed", delay = 0) {
    remember(v);
    setTimeout(() => {
      setShown(false);
      setTimeout(() => setDone(true), 450);
    }, delay);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const el = email.current;
    if (!el || !el.value.trim() || !el.checkValidity()) {
      setState({ kind: "err", msg: "That email doesn't look right." });
      return;
    }
    setState({ kind: "busy" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: el.value, company: company.current?.value ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; devConfirmUrl?: string };
      if (res.status === 400) return setState({ kind: "err", msg: "That email doesn't look right." });
      if (res.status === 429) return setState({ kind: "err", msg: "Too many tries. Give it an hour." });
      if (!res.ok) return setState({ kind: "err", msg: "Couldn't sign you up. Try again in a minute." });
      if (data.devConfirmUrl) console.info("[dev] confirmation link:", data.devConfirmUrl);
      setState({
        kind: "ok",
        msg: data.status === "already" ? "You're already on the list. See you on Thursday." : "Check your inbox to confirm. See you on Thursday.",
      });
      finish("subscribed", 3200);
    } catch {
      setState({ kind: "err", msg: "No connection. Try again." });
    }
  }

  const line =
    state.kind === "ok" || state.kind === "err"
      ? state.msg
      : "we add new finds every thursday. no ai slop, all picked by founders.";

  return (
    <aside
      ref={bar}
      aria-label="Thursday email"
      className={`fixed bottom-4 left-1/2 z-40 w-[min(820px,calc(100vw-24px))] -translate-x-1/2 transition-transform duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] ${
        shown ? "translate-y-0" : "translate-y-[calc(100%+40px)]"
      }`}
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-[0_18px_50px_-18px_rgba(14,16,20,0.28)] sm:flex-nowrap sm:gap-2.5 sm:py-3 sm:pl-5 sm:pr-3"
      >
        <p
          className={`flex min-w-0 flex-[1_1_calc(100%-46px)] items-center gap-2.5 text-sm font-semibold sm:flex-1 ${
            state.kind === "err" ? "text-[#c0362c]" : state.kind === "ok" ? "text-[#157347]" : ""
          }`}
          role={state.kind === "err" ? "alert" : state.kind === "ok" ? "status" : undefined}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="m4 7 8 6 8-6" />
          </svg>
          <span className="min-w-0 sm:truncate">{line}</span>
        </p>
        <button
          type="button"
          onClick={() => finish("closed")}
          aria-label="Close"
          className="order-2 grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)] sm:order-last"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        {state.kind !== "ok" && (
          <>
            <label htmlFor="nl-email" className="sr-only">
              Email address
            </label>
            <input
              ref={email}
              id="nl-email"
              type="email"
              inputMode="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              onInput={() => state.kind === "err" && setState({ kind: "idle" })}
              className="order-3 h-10 min-w-0 flex-[1_1_100%] rounded-[9px] border border-[var(--border-strong)] bg-[#f6f7f9] px-3.5 text-sm outline-none focus-visible:shadow-none! focus:border-[var(--foreground)] sm:order-none sm:w-56 sm:flex-none"
            />
            {/* Only bots fill this in; people never see it. */}
            <input ref={company} name="company" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />
            <button
              type="submit"
              disabled={state.kind === "busy"}
              className="order-4 h-10 flex-[1_1_100%] whitespace-nowrap rounded-[9px] bg-[var(--foreground)] px-[18px] text-sm font-bold text-[var(--background)] hover:bg-[#2a2d33] disabled:opacity-60 sm:order-none sm:flex-none"
            >
              {state.kind === "busy" ? "Signing up…" : "Sign up"}
            </button>
          </>
        )}
      </form>
    </aside>
  );
}
