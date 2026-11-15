"use client";

import { useEffect, useState } from "react";
import { ContactForm } from "./ContactForm";

/**
 * Marketplace's "Suggest a tool": the site's own contact form, locked to
 * "Request a tool", in a pop-up. It posts to /api/contact like the form on
 * /about, so requests arrive wherever those already do; nothing new to set up.
 */
export function SuggestTool({ onClose }: { onClose: () => void }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 sm:items-center sm:p-6 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggest-title"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-[var(--background)] p-6 shadow-[var(--shadow-lg)] transition-transform duration-200 sm:max-w-lg sm:rounded-3xl sm:p-7 ${
          shown ? "translate-y-0" : "translate-y-4"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="suggest-title" className="text-lg font-semibold tracking-tight">
              Suggest a tool
            </h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Tell us what you wish existed. We read every one.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <ContactForm lockTopic="request" bare />
      </div>
    </div>
  );
}
