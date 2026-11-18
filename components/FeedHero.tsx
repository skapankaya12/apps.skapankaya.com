"use client";

import type { ReactNode } from "react";
import { brand, copy } from "@/lib/brand";
import { GROK_BOTS } from "@/lib/grokBots";
import type { FeedKind } from "@/lib/feed";
import Link from "next/link";
import { ButtonLink, buttonClass } from "./ui";
import { WaitlistForm } from "./WaitlistForm";

/**
 * The opening above the feed changes with the filter: each kind gets its own
 * headline and one line, so the page says what you are looking at.
 *
 * - Everything (the homepage) says what the site is and what is open today,
 *   then puts the launch signup beside the free path. Rewritten from the
 *   Vybe website audit (18 Nov 2026): "building in progress" did not tell
 *   visitors that buying is closed or what joining gets them.
 * - Marketplace is the site's pitch, word for word from lib/brand.ts.
 * The rest are written for this page and can change freely.
 *
 * Buttons appear only where there is a next step that is not already on the
 * screen: buyer and seller on Marketplace, Submit a free tool on Free tools.
 * Everything has none; the guide and the menu are in the bar above it.
 */
const accent = "bg-gradient-to-r from-[#8b1a1a] to-[#b54444] bg-clip-text text-transparent";

type Action = { href?: string; onClick?: () => void; label: string; primary?: boolean };
type Hero = { title: ReactNode; sub: ReactNode; aside?: ReactNode; actions?: Action[]; launch?: boolean };

function heroes(): Partial<Record<"all" | FeedKind, Hero>> {
  return {
    all: {
      title: (
        <>
          Tools and resources{" "}
          <span className="block">
            for solo <span className={accent}>builders.</span>
          </span>
        </>
      ),
      sub: "Discover free tools, bots and guides today. Paid downloads open at launch.",
      launch: true,
    },
    tool: {
      // Two deliberate rows: `block` pins the break before the byline instead
      // of leaving it to the balancer. The {" "}s are the SWC whitespace gotcha.
      title: (
        <>
          {copy.heroHeadline}{" "}
          <span className="block">
            {copy.heroByline.before}{" "}
            <span className={accent}>{copy.heroByline.accent}</span>{" "}
            {copy.heroByline.after}
          </span>
        </>
      ),
      sub: (
        <>
          {copy.heroSub}{" "}
          <span className={`${accent} font-semibold`}>{copy.heroSubAccent}</span>
        </>
      ),
      actions: [
        { href: "#apps", label: "I'm a buyer", primary: true },
        { href: "/sell", label: "I'm a seller" },
      ],
    },
    free: {
      title: (
        <>
          Free tools, <span className={accent}>made by people who build alone.</span>
        </>
      ),
      sub: "Each one lives on its maker's own site and costs nothing to download. We describe it and link out.",
      actions: [{ href: "/free/submit", label: "Submit a free tool" }],
    },
    swap: {
      title: (
        <>
          Stop renting the tools <span className={accent}>you use every day.</span>
        </>
      ),
      sub: "Self-hostable swaps for subscriptions you already pay for, most of them open source.",
    },
    kit: {
      title: (
        <>
          Start from something <span className={accent}>that already works.</span>
        </>
      ),
      sub: "Free starters, themes and component kits for your next app, site or docs.",
    },
    plugin: {
      title: (
        <>
          Small add-ons <span className={accent}>for the apps you live in.</span>
        </>
      ),
      sub: "Free plugins for Obsidian, VS Code, Figma and Raycast.",
    },
    bot: {
      title: (
        <>
          A Grok Bot for every job, <span className={accent}>ready to add.</span>
        </>
      ),
      sub: `${GROK_BOTS.length} bots for work and life. Copy a link, open it on x.ai and add it to your Grok Bot.`,
      actions: [{ href: "/grok-bots/submit", label: "Add your Grok Bot" }],
    },
    agent: {
      title: (
        <>
          Give your AI assistant <span className={accent}>a new skill.</span>
        </>
      ),
      sub: "Claude Skills, MCP servers and ChatGPT apps, each one a job your assistant can take on.",
    },
    video: {
      title: (
        <>
          Launch videos, <span className={accent}>written as code.</span>
        </>
      ),
      sub: "Product films and motion styles made by asking an AI to write the video, each with the prompt behind it.",
    },
    article: {
      // The blog index's own heading and line from before it joined the feed.
      title: (
        <>
          Ideas for people who build <span className={accent}>and buy small software</span>
        </>
      ),
      sub: "Practical writing for indie makers and independent professionals: building tools with AI, selling them, escaping bloated SaaS, and owning your software again.",
    },
    read: {
      title: (
        <>
          Worth reading <span className={accent}>if you build alone.</span>
        </>
      ),
      sub: "Essays and stories on pricing, distribution and owning your work, picked by hand.",
    },
    launch: {
      title: (
        <>
          Just shipped <span className={accent}>by people building alone.</span>
        </>
      ),
      sub: "Fresh launches from Show HN, picked for makers. Try them while they are new.",
    },
    perk: {
      title: (
        <>
          Credits and perks <span className={accent}>for building on your own.</span>
        </>
      ),
      sub: "Startup programs that give credits and discounts. Each one has its own terms on its page.",
    },
  };
}

export function FeedHero({ kind, extra }: { kind: "all" | FeedKind; extra?: ReactNode }) {
  const all = heroes();
  const hero = all[kind] ?? all.all!;
  return (
    <div className="mx-auto mt-10 max-w-3xl text-center">
      <p className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{hero.title}</p>
      <p className="mx-auto mt-3 max-w-2xl text-balance text-[var(--muted)]">{hero.sub}</p>
      {hero.aside && <p className="mx-auto mt-2 max-w-2xl text-sm text-[var(--muted)]/80">{hero.aside}</p>}
      {hero.actions && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {hero.actions.map((a) =>
            a.href ? (
              <ButtonLink key={a.label} href={a.href} size="lg" variant={a.primary ? "primary" : "secondary"}>
                {a.label}
              </ButtonLink>
            ) : (
              <button key={a.label} type="button" onClick={a.onClick} className={buttonClass(a.primary ? "primary" : "secondary", "lg")}>
                {a.label}
              </button>
            ),
          )}
        </div>
      )}
      {hero.launch && <LaunchCta />}
      {extra}
    </div>
  );
}

/**
 * The homepage's next steps: the launch signup (the same /api/waitlist form
 * as the pre-launch card), the free path beside it, and one line for makers.
 */
function LaunchCta() {
  return (
    <>
      <WaitlistForm inline label="Get one email when buying opens" buttonLabel="Notify me when buying opens" />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        <Link href="/free" className="font-medium underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--foreground)]">
          Browse free tools
        </Link>
        <span className="h-4 w-px bg-[var(--border)]" aria-hidden />
        <Link href="/sell" className="text-[var(--muted)] hover:text-[var(--foreground)]">
          Built a useful tool? <span className="font-medium text-[var(--foreground)]">List it free. Keep {Math.round((1 - brand.commissionRate) * 100)}%.</span>
        </Link>
      </div>
    </>
  );
}
