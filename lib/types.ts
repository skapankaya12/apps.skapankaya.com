export type Role = "buyer" | "seller" | "admin";

export type ListingStatus = "draft" | "pending" | "approved" | "rejected";

export type Runtime = "node" | "python" | "browser" | "binary" | "other";

export type SetupMode = "one-command" | "ai-assisted";

/**
 * Categories are framed around the professional context / department a tool
 * serves ("Sales", "Marketing", "Finance"), not the kind of file it touches.
 * A buyer browses the way they think about their own work, and the same tool
 * makes sense whatever their industry.
 */
export type Category =
  | "sales"
  | "marketing"
  | "finance"
  | "operations"
  | "people"
  | "design"
  | "developers"
  | "productivity"
  | "data"
  | "personal";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  /** Stripe Connect (Express) account id, set once the seller onboards. */
  stripeAccountId?: string;
  /** Synced from Stripe via webhook: whether payouts are set up and live. */
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  createdAt: number;
}

export interface Listing {
  id: string;
  slug: string;
  sellerId: string;
  sellerName: string;
  /** Short "about the seller" blurb shown to buyers on the listing page. */
  sellerBio?: string;
  /** Public support/contact email buyers can reach the seller at. */
  sellerEmail?: string;
  /** Seller's website or profile link (https URL). */
  sellerWebsite?: string;
  title: string;
  tagline: string;
  description: string;
  category: Category;
  /** Price in the smallest currency unit (cents). */
  priceCents: number;
  runtime: Runtime;
  setupMode: SetupMode;
  /** Up to 5 screenshots. Demo stores filenames/labels; prod stores Storage URLs. */
  screenshots: string[];
  /** Required demo video URL. Doubles as the card's visual, playing on hover. */
  demoVideo?: string;
  status: ListingStatus;
  version: string;
  /** Path to the uploaded App Package zip in storage. */
  packagePath?: string;
  /** Admin note left on review (reason for rejection, or approval note). */
  reviewNote?: string;
  salesCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface Purchase {
  id: string;
  buyerId: string;
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  sellerName: string;
  amountCents: number;
  /** Version the buyer downloaded; used to flag "update available". */
  purchasedVersion: string;
  stripeSessionId?: string;
  createdAt: number;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  sales: "Sales",
  marketing: "Marketing",
  finance: "Finance & accounting",
  operations: "Operations",
  people: "HR & people",
  design: "Design & creative",
  developers: "Developers",
  productivity: "Productivity",
  data: "Data & analytics",
  personal: "Personal & fun",
};

/** Shown under each category in the seller form so makers pick the right one. */
export const CATEGORY_HINTS: Record<Category, string> = {
  sales: "Outreach, CRM helpers, lead lists, quotes and pipelines",
  marketing: "Content, social, SEO, email and campaign tools",
  finance: "Invoices, expenses, bookkeeping and reporting",
  operations: "Files, workflows, scheduling and back-office admin",
  people: "Hiring, onboarding, time-off and team admin",
  design: "Images, video, mockups and brand assets",
  developers: "Code, automation and developer utilities",
  productivity: "Focus, notes, time tracking and getting things done",
  data: "Cleaning, converting, analysing and visualising data",
  personal: "Habits, hobbies, home and just-for-fun tools",
};

export const RUNTIME_LABELS: Record<Runtime, string> = {
  node: "Node.js",
  python: "Python",
  browser: "Browser",
  binary: "Desktop app",
  other: "Other",
};
