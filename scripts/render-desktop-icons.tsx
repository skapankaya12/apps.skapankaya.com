/**
 * Renders the desktop's icons to plain SVG files in public/desktop-icons/.
 *
 * The link preview (app/opengraph-image.tsx) draws the desktop with the same
 * artwork the site uses, but Next does not allow react-dom/server inside the
 * app, so the components are rendered here once instead and the preview reads
 * the files. Re-run after changing components/desktop/icons.tsx:
 *
 *   npx tsx scripts/render-desktop-icons.tsx
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { AISLES } from "../lib/desktop";
import { AppIcon, BinIcon, FolderIcon, type Glyph } from "../components/desktop/icons";

const out = path.join(process.cwd(), "public", "desktop-icons");
mkdirSync(out, { recursive: true });

const glyphs: Glyph[] = ["market", "launchpad", "pages", "free", "video", "notes", "blog", "library", "saved", "sell"];
const write = (name: string, markup: string) => {
  writeFileSync(path.join(out, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg"${markup.slice(4)}`);
  console.log(`desktop-icons/${name}.svg`);
};

for (const g of glyphs) write(`app-${g}`, renderToStaticMarkup(<AppIcon g={g} size={256} />));
write("bin", renderToStaticMarkup(<BinIcon size={256} />));
for (const a of AISLES) write(`folder-${a.id}`, renderToStaticMarkup(<FolderIcon glyph={a.glyph} size={256} />));
