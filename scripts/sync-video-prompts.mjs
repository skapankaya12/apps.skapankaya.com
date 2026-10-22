// Refreshes the snapshot behind /video-prompts from its source repos.
//
//   node scripts/sync-video-prompts.mjs
//
// Writes lib/data/videoPrompts.json (the cards), one cleaned prompt per card
// in public/video-prompts/prompts/, and the stills in public/video-prompts/.
// All of it is committed, so the page never fetches GitHub at request time and
// a source going away cannot take the page down.
//
// The prompts are shown on our page, each with its author and source named on
// it. They are kept out of the card list and the page HTML, and loaded only
// when somebody opens one, so the page itself stays light and does not present
// other people's words as its own content to search engines (robots.ts keeps
// the prompt files out of the index for the same reason). Community prompts
// were written by people on X: the collector's MIT licence is not theirs to
// give, which is why each one leads with who wrote it and links back.

import { execFile } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LIST_REPO = "yihui-dev/awesome-opus5-5-videos";
const STYLES_REPO = "Vincentwei1021/mg-styles-15";
const TEMPLATES_REPO = "nexu-io/open-design";
const TEMPLATES_DIR = "prompt-templates/video";
const KIT_REPO = "lumian2015/opus-5-5-video-templates";
const STYLES_SHOWCASE = "https://vincentwei1021.github.io/mg-styles-15/";
const PROMPTS_DIR = path.join(ROOT, "public/video-prompts/prompts");
const raw = (repo, file) => `https://raw.githubusercontent.com/${repo}/main/${file}`;
const blob = (repo, file) => `https://github.com/${repo}/blob/main/${file}`;
const repoUrl = (repo) => `https://github.com/${repo}`;

// Names as the styles repo's own README gives them.
const STYLE_NAMES = {
  "01-flat-vector": "Flat Vector",
  "02-line-art": "Line Art",
  "03-isometric": "Isometric 2.5D",
  "04-3d-render": "3D Render",
  "05-cel-boil": "Frame-by-Frame / Line Boil",
  "07-liquid": "Liquid Motion",
  "08-morph": "Shape Morph",
  "12-aurora-glass": "Aurora & Glassmorphism",
};

// The page is for product videos only, so every source is filtered to a
// hand-picked list, and each pick names the menu group it is listed under.
// Anything new upstream stays out until someone reads it and adds it here.
const picks = JSON.parse(await readFile(path.join(ROOT, "scripts/video-prompts-picks.json"), "utf8"));

// Community clips were looked up once and saved, since finding them means
// reading another site's pages. See the file's note.
const { clips } = JSON.parse(await readFile(path.join(ROOT, "scripts/video-prompts-clips.json"), "utf8"));

// Community prompts too thin to make a video from, or naming the creator's own
// product, rewritten by hand into full briefs. The original is kept beside the
// rewrite and shown under it, credited. See the file's note.
const { prompts: rewrites } = JSON.parse(await readFile(path.join(ROOT, "scripts/video-prompts-rewrites.json"), "utf8"));

// The snapshot ends up in href and src attributes, so anything that is not the
// exact shape we expect is dropped rather than rendered.
const okPost = (u) => typeof u === "string" && /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+$/.test(u);
const okPoster = (u) => typeof u === "string" && /^https:\/\/media\.skillry\.dev\/[\w./-]+\.webp$/.test(u);
const okHeygenVideo = (u) => typeof u === "string" && /^https:\/\/static\.heygen\.ai\/[\w./-]+\.mp4$/.test(u);
const okHeygenImage = (u) => typeof u === "string" && /^https:\/\/static\.heygen\.ai\/[\w./-]+\.(png|jpe?g|webp)$/.test(u);
const okClip = (u) => typeof u === "string" && /^https:\/\/media\.skillry\.dev\/[\w./-]+\.mp4$/.test(u);
const okSlug = (s) => typeof s === "string" && /^[a-z0-9-]{1,80}$/.test(s);
const okTags = (tags) => (tags ?? []).filter((t) => /^[a-z0-9-]{1,20}$/.test(t)).slice(0, 4);

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

// One still at card size is all the grid needs; the full piece plays at its
// source. Stored rather than hotlinked for the two sources whose licence
// covers the image itself.
async function still(url, file) {
  const buf = Buffer.from(await (await get(url)).arrayBuffer());
  const out = path.join(ROOT, "public/video-prompts", file);
  await mkdir(path.dirname(out), { recursive: true });
  await sharp(buf, { animated: false })
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 74 })
    .toFile(out);
  return `/video-prompts/${file}`;
}

const run = promisify(execFile);
const exists = (f) => access(f).then(() => true, () => false);

