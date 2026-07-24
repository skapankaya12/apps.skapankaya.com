import type { Listing, AppUser } from "./types";

/**
 * Seed data. This is what makes every flow demoable on first run without any
 * backend keys. When Firestore is wired (see lib/store.ts + FIREBASE_SETUP.md),
 * this becomes the one-time seeding payload rather than the live source.
 */

const now = Date.now();
const day = 86_400_000;

export const seedUsers: AppUser[] = [
  {
    uid: "u_admin",
    email: "admin@apps-marketplace.com",
    displayName: "Sevval (Admin)",
    role: "admin",
    createdAt: now - 90 * day,
  },
  {
    uid: "u_seller_maya",
    email: "maya@makers.dev",
    displayName: "Maya R.",
    role: "seller",
    stripeAccountId: "acct_demo_maya",
    createdAt: now - 40 * day,
  },
  {
    uid: "u_buyer",
    email: "you@example.com",
    displayName: "You",
    role: "buyer",
    createdAt: now - 5 * day,
  },
];

export const seedListings: Listing[] = [
  {
    id: "l_csvclean",
    slug: "csv-cleaner",
    sellerId: "u_admin",
    sellerName: "Sevval",
    title: "CSV Cleaner",
    tagline: "Dedupe, trim, and fix messy CSV exports in one command.",
    description:
      "Point it at any messy CSV and it removes duplicate rows, trims whitespace, normalizes headers, and fixes broken encodings. Runs fully offline, so your data never leaves your machine. Ideal for cleaning exports from old CRMs and spreadsheets before import.",
    category: "spreadsheets",
    priceCents: 1200,
    runtime: "node",
    setupMode: "one-command",
    screenshots: ["Before / after cleanup", "Duplicate report", "Settings"],
    demoVideo: "/demos/csv-cleaner.mp4",
    status: "approved",
    version: "1.2.0",
    salesCount: 34,
    createdAt: now - 38 * day,
    updatedAt: now - 6 * day,
  },
  {
    id: "l_invoicepdf",
    slug: "invoice-pdf-maker",
    sellerId: "u_admin",
    sellerName: "Sevval",
    title: "Invoice PDF Maker",
    tagline: "Turn a one-line command into a clean, branded invoice PDF.",
    description:
      "A tiny local tool that generates professional invoice PDFs from a simple config file. No subscriptions, no accounts, no cloud. Add your logo, set your tax rate, and run it. The PDF lands in your folder. Perfect for freelancers who hate invoicing SaaS.",
    category: "invoicing",
    priceCents: 1900,
    runtime: "node",
    setupMode: "ai-assisted",
    screenshots: ["Sample invoice", "Config file", "Logo & tax setup", "Output folder"],
    demoVideo: "/demos/invoice-maker.mp4",
    status: "approved",
    version: "2.0.1",
    salesCount: 21,
    createdAt: now - 30 * day,
    updatedAt: now - 3 * day,
  },
  {
    id: "l_screenshotkit",
    slug: "screenshot-framer",
    sellerId: "u_seller_maya",
    sellerName: "Maya R.",
    title: "Screenshot Framer",
    tagline: "Drop screenshots in, get beautiful device-framed images out.",
    description:
      "Watches a folder and automatically wraps any screenshot you drop in with a clean device frame and soft shadow, ready for your landing page or app store. Runs locally, processes in bulk, and never uploads your images anywhere.",
    category: "images-video",
    priceCents: 1500,
    runtime: "python",
    setupMode: "ai-assisted",
    screenshots: ["Framed result", "Watch folder", "Frame styles"],
    demoVideo: "/demos/screenshot-framer.mp4",
    status: "approved",
    version: "1.0.0",
    salesCount: 12,
    createdAt: now - 20 * day,
    updatedAt: now - 20 * day,
  },
  {
    id: "l_focusblocker",
    slug: "focus-blocker",
    sellerId: "u_seller_maya",
    sellerName: "Maya R.",
    title: "Focus Blocker",
    tagline: "A no-nonsense local website blocker you actually control.",
    description:
      "Blocks distracting sites during focus sessions by editing your local hosts file, with no browser extension, no account and no telemetry. Set your block list once, run it before deep work, and it cleans up after itself when the timer ends.",
    category: "focus-time",
    priceCents: 900,
    runtime: "node",
    setupMode: "one-command",
    screenshots: ["Focus session", "Block list", "Timer"],
    demoVideo: "/demos/focus-blocker.mp4",
    status: "approved",
    version: "1.1.0",
    salesCount: 8,
    createdAt: now - 14 * day,
    updatedAt: now - 9 * day,
  },
  {
    id: "l_renamer",
    slug: "bulk-renamer",
    sellerId: "u_seller_maya",
    sellerName: "Maya R.",
    title: "Bulk File Renamer",
    tagline: "Rename hundreds of files with patterns, safely and locally.",
    description:
      "Preview-first bulk renaming with find/replace, sequential numbering, and date stamping. Shows you exactly what will change before it touches anything. A pending submission awaiting review, included here to demo the admin queue.",
    category: "files",
    priceCents: 1100,
    runtime: "python",
    setupMode: "one-command",
    screenshots: [],
    status: "pending",
    version: "1.0.0",
    packagePath: "submissions/bulk-renamer-1.0.0.zip",
    salesCount: 0,
    createdAt: now - 1 * day,
    updatedAt: now - 1 * day,
  },
  {
    id: "l_habit",
    slug: "habit-grid",
    sellerId: "u_seller_maya",
    sellerName: "Maya R.",
    title: "Habit Grid",
    tagline: "A local, file-based habit tracker that lives in your terminal.",
    description:
      "Track habits from the command line with a printable year grid. Data stays in a plain text file you own. Second pending submission to show a review queue with more than one item.",
    category: "focus-time",
    priceCents: 700,
    runtime: "python",
    setupMode: "ai-assisted",
    screenshots: [],
    status: "pending",
    version: "0.9.0",
    packagePath: "submissions/habit-grid-0.9.0.zip",
    salesCount: 0,
    createdAt: now - 8 * 3600_000,
    updatedAt: now - 8 * 3600_000,
  },
];

/** One pre-existing purchase so "My Library" isn't empty on first run. */
export const seedPurchases = [
  {
    id: "p_seed1",
    buyerId: "u_buyer",
    listingId: "l_csvclean",
    listingSlug: "csv-cleaner",
    listingTitle: "CSV Cleaner",
    sellerName: "Sevval",
    amountCents: 1200,
    // Older than the listing's current version -> triggers "update available".
    purchasedVersion: "1.1.0",
    createdAt: now - 12 * day,
  },
];
