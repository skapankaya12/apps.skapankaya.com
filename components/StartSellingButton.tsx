"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks";
import { setRole } from "@/lib/store";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";

/**
 * The one interactive thing on /sell.
 *
 * It is split out so the rest of the page can be a server component: the sphere
 * needs the seller list, which only the Admin SDK can read, and the marketing
 * copy around it is better off in the HTML than behind a hydration boundary.
 * This is the only part that genuinely has to run in the browser, because
 * "start selling" means three different things depending on who is asking.
 *
 * Signed out, it sends them to sign up with the intent attached, so they are
 * promoted there and land on the listing form rather than back here. Signed in
 * as a buyer, it promotes the account first: an account is always created as a
 * buyer (see signUp in lib/store.ts), so upgrading on the way through is what
 * makes /sell a one-click door rather than a settings errand. setRole refuses
 * "admin", so there is nothing to escalate here.
 */
export function StartSellingButton({
  children = "Start selling",
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const user = useUser();

  async function startSelling() {
    if (!user) {
      // Carry the intent through sign-in, and land where a signed-in seller
      // lands. Without `intent=sell` this button forgets why they came: they
      // would sign up as a buyer, arrive back here, and have to press it
      // again. See app/login/page.tsx.
      router.push("/login?next=/dashboard/new&intent=sell");
      return;
    }
    if (user.role === "buyer") await setRole("seller");
    router.push("/dashboard/new");
  }

  return (
    <LiquidMetalButton
      onClick={startSelling}
      className={`px-6 py-3 text-base ${className}`}
    >
      {children}
    </LiquidMetalButton>
  );
}