/**
 * A short, small, silent preview cut from a source film: six seconds at 480px
 * wide, from `start` seconds in. The style films run to 38MB each, and a card
 * that plays on hover only needs to show what the video looks like. Needs
 * ffmpeg. Skipped when the preview already exists, so a re-sync does not
 * download every film again; delete the file to cut it afresh.
 */
async function preview(url, file, start = 0) {
  const out = path.join(ROOT, "public/video-prompts", file);
  const href = `/video-prompts/${file}`;
  if (await exists(out)) return href;
  await mkdir(path.dirname(out), { recursive: true });
  const src = path.join(os.tmpdir(), `vp-${path.basename(file)}.src`);
  await writeFile(src, Buffer.from(await (await get(url)).arrayBuffer()));
  await run("ffmpeg", [
    "-y", "-loglevel", "error", "-ss", String(start), "-i", src, "-t", "6", "-an",
    "-vf", "scale=480:-2", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ]);
  await rm(src, { force: true });
  return href;
}

/** A card still taken from a film, for sources that publish no image. */
async function frame(url, file, at) {
  const out = path.join(ROOT, "public/video-prompts", file);
  const href = `/video-prompts/${file}`;
  if (await exists(out)) return href;
  await mkdir(path.dirname(out), { recursive: true });
  const png = path.join(os.tmpdir(), `vp-${path.basename(file)}.png`);
  await run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(at), "-i", url, "-frames:v", "1", png]);
  await sharp(png).resize({ width: 640, withoutEnlargement: true }).webp({ quality: 74 }).toFile(out);
  await rm(png, { force: true });
  return href;
}

const ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&#39;": "'" };

/**
 * A prompt as people paste it into X is not quite a prompt you can paste into
 * an agent. This tidies what is mechanical and leaves the wording alone:
 * stray HTML entities, "http:// site.com" split by X's link handling, t.co
 * short links that lead nowhere once copied, trailing hashtags, and runs of
 * blank lines. "Prompt 2:" and "Follow-up:" lines start a new step, because
 * they were sent as separate messages and pasting them as one changes what the
 * agent is asked to do.
 */
