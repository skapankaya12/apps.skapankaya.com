"use client";

import { useEffect, useState, type ReactNode } from "react";
import { copy } from "@/lib/brand";
import { GROK_BOTS } from "@/lib/grokBots";
import type { FeedKind } from "@/lib/feed";
import { ButtonLink, buttonClass } from "./ui";

/**
 * The opening above the feed changes with the filter: each kind gets its own
 * headline and one line, so the page says what you are looking at.
 *
 * Two of them are not ours to reword:
 * - Everything is Sevval's welcome from the staging desktop (WELCOME in the
 *   desktop branch's lib/desktop.ts), lowercase as she wrote it, with "in the
 *   folders" set aside for now: its second line reads "building in progress"
 *   while the feed fills.
 * - Marketplace is the site's pitch, word for word from lib/brand.ts.
 * The rest are written for this page and can change freely.
 *
 * Buttons appear only where there is a next step that is not already on the
 * screen: buyer and seller on Marketplace, Submit a free tool on Free tools.
 * Everything has none; the guide and the menu are in the bar above it.
 */
const accent = "bg-gradient-to-r from-[#8b1a1a] to-[#b54444] bg-clip-text text-transparent";

/** The word after "solo" turns through these, so every kind of solo builder sees themselves named. */
const ROLES = ["founder", "builder", "vibecoder", "maker", "indie hacker", "developer", "designer", "creator"];

type Action = { href?: string; onClick?: () => void; label: string; primary?: boolean };
type Hero = { title: ReactNode; sub: ReactNode; aside?: ReactNode; actions?: Action[] };

function heroes(): Partial<Record<"all" | FeedKind, Hero>> {
  return {
    all: {
      title: (
        <>
          find everything you need{" "}
          <span className="block">
            as a solo <RollingWord words={ROLES} />
          </span>
        </>
      ),
      sub: "building in progress",
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
      {extra}
    </div>
  );
}

/**
 * One word at a time from a list, swapped every couple of seconds with a short
 * fade. Holds on the first word for visitors who ask for reduced motion. The
 * server and the first client render both show the first word, so nothing
 * shifts on hydration.
 */
function RollingWord({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let swap: ReturnType<typeof setTimeout>;
    const t = setInterval(() => {
      setShown(false);
      swap = setTimeout(() => {
        setI((n) => (n + 1) % words.length);
        setShown(true);
      }, 250);
    }, 2200);
    return () => {
      clearInterval(t);
      clearTimeout(swap);
    };
  }, [words.length]);
  return (
    <span
      className={`inline-block transition-all duration-200 ${accent} ${shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
      aria-live="off"
    >
      {words[i]}
    </span>
  );
}
