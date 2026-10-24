"use client";

import GlassFolder, { type FolderArt, type FolderFile } from "@/components/ui/glass-folder-cards";
import type { Aisle, AisleId, ShelfItem } from "@/lib/desktop";

/**
 * Artwork on the back panel of every aisle, one palette each, grouped loosely
 * by stage so neighbours on the desktop sit well together. Generated in the
 * browser by the folder component, so none of it is an image file.
 */
const ART: Record<AisleId, FolderArt> = {
  // Resources: a pale sky, the open web
  sites: { style: "streak", colors: ["#f7fbff", "#cfe6ff", "#7fb8f5", "#2b6cb8", "#9fd0ff", "#eef7ff"], scale: 0.7, warp: 1.4, angle: 0.3, gloss: 0.3, veins: 0 },
  // Idea: amber and brass, a light coming on
  idea: { style: "marble", colors: ["#140f06", "#4d3611", "#a77a2c", "#e7c56f", "#fff3d1"], scale: 0.72, warp: 3.2, angle: 0.6, gloss: 0.5, veins: 0.4 },
  // Build
  tools: { style: "streak", colors: ["#f2f5ff", "#a9c6ff", "#2f8bff", "#1b2350", "#5a5df2", "#c4b6ff", "#f6f3ff"], scale: 0.7, warp: 1.5, angle: -0.6, gloss: 0.22, veins: 0 },
  templates: { style: "marble", colors: ["#0e0a1c", "#2e2160", "#6a4bf0", "#b4a0ff", "#f1ecff"], scale: 0.75, warp: 3.4, angle: 1.2, gloss: 0.45, veins: 0.4 },
  plugins: { style: "streak", colors: ["#eafaf7", "#8fe0d2", "#1fa595", "#0b2e2a", "#3fc6b3", "#d6f5ef"], scale: 0.7, warp: 1.6, angle: 0.5, gloss: 0.25, veins: 0 },
  // moss and brass: the Landing page's green and gold
  free: "verdant",
  // Launch
  video: "ember",
  images: { style: "marble", colors: ["#1b0b12", "#5c1f36", "#c7506f", "#f4a3b8", "#fff0f4"], scale: 0.72, warp: 3.4, angle: -0.8, gloss: 0.5, veins: 0.45 },
  perks: { style: "streak", colors: ["#fff8e6", "#f0d48a", "#b8892b", "#3a2a0c", "#d9b25a", "#fff1c9"], scale: 0.7, warp: 1.5, angle: -0.4, gloss: 0.3, veins: 0 },
  // Grow: deep water blues
  reports: { style: "marble", colors: ["#06101e", "#12305a", "#2f6fb8", "#8cc3f0", "#eaf5ff"], scale: 0.74, warp: 3.3, angle: 2.4, gloss: 0.5, veins: 0.45 },
  // Hire: graphite and silver
  hire: "glacier",
};

type Props = {
  aisle: Aisle;
  /** What is on this aisle's shelf. The first four go in the folder as its files. */
  items: ShelfItem[];
  /** `icon` is the small desktop folder; `card` the full-size one in All aisles. */
  mode: "icon" | "card";
  width: number;
  /** Stagger for the entrance, when several assemble together. */
  delay?: number;
  onOpenAisle: (id: AisleId) => void;
  onItem: (item: ShelfItem) => void;
  /** Smoked glass on a dark wallpaper, milk glass on a light one. */
  tone?: "light" | "dark";
};

/**
 * An aisle as a glass folder (components/ui/glass-folder-cards.tsx).
 *
 * As a desktop icon it never opens in place: it is too small for its files to
 * be read, so hovering leans the glass and lifts the files, and clicking opens
 * the aisle in the Marketplace window. Its name sits underneath, outside the
 * folder, the way a desktop names its folders.
 *
 * As a card it behaves fully: click to open, and the aisle's items rise out of
 * it; choose one to see it in Quick Look. The ··· menu shows the aisle in the
 * Marketplace window.
 */
export function GlassAisle({ aisle, items, mode, width, delay = 0, onOpenAisle, onItem, tone = "light" }: Props) {
  // Pinned first, so the folder holds the ones that matter most.
  const shelf = items
    .filter((i) => i.aisle === aisle.id)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
    .slice(0, 4);
  const files: FolderFile[] = shelf.map((i) => ({ name: i.title, meta: i.price, image: i.image }));
  const art = ART[aisle.id];

  if (mode === "icon") {
    return (
      <GlassFolder
        className="sm-gf-icon"
        tone={tone}
        label={aisle.label}
        art={art}
        seed={aisle.id.length * 7}
        files={files}
        action="none"
        width={width}
        appearDelay={delay}
        open={false}
        onOpenChange={() => onOpenAisle(aisle.id)}
      />
    );
  }

  return (
    <GlassFolder
      className="sm-gf-card"
      tone={tone}
      label={aisle.label}
      meta={aisle.open ? undefined : "opening soon"}
      art={art}
      seed={aisle.id.length * 7}
      files={files}
      action="more"
      menu={[{ label: "Show in Marketplace", onSelect: () => onOpenAisle(aisle.id) }]}
      width={width}
      appearDelay={delay}
      onFileSelect={(_, index) => onItem(shelf[index])}
    />
  );
}
