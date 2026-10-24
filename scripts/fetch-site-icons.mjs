/**
 * Fetches each useful website's icon once into public/sites/<slug>.png, so
 * the desktop serves them itself and a visitor's browser never contacts
 * those sites (or an icon service) until they choose to visit one.
 *
 * Re-run after adding a site to lib/usefulSites.ts:
 *
 *   node scripts/fetch-site-icons.mjs
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const src = readFileSync("lib/usefulSites.ts", "utf8");
const sites = [...src.matchAll(/slug: "([^"]+)", name: "[^"]+", url: "([^"]+)"/g)].map((m) => ({ slug: m[1], url: m[2] }));
const out = path.join("public", "sites");
mkdirSync(out, { recursive: true });

for (const { slug, url } of sites) {
  const file = path.join(out, `${slug}.png`);
  if (existsSync(file) && !process.argv.includes("--force")) continue;
  const host = new URL(url).hostname;
  const res = await fetch(`https://www.google.com/s2/favicons?domain=${host}&sz=128`);
  if (!res.ok) {
    console.log(`skip ${slug}: ${res.status}`);
    continue;
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`sites/${slug}.png`);
}
