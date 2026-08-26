export type Role = "buyer" | "seller" | "admin";

/**
 * `unlisted` is a seller taking their own tool off sale.
 *
 * Distinct from `rejected`, which is a decision about the tool, and from
 * `draft`, which never reached review. An unlisted listing keeps its package
 * and its purchase history: everyone who already bought it keeps downloading it
 * (see app/api/download), because "buy once, own forever" cannot depend on the
 * seller still wanting to sell. Relisting needs no new review, since nothing
 * about the reviewed package changed.
 */
export type ListingStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "unlisted";

/**
 * What a seller cannot change on a live listing without going back through
 * review.
 *
 * The dividing line is whether the change alters what the buyer receives.
 * A better description, a clearer screenshot or a different price are the
 * seller's to make, and forcing a live tool offline to fix a typo is how you
 * teach sellers not to fix typos. A different package is a different product.
 *
 * Enforced in firestore.rules, which is the control; requiresReReview() in
 * lib/store.ts reads the same list so the form can say which one is about to
 * happen before the seller presses Save.
 */
export const REVIEW_CRITICAL_FIELDS = [
  "packagePath",
  "runtime",
  "setupMode",
  "platform",
  "version",
] as const;

export type Runtime = "node" | "python" | "browser" | "binary" | "other";

/**
 * How a buyer gets the tool running.
 *
 * The first two describe running source you were handed. `installer` describes
 * a packaged native app: there is no command and no SETUP.md, you open it and
 * drag it to Applications. Added because a signed, notarized Mac app is a
 * perfectly good thing to sell here and the contract had no room for one.
 */
export type SetupMode = "one-command" | "ai-assisted" | "installer";

/**
 * Which operating systems a tool actually runs on.
 *
 * Only meaningful for `runtime: "binary"`. A script is portable because its
 * runtime is; a compiled app is not, and before this existed the listing page
 * published "Windows, macOS, Linux" for every desktop app, which for a Mac-only
 * DMG is an advertisement to buy something you cannot open.
 */
export type Platform = "macos" | "windows" | "linux" | "cross";

export const PLATFORM_LABELS: Record<Platform, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  cross: "Windows, macOS and Linux",
};

/**
 * The only installer format accepted today.
 *
 * Deliberately one: an installer is the one upload nobody can read, so it is
 * only worth accepting where the platform gives us something to check against.
 * Apple notarization does; there is no equivalent for a bare .exe. Widening
 * this means bringing a verification story with it.
 */
export const INSTALLER_EXTENSIONS = [".dmg"] as const;

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

  /* -------------------------------------------------------------------------
     Public seller identity.

     These used to live on every Listing, which meant a seller with three tools
     typed their bio three times and could not change it without sending all
     three back through review. They belong to the person, not the product.

     The listing still carries the old fields (see Listing.sellerBio and
     friends) and they are still read as a fallback, so listings written before
     this keep working. New writes go here.
  ------------------------------------------------------------------------- */

  /** Lowercase, unique. The {handle} in /seller/{handle}. See lib/handles.ts. */
  handle?: string;
  /** Epoch ms of the last handle change, which enforces the rename cooldown. */
  handleUpdatedAt?: number;
  /** A sentence about who they are, shown on the profile and every listing. */
  bio?: string;
  /** Published: where buyers reach them for help with a tool they bought. */
  supportEmail?: string;
  /** Their own site or profile. https only, validated with safeHttpsUrl. */
  website?: string;
  /** Public download URL. Absent means render the Monogram fallback. */
  avatarUrl?: string;

  /** Stripe Connect (Express) account id, set once the seller onboards. */
  stripeAccountId?: string;
  /** Synced from Stripe via webhook: whether payouts are set up and live. */
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  createdAt: number;
}

/**
 * The public half of a seller, as any visitor may see it.
 *
 * Deliberately spelled out rather than a Pick<AppUser, ...>: AppUser carries an
 * account email, a role and Stripe payout state, and none of that may ever
 * reach a listing page by accident. Writing the public shape by hand means
 * adding a private field to AppUser cannot silently publish it.
 *
 * Assembled on the server (lib/profiles.server.ts) because the Firestore rules
 * keep /users readable only by its owner and admins. Client components take it
 * as a prop; they cannot fetch it themselves.
 */
export interface SellerProfile {
  uid: string;
  /** Absent on sellers who signed up before handles existed. */
  handle?: string;
  displayName: string;
  bio?: string;
  supportEmail?: string;
  website?: string;
  avatarUrl?: string;
  /** Epoch ms of account creation, shown as "Selling since 2026". */
  memberSince: number;
}

/** How long a seller bio may run. A sentence or two, not a homepage. */
export const BIO_MAX = 280;

/**
 * One row of the admin console's users panel: the parts of an AppUser that the
 * server hands the client, flattened. Not a Firestore shape.
 */
