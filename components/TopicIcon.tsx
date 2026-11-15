import type { ReactNode } from "react";

/**
 * A small line icon for what a card is about, picked from its title, then its
 * summary, then its group. It is what makes a bot's or an agent's picture
 * say something about the job: "Calendar Coordinator" gets a calendar,
 * "Chef" gets a knife and fork. Drawn here rather than pulled from an icon
 * package; each is a few strokes on a 24 grid.
 */
const P = (d: string) => <path d={d} />;

const ICONS: Record<string, ReactNode> = {
  mail: <>{P("M3.5 6.5h17v11h-17z")}{P("m4 7 8 6 8-6")}</>,
  calendar: <>{P("M4 6h16v14H4z")}{P("M4 10h16M8 3.5V7M16 3.5V7")}</>,
  chart: <>{P("M4 19.5h16")}{P("m5 15 4.5-4.5 3.5 3 6-6")}{P("M15 7.5h4v4")}</>,
  users: <>{<circle cx="9" cy="8.5" r="3" />}{P("M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5")}{<circle cx="16.5" cy="9.5" r="2.4" />}{P("M15.8 14.2c2.3.2 4 1.8 4.6 4.8")}</>,
  code: <>{P("m8.5 7.5-5 4.5 5 4.5M15.5 7.5l5 4.5-5 4.5M13.5 5l-3 14")}</>,
  bug: <>{<rect x="7.5" y="8" width="9" height="11" rx="4.5" />}{P("M12 8v11M7.5 13h-3M19.5 13h-3M8.5 9 6 6.5M15.5 9 18 6.5M8 17.5 5.5 20M16 17.5l2.5 2.5")}</>,
  news: <>{P("M5 5h11v14H6.5A1.5 1.5 0 0 1 5 17.5z")}{P("M16 9h3v8.5a1.5 1.5 0 0 1-3 0M8 9h5M8 12.5h5M8 16h3")}</>,
  pen: <>{P("m14.5 5 4.5 4.5L9 19.5H4.5V15z")}{P("m12.5 7 4.5 4.5")}</>,
  megaphone: <>{P("M4 10v4h3l7 4.5v-13L7 10z")}{P("M17.5 9.5a3.5 3.5 0 0 1 0 5")}</>,
  video: <>{<rect x="3.5" y="6.5" width="12" height="11" rx="2" />}{P("m15.5 10.5 5-3v9l-5-3")}</>,
  palette: <>{P("M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.8-1 1.4-2-.5-1.3.3-2.5 1.7-2.5h1.9a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9z")}{<circle cx="8" cy="11" r="1.1" />}{<circle cx="11.5" cy="7.5" r="1.1" />}{<circle cx="15.5" cy="9" r="1.1" />}</>,
  music: <>{P("M9 17.5V6l10-2v11.5")}{<circle cx="6.5" cy="17.5" r="2.5" />}{<circle cx="16.5" cy="15.5" r="2.5" />}</>,
  phone: <>{P("M7 3.5h3l1.5 4-2 1.5a10 10 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16 16 0 0 1 5 5.7 2 2 0 0 1 7 3.5z")}</>,
  chat: <>{P("M4 5.5h16v10H10l-5 4v-4H4z")}{P("M8 9.5h8M8 12.5h5")}</>,
  bag: <>{P("M5 8h14l-1 12H6z")}{P("M9 10V7a3 3 0 0 1 6 0v3")}</>,
  wallet: <>{P("M4 7h14.5A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 17.5V6a1.5 1.5 0 0 1 1.5-1.5H17")}{P("M16 13h1.5")}</>,
  plane: <>{P("M3.5 13.5 10 12l3.5-7.5h2l-1.5 7 5-1 1.5-2h1.5l-1 4.5 1 4.5H21l-1.5-2-5-1 1.5 7h-2L10 14.5 3.5 13z")}</>,
  food: <>{P("M7 3.5v17M4.5 3.5V8a2.5 2.5 0 0 0 5 0V3.5")}{P("M16.5 20.5v-17c-2 1-3 3.5-3 6.5v4h3")}</>,
  dumbbell: <>{P("M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11")}</>,
  heart: <>{P("M12 19.5S4 14.8 4 9.3A4 4 0 0 1 12 7.5a4 4 0 0 1 8 1.8c0 5.5-8 10.2-8 10.2z")}</>,
  home: <>{P("M4 11 12 4.5l8 6.5")}{P("M6 9.5v10h12v-10M10 19.5v-5h4v5")}</>,
  book: <>{P("M4.5 5.5c2.5-1 5-1 7.5.5v13c-2.5-1.5-5-1.5-7.5-.5z")}{P("M19.5 5.5c-2.5-1-5-1-7.5.5v13c2.5-1.5 5-1.5 7.5-.5z")}</>,
  briefcase: <>{<rect x="3.5" y="7.5" width="17" height="11.5" rx="2" />}{P("M9 7.5V5.5h6v2M3.5 12.5h17")}</>,
  game: <>{P("M7.5 8.5h9a4 4 0 0 1 4 4.5l-.5 3.5a2 2 0 0 1-3.5 1L15 15.5H9L7.5 17.5a2 2 0 0 1-3.5-1L3.5 13a4 4 0 0 1 4-4.5z")}{P("M8 11v3M6.5 12.5h3")}{<circle cx="15.5" cy="12" r=".9" />}{<circle cx="17" cy="13.8" r=".9" />}</>,
  shield: <>{P("M12 3.5 19 6v5.5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6z")}{P("m9 12 2 2 4-4")}</>,
  globe: <>{<circle cx="12" cy="12" r="8.5" />}{P("M3.5 12h17M12 3.5c2.5 2.4 3.5 5.2 3.5 8.5s-1 6.1-3.5 8.5c-2.5-2.4-3.5-5.2-3.5-8.5s1-6.1 3.5-8.5z")}</>,
  folder: <>{P("M3.5 6.5h6l2 2h9v10.5h-17z")}</>,
  brain: <>{P("M9.5 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2 3 3 0 0 0 2 5.3 3 3 0 0 0 5.5 1.5V6a2.5 2.5 0 0 0-2.5-1.5z")}{P("M14.5 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2 3 3 0 0 1-2 5.3 3 3 0 0 1-5.5 1.5")}</>,
  wand: <>{P("m4 20 11-11M13 7l4 4")}{P("M17 3.5v3M15.5 5h3M20 8.5v2M19 9.5h2")}</>,
  wrench: <>{P("M14.5 4a4.5 4.5 0 0 0-4.3 5.8L4 16l4 4 6.2-6.2A4.5 4.5 0 0 0 20 9.5l-3 3-3-1-1-3 3-3a4.5 4.5 0 0 0-1.5-.5z")}</>,
  layers: <>{P("m12 4 8.5 4.5L12 13 3.5 8.5z")}{P("m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5")}</>,
  check: <>{<circle cx="12" cy="12" r="8.5" />}{P("m8.5 12 2.5 2.5 4.5-5")}</>,
  window: <>{<rect x="3.5" y="5" width="17" height="14" rx="2" />}{P("M3.5 9h17")}{<circle cx="6.5" cy="7" r=".6" />}{<circle cx="8.6" cy="7" r=".6" />}</>,
  branch: <>{<circle cx="7" cy="5.5" r="2" />}{<circle cx="7" cy="18.5" r="2" />}{<circle cx="17" cy="8" r="2" />}{P("M7 7.5v9M17 10c0 4-5 3.5-9 7")}</>,
  sparkle: <>{P("M12 3.5c.6 4.3 2.2 5.9 6.5 6.5-4.3.6-5.9 2.2-6.5 6.5-.6-4.3-2.2-5.9-6.5-6.5 4.3-.6 5.9-2.2 6.5-6.5z")}{P("M18.5 15.5c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5z")}</>,
  leaf: <>{P("M5 19c0-8 5-13.5 14.5-14 .5 9.5-5 14.5-13 14.5")}{P("M5 19c3-4 6-6.5 9.5-8")}</>,
  car: <>{P("M5 16.5v2M19 16.5v2M4 16.5h16v-4l-2-5H6l-2 5z")}{P("M4 12.5h16")}{<circle cx="8" cy="14.5" r=".9" />}{<circle cx="16" cy="14.5" r=".9" />}</>,
  rocket: <>{P("M12 3.5c3 2 4.5 5 4.5 8.5l-1.5 4h-6L7.5 12c0-3.5 1.5-6.5 4.5-8.5z")}{<circle cx="12" cy="10" r="1.6" />}{P("M9 16l-2 3.5 3-1M15 16l2 3.5-3-1")}</>,
};

