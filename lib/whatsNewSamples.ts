import type { WhatsNewItem } from "./whatsNew";

/**
 * Stand-in listings for looking at the "new this week" popup locally, where
 * staging rarely has anything new. `?whatsnew=sample-4` in development only;
 * loaded on demand, so none of this reaches a production bundle.
 *
 * Invented tools and makers, never real ones. The images are the email step
 * illustrations, because they are already in public/.
 */
const SAMPLES: Omit<WhatsNewItem, "listedAt">[] = [
  {
    id: "sample-1",
    slug: "pdf-merger-pro",
    title: "PDF Merger Pro",
    tagline: "Combine, split and reorder PDFs offline, without uploading a page anywhere.",
    image: "/email/step-build.jpg",
    maker: { name: "Alex Rivera", xHandle: "alexbuilds" },
  },
  {
    id: "sample-2",
    slug: "invoice-stamp",
    title: "Invoice Stamp",
    tagline: "Turns a spreadsheet row into a clean invoice PDF in one click.",
    image: "/email/step-docs.jpg",
    maker: { name: "Mina Okafor" },
  },
  {
    id: "sample-3",
    slug: "clip-stash",
    title: "Clip Stash",
    tagline: "A clipboard history for Mac that never leaves your machine.",
    image: "/email/step-review.jpg",
    maker: { name: "Jonas Berg", xHandle: "jonasberg" },
  },
  {
    id: "sample-4",
    slug: "focus-jar",
    title: "Focus Jar",
    tagline: "A tiny timer that blocks the sites you asked it to, and nothing else.",
    maker: { name: "Priya Nair" },
  },
  {
    id: "sample-5",
    slug: "receipt-sorter",
    title: "Receipt Sorter",
    tagline: "Reads a folder of receipts and files them by month and vendor.",
    image: "/email/step-approved.jpg",
    maker: { name: "Tom Whitfield", xHandle: "tomw" },
  },
  {
    id: "sample-6",
    slug: "pixel-crop",
    title: "Pixel Crop",
    tagline: "Batch crops and resizes screenshots for app stores.",
    image: "/email/step-wall.jpg",
    maker: { name: "Lea Martin" },
  },
  {
    id: "sample-7",
    slug: "habit-grid",
    title: "Habit Grid",
    tagline: "A year of habits on one screen, stored in a plain file you own.",
    maker: { name: "Sam Cho" },
  },
];

export function sampleWhatsNew(count: number): WhatsNewItem[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const s = SAMPLES[i % SAMPLES.length];
    return { ...s, id: `${s.id}-${i}`, listedAt: now - i * 3_600_000 };
  });
}
