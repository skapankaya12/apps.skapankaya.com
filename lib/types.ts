export type Role = "buyer" | "seller" | "admin";

export type ListingStatus = "draft" | "pending" | "approved" | "rejected";

export type Runtime = "node" | "python" | "browser" | "binary" | "other";

export type SetupMode = "one-command" | "ai-assisted";

/**
 * Categories are framed around the professional context / department a tool
 * serves ("Sales", "Marketing", "Finance"), not the kind of file it touches.
 * A buyer browses the way they think about their own work, and the same tool
 * makes sense whatever their industry.
 *
 * A category is a slug, not a closed union: the browse filters live in the
 * `categories` collection in Firestore, where an admin adds, renames and
 * removes them without a deploy. DEFAULT_CATEGORIES below is what every
 * surface falls back to until that collection has been written to, so a fresh
 * database still browses exactly as it did when this list was hard-coded.
 */
export type Category = string;

export interface CategoryDef {
  /** Slug, and the value stored on a listing's `category`. */
  id: Category;
  /** What buyers see on the browse chip and the listing badge. */
  label: string;
  /** Shown under the picker in the seller form, so makers pick the right one. */
  hint: string;
  /** Position among the chips. Ties break on label, so duplicates are harmless. */
  order: number;
  createdAt?: number;
  updatedAt?: number;
}

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
  /**
   * Still frame grabbed from the demo video at upload, used as its poster.
   *
   * Before this, the poster was the listing's first screenshot — which meant
   * replacing a demo left the old recording's frame sitting on the card until
   * someone hovered, because the screenshot is a different file nobody thought
   * to change. A poster cut from the video itself cannot disagree with it.
   *
   * Optional: listings from before this, and any demo whose first frame can't
   * be decoded, still fall back to the first screenshot.
   */
  posterImage?: string;
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

/**
 * The filters the marketplace ships with, and the fallback whenever the
 * `categories` collection is empty or unreachable — a build with no service
 * account, a signed-out first paint, a failed listener. An admin's first edit
 * writes this whole set to Firestore (see ensureCategoriesSeeded in store.ts)
 * and takes over from there.
 */
export const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: "sales", label: "Sales", hint: "Outreach, CRM helpers, lead lists, quotes and pipelines", order: 0 },
  { id: "marketing", label: "Marketing", hint: "Content, social, SEO, email and campaign tools", order: 1 },
  { id: "finance", label: "Finance & accounting", hint: "Invoices, expenses, bookkeeping and reporting", order: 2 },
  { id: "operations", label: "Operations", hint: "Files, workflows, scheduling and back-office admin", order: 3 },
  { id: "people", label: "HR & people", hint: "Hiring, onboarding, time-off and team admin", order: 4 },
  { id: "design", label: "Design & creative", hint: "Images, video, mockups and brand assets", order: 5 },
  { id: "developers", label: "Developers", hint: "Code, automation and developer utilities", order: 6 },
  { id: "productivity", label: "Productivity", hint: "Focus, notes, time tracking and getting things done", order: 7 },
  { id: "data", label: "Data & analytics", hint: "Cleaning, converting, analysing and visualising data", order: 8 },
  { id: "personal", label: "Personal & fun", hint: "Habits, hobbies, home and just-for-fun tools", order: 9 },
];

/** Chip order: the admin's `order`, then label so it never depends on doc ids. */
export function sortCategories(categories: CategoryDef[]): CategoryDef[] {
  return [...categories].sort(
    (a, b) => a.order - b.order || a.label.localeCompare(b.label)
  );
}

/**
 * A category's display label.
 *
 * Falls back to the slug read as words, because a listing keeps its category id
 * even if that filter is later renamed away or removed — better a badge saying
 * "Client outreach" than a blank one or a crash.
 */
export function categoryLabel(id: Category, categories: CategoryDef[]): string {
  return (
    categories.find((c) => c.id === id)?.label ??
    id.replace(/[-_]+/g, " ").replace(/^./, (ch) => ch.toUpperCase())
  );
}

/** A label an admin typed → the slug stored on listings. */
export function toCategoryId(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export const RUNTIME_LABELS: Record<Runtime, string> = {
  node: "Node.js",
  python: "Python",
  browser: "Browser",
  binary: "Desktop app",
  other: "Other",
};