function cleanPrompt(text) {
  let t = String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/&(lt|gt|amp|quot|#39);/g, (m) => ENTITIES[m])
    .replace(/(https?:\/\/)\s+(?=\S)/g, "$1")
    .replace(/\s*https:\/\/t\.co\/\w+/g, "")
    .replace(/(\s#[\p{L}\p{N}_]+)+\s*$/u, "")
    .replace(/[ \t]+\n/g, "\n")
    // Re-join sentences hard-wrapped at a fixed width. A line that stops
    // mid-sentence and a next line that carries on in lower case are one line;
    // list items, headings and finished sentences are left where they are.
    .replace(/([^\n.:!?;。！？])\n[ \t]*(?=[a-z(])/g, "$1 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const steps = [];
  let label = "Prompt";
  let buf = [];
  for (const line of t.split("\n")) {
    const m = line.match(/^\s*(prompt\s*\d+|follow-?up(?:\s*\d+)?)\s*[:：]\s*(.*)$/i);
    if (m && buf.join("").trim()) {
      steps.push({ label, text: buf.join("\n").trim() });
      label = /follow/i.test(m[1]) ? "Follow-up" : `Prompt ${m[1].match(/\d+/)?.[0] ?? ""}`.trim();
      buf = [m[2]];
    } else {
      buf.push(line);
    }
  }
  steps.push({ label, text: buf.join("\n").trim() });
  if (steps.length > 1 && steps[0].label === "Prompt") steps[0].label = "Prompt 1";
  return steps.filter((s) => s.text);
}

// The style repo's prompt files open with a how-to in Chinese; the prompt
// itself is the fenced block under the "提示词" (prompt) heading.
function stylePrompt(md) {
  const m = md.match(/##\s*(?:提示词|Prompt)\s*\n+```[a-z]*\n([\s\S]*?)\n```/);
  if (!m) throw new Error("style prompt block not found");
  return m[1];
}

const items = [];
const prompts = new Map();
let dropped = 0;

const videos = await (await get(raw(LIST_REPO, "data/videos.json"))).json();
for (const v of videos) {
  const group = picks.list[v.slug];
  // A card without a video to show is left out: the page is for seeing what a
  // prompt makes before you use it.
  if (!group || v.prompt_partial || !okClip(clips[v.slug])) continue;
  if (!okSlug(v.slug) || !okPost(v.post_url) || !okPoster(v.poster_url)) {
    dropped++;
    continue;
  }
  const author = `@${String(v.author).slice(0, 40)}`;
  const id = `list-${v.slug}`;
  items.push({
    id,
    group,
    title: author,
    href: v.post_url,
    image: v.poster_url,
    video: clips[v.slug],
    tags: okTags(v.tech_tags),
  });
  const rewrite = rewrites[v.slug];
  prompts.set(id, {
    ...(rewrite
      ? {
          steps: rewrite.map((text, i) => ({
            label: rewrite.length > 1 ? `Prompt ${i + 1}` : "Prompt",
            text,
          })),
          original: cleanPrompt(v.prompt),
        }
      : { steps: cleanPrompt(v.prompt) }),
    credit: {
      by: author,
      byUrl: v.post_url,
      note: rewrite
        ? "Rewritten by us into a full brief for any product; their original is below."
        : "Shared on X.",
      source: "Awesome Opus 5.5 Videos",
      sourceUrl: repoUrl(LIST_REPO),
    },
  });
}

for (const [slug, group] of Object.entries(picks.styles)) {
  const id = `style-${slug}`;
  items.push({
    id,
    group,
    title: STYLE_NAMES[slug],
    href: `${STYLES_SHOWCASE}#${slug}`,
    image: await still(raw(STYLES_REPO, `docs/readme/films/${slug}.webp`), `styles/${slug}.webp`),
    video: await preview(raw(STYLES_REPO, `videos/${slug}.mp4`), `styles/${slug}.mp4`),
    tags: [],
  });
  const md = await (await get(raw(STYLES_REPO, `prompts/${slug}.md`))).text();
  prompts.set(id, {
    steps: cleanPrompt(stylePrompt(md)),
    credit: {
      by: "Vincentwei1021",
      byUrl: repoUrl(STYLES_REPO),
      note: "MIT licence.",
      source: "15 Motion Design Styles",
      sourceUrl: blob(STYLES_REPO, `prompts/${slug}.md`),
    },
  });
}

for (const [slug, group] of Object.entries(picks.templates)) {
  const file = `${TEMPLATES_DIR}/${slug}.json`;
  const t = await (await get(raw(TEMPLATES_REPO, file))).json();
  if (
    !okSlug(t.id) ||
    t.id !== slug ||
    !okHeygenImage(t.previewImageUrl) ||
    !okHeygenVideo(t.previewVideoUrl) ||
    t.source?.license !== "Apache-2.0"
  ) {
    dropped++;
    continue;
  }
  const id = `template-${slug}`;
  items.push({
    id,
    group,
    // Dashes become colons: site copy carries no em or en dashes.
    title: String(t.title)
      .replace(/^HyperFrames(?: HTML-in-Canvas)?:\s*/, "")
      .replace(/\s+[—–]\s+/g, ": ")
      .slice(0, 80),
    href: blob(TEMPLATES_REPO, file),
    image: await still(t.previewImageUrl, `templates/${slug}.webp`),
    video: await preview(t.previewVideoUrl, `templates/${slug}.mp4`),
    tags: [t.aspect === "9:16" ? "vertical" : "", "hyperframes"].filter(Boolean),
  });
  prompts.set(id, {
    steps: cleanPrompt(t.prompt),
    credit: {
      by: "HeyGen HyperFrames",
      byUrl: repoUrl("heygen-com/hyperframes"),
      note: "Apache-2.0 licence.",
      source: "open-design",
      sourceUrl: blob(TEMPLATES_REPO, file),
    },
  });
}

// The fill-in kit: thirty HyperFrames templates whose copy and colours are all
// variables, so a rebrand is a list of values. Each template.json names its
// scenes, its variables and the post it was remade from, which is what the
// prompt below is written from. The catalog adds the kind and whether the
// template needs photos.
const catalog = await (await get(raw(KIT_REPO, "catalog.md"))).text();
const kitRows = new Map(
  [...catalog.matchAll(/^\| \d+ \| `([\w-]+)` \| \*\*(.+?)\*\* — .+? \| (.+?) \| [\d.]+s \| ([\d:]+) \| .+? \| (.+?) \| \[watch\]\((https:\/\/cdn\.claudeimagine\.com\/[\w./-]+\.mp4)\) \|$/gm)]
    .map((m) => [m[1], { name: m[2], kind: m[3], format: m[4], photos: m[5], video: m[6] }])
);
const block = (...parts) => parts.filter(Boolean).join("\n\n");
// We assemble these briefs ourselves, so they follow site copy: no em or en dashes.
const undash = (s) => String(s).replace(/\s*[—–]\s*/g, ", ");
const FORMAT_WORDS = { "16:9": "16:9 at 1920x1080", "9:16": "vertical 9:16 at 1080x1920", "1:1": "square 1:1 at 1080x1080" };

for (const [slug, group] of Object.entries(picks.kit)) {
  const row = kitRows.get(slug);
  const t = await (await get(raw(KIT_REPO, `templates/${slug}/template.json`))).json();
  // A few templates list no scenes and spell their beats out in the title
  // instead ("Problem → reframe → proof → name → claim → mark: ...").
  const scenes = Array.isArray(t.scenes)
    ? t.scenes
    : String(t.title ?? "").split(":")[0].split("→").map((b) => b.trim()).filter(Boolean).map((b) => b[0].toUpperCase() + b.slice(1));
  if (!row || t.id !== slug || !okSlug(slug) || scenes.length < 2) {
    dropped++;
    continue;
  }
  const id = `kit-${slug}`;
  const at = Math.round(t.duration * 0.25 * 10) / 10;
  items.push({
    id,
    group,
    title: row.name,
    href: row.video,
    image: await frame(row.video, `kit/${slug}.webp`, at + 1),
    video: await preview(row.video, `kit/${slug}.mp4`, at),
    tags: [row.format === "9:16" ? "vertical" : row.format === "1:1" ? "square" : "", "hyperframes"].filter(Boolean),
  });
  const dir = "~/.claude/skills/opus-5-5-video-templates";
  const photos = row.photos.startsWith("yes")
    ? ` It uses ${row.photos.replace(/^yes,\s*/, "")} photos: ask me for my own, or for permission to keep the demo images.`
    : "";
  const brief = block(
    `Make a ${t.duration}-second ${row.kind.toLowerCase()} for [your product], ${FORMAT_WORDS[row.format] ?? row.format}, from the "${slug}" template in ${KIT_REPO} (MIT, rendered with HyperFrames).`,
    `Setup: clone https://github.com/${KIT_REPO} into ${dir}, then run \`npx hyperframes@0.8.96 doctor\` and fix anything it reports (it needs Node.js 22 or newer, FFmpeg and Chrome).`,
    "The film, scene by scene:\n" + scenes.map((s, i) => `${i + 1}. ${undash(s)}`).join("\n"),
    `Before you change anything, learn [your product] from [your product URL] and ask me only for what you cannot find: its name, what it does in one line, the copy each scene needs, and two or three brand colours as #rrggbb.${photos} The demo brand, names, prices, numbers, ratings and quotes are placeholders: replace every one with something true for my product, or remove it. Never ship a made-up number or testimonial.`,
    [
      "Then:",
      `1. \`node ${dir}/scripts/new-video.mjs ${slug} my-video\``,
      `2. \`node ${dir}/scripts/vars.mjs my-video\` to list the variables.`,
      "3. Write values.json, keeping each value close to its default's length and format (the same number of |-separated items, plain numbers where the default is a number), then apply it with `node " + dir + "/scripts/vars.mjs my-video values.json`.",
      `4. \`cd my-video && npx hyperframes@0.8.96 snapshot --at ${[1, Math.round(t.duration / 3), Math.round((2 * t.duration) / 3), Math.floor(t.duration - 1)].join(",")}\`, look at every frame, and fix any text that overflows or any colour that is hard to read.`,
      "5. `npx hyperframes@0.8.96 render -f 60 -q high -w 4 -o out.mp4`, then watch it through once before you hand it over.",
    ].join("\n"),
    typeof t.notes === "string" ? `Template notes: ${undash(t.notes)}` : ""
  );
  prompts.set(id, {
    steps: [{ label: "Prompt", text: brief }],
    credit: {
      by: "Claude Imagine",
      byUrl: repoUrl(KIT_REPO),
      note: `MIT licence. Remade from a post by ${t.source?.author ?? "its original creator"}.`,
      source: "Opus 5.5 Video Templates",
      sourceUrl: blob(KIT_REPO, `templates/${slug}/template.json`),
    },
  });
}

// Rewritten from scratch each run, so a prompt dropped from the picks does not
// linger as a file nothing links to.
await rm(PROMPTS_DIR, { recursive: true, force: true });
await mkdir(PROMPTS_DIR, { recursive: true });
for (const [id, p] of prompts) {
  await writeFile(path.join(PROMPTS_DIR, `${id}.json`), JSON.stringify(p) + "\n");
}

// The kit's templates lead their group: they are the most ready to use, since
// every value in them is already a variable to fill in.
items.sort((a, b) => Number(!a.id.startsWith("kit-")) - Number(!b.id.startsWith("kit-")));

const snapshot = {
  syncedAt: new Date().toISOString().slice(0, 10),
  sources: {
    list: { name: "Awesome Opus 5.5 Videos", url: repoUrl(LIST_REPO) },
    style: { name: "15 Motion Design Styles", url: repoUrl(STYLES_REPO) },
    template: { name: "open-design", url: repoUrl(TEMPLATES_REPO), credit: "HeyGen HyperFrames" },
    kit: { name: "Opus 5.5 Video Templates", url: repoUrl(KIT_REPO) },
  },
  items,
};
await mkdir(path.join(ROOT, "lib/data"), { recursive: true });
await writeFile(path.join(ROOT, "lib/data/videoPrompts.json"), JSON.stringify(snapshot) + "\n");
console.log(`${items.length} items, ${prompts.size} prompts (${dropped} dropped)`);
