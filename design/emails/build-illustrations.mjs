// Builds the step images for the seller welcome email into public/email/.
//
//   node design/emails/build-illustrations.mjs
//
// Every step image is 720x480, shown at 180x120 on desktop and up to 360x240
// on phones (2x either way), JPEG, so mail clients never meet an SVG.
//
// All of them are Sevval's own illustrations, kept at full size in ./source/
// and only resized here. Drop a new PNG into ./source/ under the same name and
// re-run to replace one. A step with no source file falls back to a drawing
// below, made to match her style (light lavender ground, navy line work,
// small blue and violet spark marks) until she makes the real one.

import sharp from "sharp";
import { existsSync } from "node:fs";

const W = 720;
const H = 480;
const OUT = "public/email";
const SRC = new URL("./source/", import.meta.url).pathname;

const INK = "#1b1f45";

const ground = `
  <defs>
    <radialGradient id="blobL" cx="0" cy="0.72" r="0.55">
      <stop offset="0" stop-color="#b9c8fb" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#b9c8fb" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobR" cx="1" cy="0.05" r="0.6">
      <stop offset="0" stop-color="#a9bdfa" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#a9bdfa" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bubble" cx="0.5" cy="0.45" r="0.55">
      <stop offset="0.55" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dfe6fd"/>
    </radialGradient>
    <radialGradient id="dot" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#eef2ff"/>
      <stop offset="1" stop-color="#c9d4fb"/>
    </radialGradient>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M96 0H0V96" fill="none" stroke="#1b1f45" stroke-opacity="0.045" stroke-width="1.5"/>
    </pattern>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#6f86f0" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#fbfcff"/>
  <rect width="${W}" height="${H}" fill="url(#blobL)"/>
  <rect width="${W}" height="${H}" fill="url(#blobR)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>`;

const tick = (x1, y1, x2, y2, c) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`;

// 1. Get familiar with the marketplace: an open book in a bubble, like the
// bubbles on her builders wall picture.
const docs = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${ground}
  <circle cx="150" cy="120" r="22" fill="url(#dot)"/>
  <circle cx="598" cy="360" r="28" fill="url(#dot)"/>
  <circle cx="560" cy="120" r="14" fill="url(#dot)"/>
  <circle cx="132" cy="360" r="16" fill="url(#dot)"/>
  <g filter="url(#soft)"><circle cx="360" cy="242" r="170" fill="url(#bubble)"/></g>
  <g fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M360 196c-26-20-66-28-112-26v124c46-2 86 6 112 26z" fill="#ffffff"/>
    <path d="M360 196c26-20 66-28 112-26v124c-46-2-86 6-112 26z" fill="#ffffff"/>
    <path d="M360 196v124"/>
    <path d="M276 206c22 0 44 4 60 12M276 234c22 0 44 4 60 12M276 262c22 0 44 4 60 12" stroke-width="5" stroke-opacity="0.35"/>
    <path d="M384 218c16-8 38-12 60-12M384 246c16-8 38-12 60-12" stroke-width="5" stroke-opacity="0.35"/>
  </g>
  ${tick(478, 134, 490, 118, "#2f6bff")}
  ${tick(506, 150, 522, 142, "#6a4bf0")}
  ${tick(452, 124, 452, 106, "#aab9f7")}
  ${tick(232, 150, 220, 138, "#aab9f7")}
</svg>`;

const drawn = { "step-docs": docs };

for (const name of ["step-docs", "step-review", "step-wall", "step-build", "step-approved"]) {
  const src = `${SRC}${name}.png`;
  const input = existsSync(src) ? src : drawn[name] && Buffer.from(drawn[name]);
  if (!input) {
    console.warn(`no source or drawing for ${name}, skipped`);
    continue;
  }
  await sharp(input)
    .resize(W, H, { fit: "cover" })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(`${OUT}/${name}.jpg`);
  console.log(`${name}.jpg from ${existsSync(src) ? "source/" + name + ".png" : "drawing"}`);
}