/** Keywords to icons, checked in order; the first that matches wins. */
const RULES: [RegExp, string][] = [
  [/\b(chief of staff|orchestrat|fleet|bot team|crew|delegat|other bots|your bots)/, "layers"],
  [/\b(e-?mail|inbox|gmail|mailbox|unsubscrib)/, "mail"],
  [/\b(calendar|meeting|schedul|appointment)/, "calendar"],
  [/\b(bug|qa|playtest|testing|test)\b/, "bug"],
  [/\b(git|github|pull request|repo|commit|branch)/, "branch"],
  [/\b(sales|lead|prospect|crm|deal desk|pipeline|outbound|account research|revenue|seo|aeo|marketing|ads|campaign)/, "chart"],
  [/\b(recruit|hiring|candidate|interview|talent|onboard)/, "users"],
  [/\b(browser|web page|fetch|scrape|website)/, "globe"],
  [/\b(files?|folder|filesystem|backup|drive)\b/, "folder"],
  [/\b(memory|brain|knowledge|second brain|remember)/, "brain"],
  [/\b(privacy|security|data broker|scrub|safe)/, "shield"],
  [/\b(code|coding|engineer|developer|deploy|api|mcp|server|cli|terminal)/, "code"],
  [/\b(news|briefing|brief|digest|monitor|watch|research|tracker)/, "news"],
  [/\b(newsletter|writ|blog|copy|draft|manuscript|essay|story)/, "pen"],
  [/\b(social|tweet|x posts?|linkedin|meme|bookmark|posts?)\b/, "megaphone"],
  [/\b(video|clip|youtube|film|podcast|screen record)/, "video"],
  [/\b(design|figma|canva|palette|image|photo|avatar|brand|color|colour|icon)/, "palette"],
  [/\b(music|spotify|song|dj|playlist)/, "music"],
  [/\b(voice|phone|call)\b/, "phone"],
  [/\b(support|ticket|customer|chat)/, "chat"],
  [/\b(travel|trip|flight|hotel|itinerar)/, "plane"],
  [/\b(meal|recipe|chef|cook|food|restaurant|grocer|kitchen)/, "food"],
  [/\b(fitness|workout|gym|training|athlete)/, "dumbbell"],
  [/\b(health|sleep|habit|medical|doctor|wellness)/, "heart"],
  [/\b(budget|money|finance|bill|invoice|expense|tax|credit|refund|saving|accounts? receivable)/, "wallet"],
  [/\b(shop|price|amazon|buy|cart|purchase|gift)/, "bag"],
  [/\b(home|house|family|kids?|pet|dog|plant|garden|weather)\b/, "home"],
  [/\b(learn|study|exam|tutor|course|book|reading|college|student|school)/, "book"],
  [/\b(job|career|resume|cv)\b/, "briefcase"],
  [/\b(game|fantasy|sport|nfl|play)\b/, "game"],
  [/\b(car|tesla|vehicle)\b/, "car"],
  [/\b(launch|startup|founder)/, "rocket"],
  [/\b(goal|focus|plan|decision|advocate|todo|to-do)/, "check"],
  [/\b(skill creator|template|create)/, "wand"],
  [/\b(build|builder|tool)/, "wrench"],
];

export function topicFor(...texts: (string | undefined)[]): string {
  for (const t of texts) {
    const s = (t ?? "").toLowerCase();
    if (!s) continue;
    for (const [rx, icon] of RULES) if (rx.test(s)) return icon;
  }
  return "sparkle";
}

export function TopicIcon({ name, className = "h-6 w-6", color }: { name: string; className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name] ?? ICONS.sparkle}
    </svg>
  );
}
