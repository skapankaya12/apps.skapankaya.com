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
  | "Playbooks";

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
];

export const articles: Article[] = [
  {
    slug: "creativity-is-the-new-coding-2026",
    title: "Creativity is the new coding: how anyone can build an app in 2026",
    excerpt:
      "With tools like Lovable, Bolt and Claude, the hard part of building an app is no longer the code. It's the idea. Here's why creativity is now the most valuable skill a non-developer has.",
    tag: "Trends",
    author: "The Solo Market",
    date: "2026-07-28",
    body: [
      { type: "p", text: "For most of the internet's life, building an app meant learning to code, or paying someone who could. That wall is gone. In 2026, someone with no programming background can describe an idea to a tool like Lovable, Bolt, v0 or Claude and watch a working app appear in minutes. The barrier that stopped millions of people from building the thing in their head has quietly collapsed." },
      { type: "p", text: "Which raises the real question: if anyone can build, what actually decides whether what you build is any good? The answer is the one skill these tools can't hand you. Creativity." },
      { type: "h2", text: "The bottleneck moved from building to imagining" },
      { type: "p", text: "When building was hard, having an idea was cheap and executing it was expensive. Now it's flipped. Execution is nearly free: you type a description and get software back. So the scarce, valuable part is the description itself, knowing what to build, for whom, and why it matters. The person who notices a problem worth solving now beats the person who merely knows how to solve it." },
      { type: "quote", text: "AI didn't replace the maker. It deleted the busywork between having an idea and holding the thing." },
      { type: "h2", text: "Why normal people are suddenly the builders" },
      { type: "p", text: "The people best placed to spot good app ideas were never developers. They were the accountant drowning in a manual reconciliation, the teacher rebuilding the same worksheet every term, the shop owner copying orders between two systems by hand. They understood the problem intimately, but couldn't build the fix. Now they can. That's why the most interesting apps of 2026 aren't coming out of tech companies. They're coming from people describing an annoyance they've lived with for years." },
      { type: "ul", items: [
        "You already have the ideas. You've been working around them for years.",
        "You understand the context an outside developer never would.",
        "You can describe the outcome you want in plain language, which is now the whole job.",
        "You can test it against reality immediately, because it's your reality.",
      ]},
      { type: "h2", text: "Creativity is a skill, not a gift" },
      { type: "p", text: "It's tempting to think creativity is something you either have or don't. In practice, for building useful software, it's a set of habits anyone can build: paying attention to the small frictions in your day, asking why a task takes as long as it does, and imagining the shortest version of the thing that would make it disappear. The makers who win aren't the most artistic. They're the ones who notice, out loud, that something could be better." },
      { type: "h2", text: "From 'I made this' to 'I sell this'" },
      { type: "p", text: "There's a natural next step once you've built something that fixes a problem you have: someone else has that problem too. The same creativity that let you imagine the tool lets you see who else it's for. That's how a weekend build with Lovable turns into a small stream of income, without a company, a funding round, or a single line of code you wrote by hand." },
      { type: "p", text: "The tools have made building easy on purpose. What they can't do is decide what's worth making. That part, the noticing, the taste, the creative leap from problem to product, is still entirely yours. And in 2026, it's the most valuable thing you can bring to a keyboard." },
    ],
  },
  {
    slug: "build-vs-buy-small-tools",
    title: "Build vs. buy: when a $12 tool beats a $40-a-month SaaS",
    excerpt:
      "Most professionals overpay for software they barely use. Here's a simple way to decide when a tiny one-time tool wins over a monthly platform.",
    tag: "For professionals",
    author: "The Solo Market",
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
    author: "The Solo Market",
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
    author: "The Solo Market",
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
    slug: "everything-is-a-subscription",
    title: "Everything is a subscription now, and you own none of it",
    excerpt:
      "Your software, your music, even features already built into your car: it's all rented. Here's the quiet cost of a world with no 'buy' button, and why owning your tools is quietly coming back.",
    tag: "Trends",
    author: "The Solo Market",
    date: "2026-07-15",
    body: [
      { type: "p", text: "Count the subscriptions leaving your account this month. The software, the storage, the streaming, the thing you signed up for once and forgot. Somewhere along the way the 'buy' button quietly disappeared, and everything became a monthly rental you never stop paying for and never actually own." },
      { type: "h2", text: "Renting things that used to be yours" },
      { type: "p", text: "It's not just apps. It's music you can't keep, e-books that can vanish from your device, and cars shipping with heated seats you have to unlock with a monthly fee for hardware you already paid for. The pattern is the same everywhere: the product you hold is now a doorway to a payment you can never finish making." },
      { type: "quote", text: "You are not buying the thing. You are renting permission to keep using it." },
      { type: "h2", text: "The quiet costs" },
      { type: "p", text: "Rental-everything has real downsides that don't show up until later:" },
      { type: "ul", items: [
        "The price only goes up. A subscription is a standing invitation to raise your rent.",
        "It stops working the moment you stop paying, even if your need hasn't changed.",
        "You don't control it. Features get removed, terms change, and the whole thing can be discontinued out from under you.",
        "It never ends. Ten small subscriptions is a second rent you pay for software.",
      ]},
      { type: "h2", text: "There is no end product anymore" },
      { type: "p", text: "The deeper loss is the idea of a finished thing you own. A tool used to be something you bought, kept, and relied on for years. Now most software is a service that assumes it should be part of your life, and your budget, forever. Convenient for the company. Exhausting for you." },
      { type: "h2", text: "Owning your tools is making a comeback" },
      { type: "p", text: "The pushback is simple: buy the tool once, and it's yours. It runs on your machine, it keeps working whether or not the maker is still around, and it never sends another invoice. Not everything should work this way, but far more things could. For the small, specific jobs, a tool you own beats a service you rent, every single month it doesn't bill you." },
    ],
  },
  {
    slug: "ship-a-tool-in-a-weekend",
    title: "You don't need to be a developer: shipping a useful tool in a weekend",
    excerpt:
      "AI assistants have collapsed the distance between 'I have an annoying problem' and 'I have a tool that fixes it.' Here's the realistic path for a non-developer.",
    tag: "Playbooks",
    author: "The Solo Market",
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
