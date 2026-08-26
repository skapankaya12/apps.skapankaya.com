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
  {
    slug: "get-found-by-ai-answer-engines-2026",
    title: "Getting found by AI: what changed for small software in 2026",
    excerpt:
      "More than half of searches now end without a click, and the answer people read is written by a machine that never visited your site. Here is what actually decides whether it mentions you.",
    tag: "Playbooks",
    author: "The Solo Market",
    date: "2026-08-26",
    body: [
      { type: "p", text: "If you built something small and put it online this year, you have probably noticed that the old advice stopped working. You wrote the page, you picked the keywords, and the traffic did not come. Nothing is broken. The place people ask their questions has moved." },
      { type: "p", text: "Google's AI Overviews now reach billions of people a month, and its AI Mode passed a billion users inside its first year. More than 60% of searches end without anyone clicking anything. The person who needed your tool got their answer, and the answer was assembled by a model that read about you rather than sending anyone to you." },
      { type: "h2", text: "Three jobs, not one" },
      { type: "p", text: "It helps to stop thinking of this as one task. Classic search optimisation makes your page eligible to be found at all. Answer engine optimisation makes the specific fact someone asked for easy to lift out of the page. And what people are calling generative engine optimisation is about whether your name is something a model is willing to say out loud, which comes down to whether you look like a real, consistent, checkable thing." },
      { type: "p", text: "You need all three, but they fail in different ways, and the third one is where small makers lose without noticing." },
      { type: "h2", text: "The failure nobody sees" },
      { type: "p", text: "Here is the one worth checking today, because it is invisible from your own homepage. Everything a machine reads about you lives in places you never look: your structured data, your llms.txt if you have one, the description buried in your page source. Those layers drift away from what your site actually says, and nothing warns you." },
      { type: "p", text: "We had exactly this problem on this site. Our homepage said clearly that the marketplace was pre-launch and nothing could be bought yet. Our structured data said the opposite: every product carried a machine-readable claim that it was in stock and purchasable today. Both were written by us. Neither was lying on purpose. They simply lived in different files and drifted." },
      { type: "quote", text: "A person reads your homepage. A machine reads four other things. If those disagree, the machine wins, because it is the one doing the talking." },
      { type: "h2", text: "What actually helps" },
      { type: "ul", items: [
        "Answer the question in the first sentence, then explain. Models lift the sentence that stands alone.",
        "Put your facts in structures: a real FAQ, a comparison table, a short list. Prose buries the answer inside a paragraph.",
        "Make sure every marked-up answer appears in the visible text, word for word. Markup that describes a page you did not write is the fastest way to get ignored.",
        "Add an llms.txt: a plain text page saying what you are, in sentences you would be happy to see quoted back.",
        "Say the same thing about yourself everywhere. A model that finds three different descriptions of you trusts none of them.",
        "Check the machine-readable half every time you change the human half. They drift silently.",
      ]},
      { type: "h2", text: "Credibility beats volume now" },
      { type: "p", text: "The old game rewarded whoever accumulated the most links. Language models weigh that far less. What they respond to is whether your content reads as credible, current, and specific enough to quote. A page that says something concrete and checkable is worth more than five pages of competent filler, which is a genuinely good change for anyone building alone." },
      { type: "p", text: "It also means the small maker is not automatically at a disadvantage. You cannot outspend a company on links. You can absolutely be clearer, more specific and more honest than one, and that is now the thing being measured." },
      { type: "p", text: "None of this is a trick, and anyone promising you a ranking is guessing. What you can control is whether the machine reading you finds something true, specific and easy to repeat. Start with the layers you never look at." },
    ],
  },
  {
    slug: "outbid-lol-distribution-problem",
    title: "outbid.lol made over $200,000 in a week. The lesson is not the leaderboard.",
    excerpt:
      "A German developer shipped a pay-to-rank board in about three hours and watched it take over tech Twitter. The interesting part is not what he built. It is what people were so eager to buy.",
    tag: "Trends",
    author: "The Solo Market",
    date: "2026-08-25",
    body: [
      { type: "p", text: "In the third week of August 2026, an independent developer in Germany named Jonathan Wilke put up a website called outbid.lol. The idea fits in a sentence: it is a public leaderboard, and your position is whatever you are willing to pay for it. Bids start at a few dollars. If you want to move up, you pay the difference." },
      { type: "p", text: "By most accounts it took him roughly a single evening to build. Within 48 hours it had drawn over a million visitors and more than $120,000 in bids. Inside a week that figure had passed $207,000, with a top bid around $17,000, and he had already turned down a six figure offer to buy it." },
      { type: "h2", text: "The obvious lesson is the wrong one" },
      { type: "p", text: "The temptation is to read this as a build story. One person, three hours, no company, no funding, no investors, more revenue in a week than most funded startups see in a year. All true, and all of it is the part that is hardest to copy, because a viral moment is not a strategy. For every outbid.lol there are ten thousand equally clever weekend projects that nobody saw." },
      { type: "p", text: "The more useful question is not how he built it. It is why so many people rushed to pay." },
      { type: "h2", text: "People paid to be seen" },
      { type: "p", text: "Every person bidding on that board already had a product. They had already done the hard part. What they did not have was anyone looking at it. They were not buying software or a service. They were buying attention, openly, at a public price, because the ordinary routes to attention had stopped working for them." },
      { type: "quote", text: "Building stopped being the bottleneck a while ago. Being found is the bottleneck now, and outbid.lol is what it looks like when people admit that out loud." },
      { type: "p", text: "That is the honest thing about it. It does not pretend to be a ranking earned through merit. It is an auction and it says so. Whether that is bleak or refreshing probably depends on how many hours you have poured into a launch that nobody noticed." },
      { type: "h2", text: "What a solo maker should actually take from it" },
      { type: "ul", items: [
        "Ship small and ship finished. The thing that broke through was one page that did one thing, not a platform.",
        "A single burst of attention is not distribution. Ask what happens on day thirty, when the board has moved on.",
        "Paid placement can be worth it, but treat it as an ad, because that is what it is. Price it against what a customer is worth to you.",
        "Build something people can still find next year: a page that answers a real question, a tool with a name people search for, a place your work lives permanently.",
      ]},
      { type: "h2", text: "The part that does generalise" },
      { type: "p", text: "One person with an idea and an evening can now reach a million people and get paid, without permission from anybody. That was not true a few years ago and it is genuinely worth sitting with. The infrastructure for a single human to build, launch and charge for software is finally as good as the tools large companies use." },
      { type: "p", text: "The rest of it, the specific viral shape of this specific week, will not repeat. What repeats is the underlying fact: the software was never the hard part, and everyone who paid to climb that board was telling you so." },
    ],
  },
  {
    slug: "how-to-judge-a-free-tool",
    title: "How to tell a free tool worth using from one that wastes your afternoon",
    excerpt:
      "There is a lot of free software and most of it is abandoned, half finished, or quietly selling something. Six checks that take two minutes and save you the afternoon.",
    tag: "Playbooks",
    author: "The Solo Market",
    date: "2026-08-24",
    body: [
      { type: "p", text: "Free software made by an individual is one of the better deals on the internet. It is also where you will find the highest concentration of things that look finished and are not. The difference matters most when you are about to hand something your working files." },
      { type: "p", text: "These are the checks worth doing before you download anything, and none of them take more than a minute." },
      { type: "h2", text: "Is anyone still there" },
      { type: "p", text: "Find the last time it was updated. If it lives on GitHub, look at the most recent commit and whether anyone answers the open issues. A tool that has not been touched in two years is not necessarily broken, but nobody is coming if it breaks on your machine. For something you will use once, fine. For something in your weekly routine, that is a real risk." },
      { type: "h2", text: "Is there a person behind it" },
      { type: "p", text: "A name, a profile, somewhere they can be reached. This is not sentimentality. Software from an identifiable person carries an incentive that anonymous software does not: their name is attached to it. It also means there is somebody to ask when the setup guide skips a step." },
      { type: "h2", text: "Where does your data go" },
      { type: "p", text: "The single most useful question, and the easiest to skip. Does it run entirely on your machine, or does it upload what you feed it? For anything touching client work, financial records or personal information, a tool that runs locally is not merely nicer, it is the difference between using it at work and not being allowed to." },
      { type: "h2", text: "What is it actually charging" },
      { type: "p", text: "Free has several meanings. Free because it is genuinely free. Free because it is the trial half of something that will ask for a subscription in a month. Free because your data is the product. Free because it is open source and somebody scratched their own itch. All four are legitimate. Only one of them is free the way you probably mean it, so find out which you are looking at." },
      { type: "h2", text: "Can you get out" },
      { type: "p", text: "Look at what it exports. A tool that keeps your work in a format only it can read is a tool you cannot leave, and free things get abandoned more often than paid ones. Plain formats mean the tool can disappear and your work survives." },
      { type: "h2", text: "What is the licence" },
      { type: "p", text: "Mostly this matters if you are using it commercially. Open source does not automatically mean free for business use, and a few licences have real obligations attached. Thirty seconds in the LICENSE file now beats an awkward conversation later." },
      { type: "quote", text: "The best free tools are usually small, obviously made by one person, and honest about what they do not do." },
      { type: "h2", text: "The short version" },
      { type: "ul", items: [
        "Updated recently, or at least not abandoned mid-bug.",
        "A named human you could contact.",
        "Clear about whether your data leaves your machine.",
        "Honest about what free means here.",
        "Exports to something you could open in ten years.",
        "A licence that covers what you plan to do with it.",
      ]},
      { type: "p", text: "None of this requires being technical. It requires two minutes and a willingness to close the tab when the answers are missing. Software made by one person is often better than the corporate alternative, precisely because somebody cared. These checks are how you find the ones where somebody still does." },
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
