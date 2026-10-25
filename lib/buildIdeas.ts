/**
 * What to build: tools buyers keep wishing someone would sell them, shown as
 * an aisle in the Marketplace window. Each one fits the marketplace: small,
 * runs on the buyer's own computer, paid for once.
 *
 * A starting set written for the site on 24 October 2026. Edit freely. The
 * natural source from here is the contact form's "Request a tool" and
 * "Suggest something to add" topics: when the same wish arrives twice, it
 * belongs here.
 */
export type BuildIdea = {
  slug: string;
  title: string;
  /** The problem, in the buyer's words. */
  problem: string;
  /** Who would pay for it. */
  for: string;
};

export const BUILD_IDEAS: BuildIdea[] = [
  { slug: "invoices", title: "Offline invoice and quote maker", problem: "Paying monthly to send a dozen invoices a year.", for: "Freelancers" },
  { slug: "transcriber", title: "Meeting transcriber that runs locally", problem: "Client calls are private; uploading them to a cloud service is not an option.", for: "Consultants, researchers" },
  { slug: "client-portal", title: "Self-hosted client portal", problem: "Files, status and invoices for each client, in one link, without another subscription.", for: "Agencies, freelancers" },
  { slug: "changelog", title: "Changelog page from git", problem: "Turning commits into a public what's-new page by hand every release.", for: "Indie developers" },
  { slug: "launch-assets", title: "Launch asset resizer", problem: "One product shot, needed in fifteen sizes for every launch site.", for: "Makers launching often" },
  { slug: "uptime", title: "Uptime checker for a few sites", problem: "Monitoring three small sites should not cost a monthly plan.", for: "Solo founders" },
  { slug: "tax-pot", title: "Freelance tax set-aside tracker", problem: "Knowing how much of each payment is really yours after tax.", for: "Freelancers" },
  { slug: "tiny-crm", title: "A CRM for one", problem: "Twenty leads and a follow-up date, not a sales team's software.", for: "Solo sellers" },
  { slug: "post-scheduler", title: "Self-hosted post scheduler", problem: "Scheduling a week of posts without handing over every account.", for: "Founders building in public" },
  { slug: "feedback-inbox", title: "Feedback inbox for small apps", problem: "Bug reports and wishes scattered across email, DMs and comments.", for: "Indie developers" },
];
