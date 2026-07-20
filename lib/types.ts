export type Role = "buyer" | "seller" | "admin";

export type ListingStatus = "draft" | "pending" | "approved" | "rejected";

export type Runtime = "node" | "python" | "browser" | "binary" | "other";

export type SetupMode = "one-command" | "ai-assisted";

/**
 * Categories are framed as the JOB the buyer is trying to do, not the kind of
 * software it is. Visitors arrive thinking "I need to fix a spreadsheet", not
 * "I need a data utility" — and these read the same whatever sector they're in.
 */
export type Category =
  | "spreadsheets"
  | "documents"
  | "images-video"
  | "files"
  | "writing"
  | "invoicing"
  | "repetitive-tasks"
  | "focus-time";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  /** Stripe Connect (Express) account id — set once the seller onboards. */
  stripeAccountId?: string;
  createdAt: number;
}

export interface Listing {
  id: string;
  slug: string;
  sellerId: string;
  sellerName: string;
  title: string;
  tagline: string;
  description: string;
  category: Category;
  /** Price in the smallest currency unit (cents). */
  priceCents: number;
  runtime: Runtime;
  setupMode: SetupMode;
  /** Emoji or short glyph used as a lightweight cover (keeps the demo asset-free). */
  glyph: string;
  /** Up to 5 screenshots. Demo stores filenames/labels; prod stores Storage URLs. */
  screenshots: string[];
  /** Required demo video (filename in demo, Storage URL in prod). */
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
  spreadsheets: "Spreadsheets & data",
  documents: "Documents & PDFs",
  "images-video": "Images & video",
  files: "Files & folders",
  writing: "Writing & notes",
  invoicing: "Invoicing & money",
  "repetitive-tasks": "Repetitive tasks",
  "focus-time": "Focus & time",
};

/** Shown under each category in the seller form so makers pick the right one. */
export const CATEGORY_HINTS: Record<Category, string> = {
  spreadsheets: "Clean, merge, convert or dedupe spreadsheets and exports",
  documents: "Create, split, merge or convert documents and PDFs",
  "images-video": "Resize, convert, compress, frame or batch-edit media",
  files: "Rename, sort, organise or back up files and folders",
  writing: "Drafting, transcripts, formatting and note-taking",
  invoicing: "Invoices, quotes, expenses and simple bookkeeping",
  "repetitive-tasks": "Automate or batch something you do over and over",
  "focus-time": "Time tracking, timers, blockers and habits",
};

export const RUNTIME_LABELS: Record<Runtime, string> = {
  node: "Node.js",
  python: "Python",
  browser: "Browser",
  binary: "Desktop app",
  other: "Other",
};
