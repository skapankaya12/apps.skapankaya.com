import type { AisleId, ShelfItem } from "@/lib/desktop";

/** Each kind of window. One of each at most, which is all this desktop needs. */
export type WinKind = "market" | "look" | "web" | "waitlist" | "about" | "bin" | "suggest";

export type Win = {
  kind: WinKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min: boolean;
  max: boolean;
};

export type Look = "auto" | "light" | "dark";

/** Everything a menu, the dock or a folder can ask the desktop to do. */
export type DeskActions = {
  openAisle: (id: AisleId) => void;
  openItem: (item: ShelfItem) => void;
  openPage: (path: string) => void;
  open: (kind: WinKind) => void;
  close: (kind: WinKind) => void;
  minimise: (kind: WinKind) => void;
  zoom: (kind: WinKind) => void;
  focus: (kind: WinKind) => void;
  spotlight: () => void;
  launchpad: () => void;
};

export const WIN_TITLES: Record<WinKind, string> = {
  market: "Marketplace",
  look: "Quick Look",
  web: "Pages",
  waitlist: "Waitlist",
  about: "About The Solo Market",
  bin: "Subscriptions",
  suggest: "Suggest something",
};

/** Opens a window instead of navigating, unless the visitor asked for a new tab. */
export function intercept(e: React.MouseEvent, run: () => void) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  run();
}