export interface AdminUserRow {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: number;
  /** Sellers only: whether Stripe has cleared them to take money. */
  chargesEnabled?: boolean;
}

/**
 * What /api/admin/users answers with. `users` can be capped; `total` and
 * `counts` always describe the whole collection, so a capped list still says
 * how many accounts there really are and what they are.
 */
export interface AdminUserList {
  users: AdminUserRow[];
  total: number;
  counts: Record<Role, number>;
}

export interface Listing {
  id: string;
  slug: string;
  sellerId: string;
  sellerName: string;

  /* -------------------------------------------------------------------------
     Superseded by the seller's profile on AppUser. Read-only fallback.

     Every listing written before profiles existed carries its own copy of the
     seller's bio, contact and link, so these are still read when the profile
     has nothing to offer (see resolveSellerProfile in lib/profiles.server.ts).
     Nothing writes them any more, and the seller form no longer asks. Do not
     delete them: dropping the field would blank the About-the-seller block on
     every listing created before 26 August 2026.
  ------------------------------------------------------------------------- */

  /** @deprecated Use the seller's AppUser.bio. */
  sellerBio?: string;
  /** @deprecated Use the seller's AppUser.supportEmail. */
  sellerEmail?: string;
  /** @deprecated Use the seller's AppUser.website. */
  sellerWebsite?: string;
  title: string;
  tagline: string;
  description: string;
  category: Category;
  /** Price in the smallest currency unit (cents). */
  priceCents: number;
  runtime: Runtime;
  /**
   * Which systems it runs on. Only collected for `runtime: "binary"`, where it
   * cannot be inferred; absent on everything older and on portable runtimes,
   * which fall back to a per-runtime default.
   */
  platform?: Platform;
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
  /** Apple signature check, for `setupMode: "installer"` only. */
  packageVerification?: PackageVerification;
  /** Admin note left on review (reason for rejection, or approval note). */
  reviewNote?: string;
  salesCount: number;
  createdAt: number;
  updatedAt: number;
}

/* ---------------------------------------------------------------------------
   How long the short fields may be.

   These were typed as literal `maxLength` values in two places — the seller
   form and the admin edit form — which is fine until something else needs to
   respect them. URL import does: a fetched title is whatever the source wrote,
   and a silent browser truncation at 50 would cut it mid-word. Trimming has to
   happen where the text is produced, so the number has to be importable.
--------------------------------------------------------------------------- */

export const TITLE_MAX = 50;
export const TAGLINE_MAX = 90;

/**
 * The result of checking a native installer's Apple signature.
 *
 * Source packages are reviewed by reading them. An installer cannot be read, so
 * the check is what Apple already knows about it: a Developer ID signature and
 * a stapled notarization ticket. Written by scripts/verify-package.ts, which
 * has to run on macOS because codesign, spctl and stapler are macOS binaries.
 *
 * A pass means Apple found no known malware and the signature is intact. It is
 * not a statement that the app is good, and the buyer copy must not imply one.
 */
export interface PackageVerification {
  status: "pass" | "fail";
  /** Epoch ms. A verdict older than the current package is worthless. */
  checkedAt: number;
  /** The package path checked, so a later re-upload invalidates this result. */
  packagePath: string;
  /** Apple Developer Team ID from the signature. */
  teamId?: string;
  /** Leaf of the signing chain, e.g. "Developer ID Application: Acme (AB12CD)". */
  authority?: string;
  /** Why it failed, or anything worth the admin reading on a pass. */
  detail?: string;
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

/**
 * Setup-mode copy, as exhaustive maps rather than ternaries.
 *
 * There used to be two modes and four `mode === "one-command" ? a : b` reads
 * scattered across the seller form, the listing page and the admin console.
 * Adding a third would have quietly relabelled every installer as "AI-assisted"
 * with nothing failing. A Record keyed by the union makes the next addition a
 * compile error instead.
 */
export const SETUP_MODE_LABELS: Record<SetupMode, string> = {
  "one-command": "One command",
  "ai-assisted": "AI-assisted",
  installer: "Installer",
};

export const SETUP_MODE_HINTS: Record<SetupMode, string> = {
  "one-command": "Runs with a single terminal command.",
  "ai-assisted": "Buyer's AI assistant sets it up from SETUP.md.",
  installer: "Open it and drag it to Applications. No terminal.",
};

/** The same three, said to a buyer rather than a seller. */
export const SETUP_MODE_BUYER: Record<SetupMode, string> = {
  "one-command": "Runs with one command.",
  "ai-assisted": "Your AI assistant sets it up.",
  installer: "Install it like any other app.",
};

export const RUNTIME_LABELS: Record<Runtime, string> = {
  node: "Node.js",
  python: "Python",
  browser: "Browser",
  binary: "Desktop app",
  other: "Other",
};
