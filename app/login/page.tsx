"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "@/lib/store";
import { brand } from "@/lib/brand";
import { Section, Button } from "@/components/ui";

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/browse";
  const [email, setEmail] = useState("");

  function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    login(email.trim());
    router.push(next);
  }

  return (
    <Section className="max-w-md py-20">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-sm)]">
        <h1 className="text-2xl font-semibold tracking-tight">
          Sign in to {brand.name}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Demo auth — enter any email to continue. Try{" "}
          <button
            type="button"
            className="text-[var(--accent)] hover:underline"
            onClick={() => setEmail("admin@runlocal.app")}
          >
            admin@runlocal.app
          </button>{" "}
          to see the admin view.
        </p>

        <form onSubmit={handle} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Continue
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          Production uses Firebase Authentication (email link / Google).
        </p>
      </div>
    </Section>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
