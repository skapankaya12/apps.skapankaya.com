import type { ReactNode } from "react";

/**
 * One small drawing per blog post, of what that post is about, for its cover.
 * The same hand throughout: thin ink lines on the paper cover and a single
 * detail in the brand red, so the covers read as one series and each still
 * says its subject at a glance. Drawn here, one at a time; nothing generated.
 *
 * A post without a drawing falls back to the logo's four tiles, so a new
 * article never ships with an empty cover. Add its drawing here by slug.
 */
const INK = "#34343c";
const RED = "#c4383a";

const ink = { stroke: INK, strokeWidth: 1.5, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
const red = { stroke: RED, strokeWidth: 1.8, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ART: Record<string, ReactNode> = {
  // Two options side by side; only the one that can be compared gets the tick.
  "ai-cannot-recommend-what-it-cannot-compare": (
    <>
      <rect x="10" y="14" width="30" height="40" rx="5" {...ink} />
      <rect x="56" y="14" width="30" height="40" rx="5" {...ink} />
      <path d="M17 26h16M17 33h12M17 40h14" {...ink} opacity="0.45" />
      <path d="M63 26h16M63 33h16M63 40h10" {...ink} />
      <path d="m64 60 4 4 9-9" {...red} />
      <path d="M44 34h8" {...ink} opacity="0.4" strokeDasharray="2 3" />
    </>
  ),
  // A pencil line that turns into an app window.
  "creativity-is-the-new-coding-2026": (
    <>
      <path d="M8 52c8-14 14 6 22-6s10-20 18-12" {...ink} />
      <path d="m48 34 5-14 4 3-7 13z" {...ink} />
      <rect x="58" y="30" width="30" height="24" rx="4" {...ink} />
      <path d="M58 37h30" {...ink} />
      <circle cx="63" cy="33.5" r="0.9" fill={INK} />
      <circle cx="66.5" cy="33.5" r="0.9" fill={INK} />
      <circle cx="73" cy="46" r="3" {...red} />
    </>
  ),
  // A one-off price tag beside a bill that keeps coming round.
  "build-vs-buy-small-tools": (
    <>
      <path d="M12 22h22l10 12-10 12H12z" {...red} />
      <circle cx="18" cy="34" r="2" {...red} />
      <text x="24" y="38" fontSize="10" fontFamily="ui-monospace, monospace" fill={RED}>12</text>
      <path d="M80 25a14 14 0 1 0 4 10" {...ink} opacity="0.55" />
      <path d="m85 21-1 5-5-1" {...ink} opacity="0.55" />
      <text x="72" y="38.5" fontSize="10" textAnchor="middle" fontFamily="ui-monospace, monospace" fill={INK} opacity="0.55">40</text>
      <text x="72" y="60" fontSize="7" textAnchor="middle" fontFamily="ui-monospace, monospace" fill={INK} opacity="0.55">/mo</text>
    </>
  ),
  // A terminal prompt, and a coin coming out of it.
  "turn-scripts-into-income-2026": (
    <>
      <rect x="10" y="14" width="52" height="38" rx="5" {...ink} />
      <path d="M10 22h52" {...ink} />
      <path d="m18 32 5 4-5 4M27 40h10" {...ink} />
      <circle cx="74" cy="44" r="10" {...red} />
      <text x="74" y="48" fontSize="12" textAnchor="middle" fontFamily="ui-monospace, monospace" fill={RED}>$</text>
      <path d="M62 38h4" {...ink} opacity="0.4" strokeDasharray="2 2" />
    </>
  ),
  // The work on your own machine; the cloud drawn faint and dashed.
  "local-first-software-professionals": (
    <>
      <path d="M58 22a8 8 0 0 1 15-3 7 7 0 0 1 9 8H56a5 5 0 0 1 2-5z" {...ink} opacity="0.4" strokeDasharray="2 3" />
      <rect x="20" y="26" width="40" height="26" rx="3" {...ink} />
      <path d="M14 56h52" {...ink} />
      <rect x="34" y="34" width="12" height="10" rx="2" {...red} />
    </>
  ),
  // A key, circled by the renewal arrow that never stops.
  "everything-is-a-subscription": (
    <>
      <path d="M68 22a20 20 0 1 0 6 14" {...red} />
      <path d="m75 17-1 6-6-1" {...red} />
      <circle cx="40" cy="36" r="6" {...ink} />
      <path d="M46 36h14M55 36v5M60 36v4" {...ink} />
    </>
  ),
  // Saturday and Sunday, and what leaves at the end of them.
  "ship-a-tool-in-a-weekend": (
    <>
      <rect x="10" y="20" width="22" height="26" rx="4" {...ink} />
      <rect x="36" y="20" width="22" height="26" rx="4" {...ink} />
      <text x="17" y="38" fontSize="10" fontFamily="ui-monospace, monospace" fill={INK}>S</text>
      <text x="43" y="38" fontSize="10" fontFamily="ui-monospace, monospace" fill={INK}>S</text>
      <path d="m66 40 20-12-8 22-4-7z" {...red} />
      <path d="m74 43 12-15" {...red} strokeWidth="1.4" />
    </>
  ),
  // A question typed to an answer engine, with a spark where the answer forms.
  "get-found-by-ai-answer-engines-2026": (
    <>
      <rect x="8" y="26" width="62" height="18" rx="9" {...ink} />
      <circle cx="19" cy="35" r="4" {...ink} />
      <path d="m22 38 3 3" {...ink} />
      <path d="M31 35h22" {...ink} opacity="0.45" />
      <path d="M80 22c.6 4.5 2.4 6.3 7 7-4.6.7-6.4 2.5-7 7-.6-4.5-2.4-6.3-7-7 4.6-.7 6.4-2.5 7-7z" {...red} />
    </>
  ),
  // A leaderboard, the winner in red.
  "outbid-lol-distribution-problem": (
    <>
      <path d="M12 58h72" {...ink} />
      <rect x="18" y="38" width="16" height="20" rx="2" {...ink} />
      <rect x="40" y="22" width="16" height="36" rx="2" {...red} />
      <rect x="62" y="44" width="16" height="14" rx="2" {...ink} />
      <path d="m48 10 2 4 4.5.6-3.2 3 .8 4.4-4.1-2.2-4.1 2.2.8-4.4-3.2-3 4.5-.6z" {...red} strokeWidth="1.3" />
    </>
  ),
  // A short checklist under a magnifier; the last box is the one that matters.
  "how-to-judge-a-free-tool": (
    <>
      <path d="m14 22 3 3 6-6M14 36l3 3 6-6" {...ink} />
      <path d="M30 22h24M30 36h20M30 50h16" {...ink} opacity="0.5" />
      <rect x="13" y="45" width="10" height="10" rx="2" {...red} />
      <circle cx="68" cy="34" r="12" {...ink} />
      <path d="m77 43 8 8" {...ink} strokeWidth="2" />
      <path d="m63 34 4 4 6-7" {...red} />
    </>
  ),
};

export function hasArticleArt(slug: string): boolean {
  return slug in ART;
}

export function ArticleArt({ slug, className = "" }: { slug: string; className?: string }) {
  const art = ART[slug];
  if (!art) return null;
  return (
    <svg viewBox="0 0 96 72" className={className} aria-hidden>
      {art}
    </svg>
  );
}
