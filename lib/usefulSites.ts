/**
 * Useful websites: the desktop's hand-picked list of places a solo founder
 * keeps going back to. Links out only; nothing here is sold, hosted or paid
 * for, and none of the links is an affiliate link.
 *
 * Picked on 24 October 2026 from what keeps coming up across launch-directory
 * guides and solo-founder stack write-ups, then each link checked by hand.
 * The descriptions are ours. Keep each one to a single plain line, and keep
 * the subfolders few: a folder of folders stops being useful past six or so.
 *
 * `pinned` sites sit at the top of the folder, above the subfolders. Three, no
 * more: a pin that everything gets is not a pin.
 *
 * Icons are fetched once into public/sites/ by scripts/fetch-site-icons.mjs,
 * so visitors never load anything from these sites until they click.
 */

export type SiteFolder = { id: string; label: string };

export type UsefulSite = {
  slug: string;
  name: string;
  url: string;
  blurb: string;
  folder: string;
  pinned?: boolean;
};

export const SITE_FOLDERS: SiteFolder[] = [
  { id: "launch", label: "Launch & get found" },
  { id: "community", label: "Community & learning" },
  { id: "payments", label: "Payments & selling" },
  { id: "build", label: "Build & ship" },
  { id: "design", label: "Design & assets" },
  { id: "grow", label: "Grow & measure" },
];

export const USEFUL_SITES: UsefulSite[] = [
  // Launch & get found
  { slug: "producthunt", name: "Product Hunt", url: "https://www.producthunt.com", blurb: "The best-known launch day. Worth one good shot.", folder: "launch", pinned: true },
  { slug: "show-hn", name: "Show HN", url: "https://news.ycombinator.com/show", blurb: "Hacker News's place to show what you built. Developers read it.", folder: "launch" },
  { slug: "uneed", name: "Uneed", url: "https://www.uneed.best", blurb: "A launch site for indie products. Your listing stays after launch day.", folder: "launch" },
  { slug: "peerlist", name: "Peerlist Launchpad", url: "https://peerlist.io/launchpad", blurb: "Weekly launches voted on by builders.", folder: "launch" },
  { slug: "betalist", name: "BetaList", url: "https://betalist.com", blurb: "For products still finding their first users.", folder: "launch" },
  { slug: "devhunt", name: "DevHunt", url: "https://devhunt.org", blurb: "Launches for developer tools, libraries and APIs.", folder: "launch" },
  { slug: "alternativeto", name: "AlternativeTo", url: "https://alternativeto.net", blurb: "Be listed as the alternative to the tool people want to leave.", folder: "launch" },
  { slug: "saashub", name: "SaaSHub", url: "https://www.saashub.com", blurb: "A lasting directory listing for software.", folder: "launch" },
  { slug: "microlaunch", name: "Microlaunch", url: "https://microlaunch.net", blurb: "A month-long launch for small products.", folder: "launch" },

  // Community & learning
  { slug: "indiehackers", name: "Indie Hackers", url: "https://www.indiehackers.com", blurb: "Founders sharing numbers, mistakes and what worked.", folder: "community", pinned: true },
  { slug: "startupschool", name: "Startup School", url: "https://www.startupschool.org", blurb: "Y Combinator's free course on starting a company.", folder: "community", pinned: true },
  { slug: "paulgraham", name: "Paul Graham's essays", url: "https://paulgraham.com/articles.html", blurb: "The essays most founders end up rereading.", folder: "community" },
  { slug: "sideproject", name: "r/SideProject", url: "https://www.reddit.com/r/SideProject/", blurb: "Show a side project and get honest first reactions.", folder: "community" },

  // Payments & selling
  { slug: "stripe", name: "Stripe", url: "https://stripe.com", blurb: "Take payments. You handle the sales tax yourself.", folder: "payments" },
  { slug: "lemonsqueezy", name: "Lemon Squeezy", url: "https://www.lemonsqueezy.com", blurb: "Sells for you as merchant of record, so tax is handled.", folder: "payments" },
  { slug: "paddle", name: "Paddle", url: "https://www.paddle.com", blurb: "Merchant of record for software, tax and invoices included.", folder: "payments" },
  { slug: "polar", name: "Polar", url: "https://polar.sh", blurb: "Merchant of record built for developers and open source.", folder: "payments" },
  { slug: "gumroad", name: "Gumroad", url: "https://gumroad.com", blurb: "Sell a download in minutes, no storefront to build.", folder: "payments" },

  // Build & ship
  { slug: "claude", name: "Claude", url: "https://claude.ai", blurb: "An AI assistant for writing, thinking and code.", folder: "build" },
  { slug: "cursor", name: "Cursor", url: "https://cursor.com", blurb: "A code editor with AI built in.", folder: "build" },
  { slug: "vercel", name: "Vercel", url: "https://vercel.com", blurb: "Put a web app online from a git push.", folder: "build" },
  { slug: "supabase", name: "Supabase", url: "https://supabase.com", blurb: "A database, sign-in and storage, ready to use.", folder: "build" },
  { slug: "cloudflare", name: "Cloudflare", url: "https://www.cloudflare.com", blurb: "Domains, DNS and hosting, with a generous free tier.", folder: "build" },
  { slug: "resend", name: "Resend", url: "https://resend.com", blurb: "Send email from your app without a fight.", folder: "build" },
  { slug: "clerk", name: "Clerk", url: "https://clerk.com", blurb: "Sign-in and user accounts as drop-in pieces.", folder: "build" },

  // Design & assets
  { slug: "figma", name: "Figma", url: "https://www.figma.com", blurb: "Design screens, logos and launch images.", folder: "design" },
  { slug: "mobbin", name: "Mobbin", url: "https://mobbin.com", blurb: "Screens from real apps, to see how others solved it.", folder: "design" },
  { slug: "21st", name: "21st.dev", url: "https://21st.dev", blurb: "Ready-made interface components to copy into your app.", folder: "design" },
  { slug: "unsplash", name: "Unsplash", url: "https://unsplash.com", blurb: "Free photos you can use.", folder: "design" },
  { slug: "lucide", name: "Lucide", url: "https://lucide.dev", blurb: "A clean, open source icon set.", folder: "design" },
  { slug: "coolors", name: "Coolors", url: "https://coolors.co", blurb: "Find a colour palette in a few clicks.", folder: "design" },
  { slug: "googlefonts", name: "Google Fonts", url: "https://fonts.google.com", blurb: "Free fonts for the web.", folder: "design" },

  // Grow & measure
  { slug: "searchconsole", name: "Google Search Console", url: "https://search.google.com/search-console", blurb: "See how Google finds you, and fix what it cannot read.", folder: "grow" },
  { slug: "plausible", name: "Plausible", url: "https://plausible.io", blurb: "Simple visitor stats without cookies.", folder: "grow" },
  { slug: "posthog", name: "PostHog", url: "https://posthog.com", blurb: "Product analytics: what people actually do in your app.", folder: "grow" },
  { slug: "beehiiv", name: "beehiiv", url: "https://www.beehiiv.com", blurb: "A newsletter, so your audience is yours.", folder: "grow" },
  { slug: "typefully", name: "Typefully", url: "https://typefully.com", blurb: "Write and schedule posts for X and LinkedIn.", folder: "grow" },
  { slug: "ahrefs-awt", name: "Ahrefs Webmaster Tools", url: "https://ahrefs.com/webmaster-tools", blurb: "Free checks on your own site's links and SEO.", folder: "grow" },
];
