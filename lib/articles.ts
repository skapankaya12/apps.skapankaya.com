/**
 * Blog / "Insights" content. Hand-written articles aimed at indie makers and
 * individual professionals, plus SEO-oriented topics (getting found by Google
 * and AI answers). Today this is a static array; when a CMS or Firestore is
 * wired, these become documents with the same shape.
 *
 * Bodies are structured blocks rather than raw HTML so they render safely and
 * consistently, and so we can generate reading time and JSON-LD from them.
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string };

export type ArticleTag =
  | "Indie makers"
  | "For professionals"
  | "Trends"
  | "Playbooks"
  | "AI & SEO";

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  tag: ArticleTag;
  author: string;
  /** ISO date. */
  date: string;
  body: Block[];
}

export const ARTICLE_TAGS: ArticleTag[] = [
  "Indie makers",
  "For professionals",
  "Trends",
  "Playbooks",
  "AI & SEO",
];

export const articles: Article[] = [
  {
    slug: "build-vs-buy-small-tools",
    title: "Build vs. buy: when a $12 tool beats a $40-a-month SaaS",
    excerpt:
      "Most professionals overpay for software they barely use. Here's a simple way to decide when a tiny one-time tool wins over a monthly platform.",
    tag: "For professionals",
    author: "Apps Marketplace",
    date: "2026-07-02",
    body: [
      { type: "p", text: "Look at your last three software subscriptions and ask an uncomfortable question: how many of their features do you actually touch? For most individual professionals the honest answer is one or two. You pay for a suite and use a corner of it." },
      { type: "h2", text: "The math nobody runs" },
      { type: "p", text: "A $40-a-month platform is $480 a year, and $2,400 over five years. If you use it for a single job, like turning bookings into invoices or cleaning an export, you are renting a mansion to sleep in one room. A focused tool that does exactly that job for a one-time $12 is not just cheaper this month. It removes a recurring line item forever." },
      { type: "p", text: "The catch used to be that small tools were hard to find and harder to run. That is the part that changed." },
      { type: "h2", text: "A quick decision rule" },
      { type: "p", text: "Before you subscribe to anything, run through four questions:" },
      { type: "ul", items: [
        "Do I need one outcome, or a whole workflow? One outcome favours buying a small tool.",
        "How often will I use it? Daily, deep use can justify a subscription. Weekly or monthly rarely does.",
        "Does my data need to leave my machine? If not, a local tool is safer and usually cheaper.",
        "Will I still need this in a year? Recurring cost only makes sense for recurring value.",
      ]},
      { type: "quote", text: "Subscriptions are priced for the customer who uses everything. Most of us are not that customer." },
      { type: "h2", text: "When the SaaS is worth it" },
      { type: "p", text: "This is not an argument against all subscriptions. Collaboration, constantly changing data, and things you depend on every hour are a genuine fit for a platform. The point is to make it a decision instead of a default. Buy the small tool for the small job, and save the monthly spend for the software you truly live in." },
      { type: "p", text: "The unbundling of software is quietly one of the best raises a freelancer can give themselves. It just shows up as bills you stop paying." },
    ],
  },
  {
    slug: "turn-scripts-into-income-2026",
    title: "How indie makers are turning one-off scripts into income in 2026",
    excerpt:
      "The little script you wrote to fix your own problem might be worth money. Here's how solo makers are packaging and selling them without building a company.",
    tag: "Indie makers",
    author: "Apps Marketplace",
    date: "2026-06-24",
    body: [
      { type: "p", text: "Every maker has a folder of scripts they wrote for themselves: the one that renames a batch of files, the one that generates a report, the one that scrapes a page they check every morning. For years those sat on a hard drive because turning a script into a product felt like too much work. In 2026, it isn't." },
      { type: "h2", text: "Small is the point, not the problem" },
      { type: "p", text: "The instinct is to think a tool is 'too small to sell.' Flip it around. Small is exactly why it sells: it solves one problem completely, a buyer understands it in ten seconds, and there is nothing to learn. You are not competing with a platform. You are the answer to a specific search." },
      { type: "h2", text: "What packaging actually takes" },
      { type: "p", text: "Turning a script into something a stranger can run comes down to a short checklist:" },
      { type: "ul", items: [
        "A one-line description of the exact problem it solves.",
        "A SETUP file so it runs with one command, or so an AI assistant can set it up.",
        "A short demo video, ideally a screen recording of the tool doing its job.",
        "Honest notes on what it needs (a runtime, a folder, an API key) and what it touches.",
      ]},
      { type: "p", text: "That's it. No landing page, no company, no funnel. The marketplace is the distribution." },
      { type: "quote", text: "You are not launching a startup. You are giving your past weekend's work a price tag." },
      { type: "h2", text: "The compounding part" },
      { type: "p", text: "One tool is a nice bit of side income. Five tools, each earning quietly, start to look like a small portfolio. And because they are finished and local, they need almost no maintenance. The work is done once and the sales keep arriving. That is the closest thing indie makers have to passive income that isn't a course about passive income." },
    ],
  },
  {
    slug: "local-first-software-professionals",
    title: "The quiet rise of local-first software",
    excerpt:
      "Professionals who handle sensitive data are moving jobs off the cloud and back onto their own machines. Here's why local-first is becoming a selling point.",
    tag: "Trends",
    author: "Apps Marketplace",
    date: "2026-06-11",
    body: [
      { type: "p", text: "For a decade the answer to 'where does the software run?' was always 'the cloud.' That's shifting. A growing set of professionals, especially anyone handling client data, financials, or anything under a confidentiality agreement, are deliberately choosing tools that run on their own machine." },
      { type: "h2", text: "Why now" },
      { type: "p", text: "Three things converged. Data breaches made 'we uploaded it to a service' a liability rather than a convenience. Subscription fatigue made people question why a text tool needs an account and a server. And AI assistants made local tools easy to set up, removing the friction that pushed everyone to the cloud in the first place." },
      { type: "h2", text: "What local-first buys you" },
      { type: "ul", items: [
        "Privacy by architecture: if the data never leaves your device, there's nothing to leak.",
        "No account, no lock-in: the tool is yours, and it keeps working whether or not the maker does.",
        "Speed: local tools don't wait on a network round trip.",
        "Lower cost: no server means no recurring bill to fund it.",
      ]},
      { type: "quote", text: "The most private cloud is the one you never upload to." },
      { type: "h2", text: "The trade-offs, honestly" },
      { type: "p", text: "Local-first isn't free of downsides. You handle your own backups, collaboration is harder, and 'it runs on my machine' means compatibility varies. The reason it's viable now is that setup got easy: a good SETUP file, or an AI assistant reading it for you, turns a scary download into a two-minute task. For the right jobs, that trade is well worth it, and increasingly it's what discerning buyers ask for." },
    ],
  },
  {
    slug: "get-found-by-ai-answers",
    title: "Getting found by AI: writing product pages that show up in AI answers",
    excerpt:
      "Search is no longer just ten blue links. If you sell a tool, here's how to write pages that both Google and AI assistants can quote and recommend.",
    tag: "AI & SEO",
    author: "Apps Marketplace",
    date: "2026-05-28",
    body: [
      { type: "p", text: "More and more people start with a question typed into an AI assistant, not a search box. The assistant reads pages and answers in prose, often recommending a specific tool. If you make software, being the tool it names is the new front page of Google. The good news: the way to get there overlaps heavily with plain, honest writing." },
      { type: "h2", text: "Lead with the problem, in the buyer's words" },
      { type: "p", text: "Both search engines and AI models match on the language people actually use. Someone doesn't search 'data normalization utility,' they search 'clean up a messy CSV.' Put the real problem in your title and first sentence. Describe the job to be done before the clever name." },
      { type: "h2", text: "Be specific and answerable" },
      { type: "ul", items: [
        "State exactly what the tool does and doesn't do. Vague pages get skipped; precise ones get quoted.",
        "Answer the obvious questions on the page: what it costs, what it needs to run, whether data stays local.",
        "Use clear headings that mirror real questions. AI systems lift answers from well-structured sections.",
        "Include a short demo. Rich media keeps humans on the page, which search still rewards.",
      ]},
      { type: "quote", text: "The pages that win AI answers are the ones that already answer the question a human would ask." },
      { type: "h2", text: "Structure the machine can trust" },
      { type: "p", text: "Behind the scenes, structured data helps. Marking up a product with its price, description, and reviews, and marking up an article as an article with an author and date, gives machines unambiguous facts to repeat. You don't need to game anything. You need to be clear, specific, and honest, then make that clarity legible to software. That is the whole playbook, and it happens to be good writing too." },
    ],
  },
  {
    slug: "ship-a-tool-in-a-weekend",
    title: "You don't need to be a developer: shipping a useful tool in a weekend",
    excerpt:
      "AI assistants have collapsed the distance between 'I have an annoying problem' and 'I have a tool that fixes it.' Here's the realistic path for a non-developer.",
    tag: "Playbooks",
    author: "Apps Marketplace",
    date: "2026-05-14",
    body: [
      { type: "p", text: "A year ago, 'build your own tool' was advice for programmers. Now a motivated non-developer can go from a nagging problem to a working tool over a weekend, using an AI assistant as the engineer. The skill that matters isn't coding. It's describing what you want clearly." },
      { type: "h2", text: "Saturday: describe the problem" },
      { type: "p", text: "Start by writing down the annoying task in plain language, including a real example. 'Every Monday I download a spreadsheet of orders, and I have to split it into one file per store and email each manager.' That paragraph is your spec. Hand it to an AI assistant and ask it to build the smallest thing that does it." },
      { type: "h2", text: "Sunday: make it runnable by someone else" },
      { type: "p", text: "A tool that only runs on your machine is a personal win. A tool anyone can run is a product. Ask your assistant to add:" },
      { type: "ul", items: [
        "A SETUP file with the exact steps, or a one-line command.",
        "Clear notes on what it needs (a folder, a runtime, any keys).",
        "A tiny sample so a buyer can try it without their own data.",
      ]},
      { type: "quote", text: "The bottleneck used to be building. Now it's noticing which of your annoyances other people share." },
      { type: "h2", text: "The part that's actually hard" },
      { type: "p", text: "The building is the easy 20% now. The valuable skill is taste: noticing that a problem you have is a problem thousands of others have, and describing the fix so plainly that both a buyer and their AI assistant understand it instantly. That's not an engineering skill. It's the same instinct that makes someone good at their job. Which is exactly why the people best placed to build these tools are professionals, not programmers." },
    ],
  },
];

/* --------------------------------- helpers --------------------------------- */

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function articlesSorted(): Article[] {
  return [...articles].sort((a, b) => b.date.localeCompare(a.date));
}

/** Rough reading time from the body's word count. */
export function readingMinutes(a: Article): number {
  const words = a.body.reduce((n, b) => {
    if (b.type === "ul") return n + b.items.join(" ").split(/\s+/).length;
    return n + b.text.split(/\s+/).length;
  }, 0);
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
