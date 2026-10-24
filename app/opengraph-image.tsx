import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { brand, copy } from "@/lib/brand";
import { AISLES } from "@/lib/desktop";

/**
 * The default social card for the whole site: the homepage as it looks, a
 * computer desktop. The Daily note wallpaper, the menu bar, one window holding
 * the pitch, folders down the right and the Dock along the bottom.
 *
 * The pitch is the hero copy from `copy`, read rather than written out again,
 * so rewriting the hero rewrites the card. Deliberately no pre-launch notice.
 *
 * The icons are the site's own, rendered to files in public/desktop-icons/ by
 * scripts/render-desktop-icons.tsx (Next does not allow react-dom/server in
 * the app), so the card shows exactly the artwork a visitor sees. Satori
 * draws only flexbox and a subset of CSS, so everything else is plain boxes.
 */
export const alt = `${brand.name}: ${brand.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function icon(name: string) {
  const file = await readFile(path.join(process.cwd(), "public", "desktop-icons", `${name}.svg`));
  return `data:image/svg+xml;base64,${file.toString("base64")}`;
}

const DOCK = ["market", "launchpad", "pages", "free", "video", "notes", "sell", "library", "saved"];

export default async function Image() {
  const folders = AISLES.slice(0, 8);
  const [dock, bin, folderArt] = await Promise.all([
    Promise.all(DOCK.map((g) => icon(`app-${g}`))),
    icon("bin"),
    Promise.all(folders.map((a) => icon(`folder-${a.id}`))),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
          backgroundImage:
            "radial-gradient(circle at 85% 0%, rgba(255, 210, 170, 0.95), rgba(255, 210, 170, 0) 55%), radial-gradient(circle at 5% 100%, rgba(150, 200, 255, 0.95), rgba(150, 200, 255, 0) 60%), linear-gradient(160deg, #eaf1ff 0%, #f6efe9 100%)",
        }}
      >
        {/* Menu bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 40,
            display: "flex",
            alignItems: "center",
            padding: "0 22px",
            gap: 26,
            fontSize: 19,
            color: "#1b1d23",
            background: "rgba(255, 255, 255, 0.45)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", width: 18, gap: 2 }}>
            {["#2f8bff", "#4b6bf6", "#5a5df2", "#6a4bf0"].map((c) => (
              <div key={c} style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            ))}
          </div>
          <div style={{ fontWeight: 700 }}>{brand.name}</div>
          <div>Aisles</div>
          <div>Go</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 26 }}>
            <div>Pre-launch</div>
            <div>{brand.domain}</div>
          </div>
        </div>

        {/* The window, holding the pitch */}
        <div
          style={{
            position: "absolute",
            top: 78,
            left: 56,
            width: 860,
            height: 380,
            display: "flex",
            flexDirection: "column",
            borderRadius: 18,
            background: "#ffffff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.12), 0 30px 70px rgba(0,0,0,0.22)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 52,
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "0 20px",
              background: "#f6f6f6",
              borderBottom: "1px solid #e4e4e8",
            }}
          >
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
            ))}
            <div style={{ marginLeft: 280, fontSize: 20, fontWeight: 700, color: "#1b1d23" }}>Marketplace</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", padding: "34px 44px" }}>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 40, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1.2, color: "#101014" }}>
              <div style={{ display: "flex" }}>{copy.heroHeadline}</div>
              <div style={{ display: "flex" }}>
                <span>{copy.heroByline.before}&nbsp;</span>
                <span style={{ backgroundImage: "linear-gradient(90deg, #2f8bff, #6a4bf0)", backgroundClip: "text", color: "transparent" }}>
                  {copy.heroByline.accent}
                </span>
                <span>&nbsp;{copy.heroByline.after}</span>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 22, fontSize: 27, color: "#5b5b66", lineHeight: 1.4 }}>
              <span>{copy.heroSub}&nbsp;</span>
              <span style={{ fontWeight: 700, backgroundImage: "linear-gradient(90deg, #2f8bff, #6a4bf0)", backgroundClip: "text", color: "transparent" }}>
                {copy.heroSubAccent}
              </span>
            </div>
          </div>
        </div>

        {/* Folders down the right */}
        <div style={{ position: "absolute", top: 64, right: 26, width: 220, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {folders.map((a, i) => (
            <div key={a.id} style={{ width: 104, height: 104, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={folderArt[i]} width={74} height={61} />
              <div style={{ fontSize: 15, color: "#1b1d23", textAlign: "center" }}>{a.label}</div>
            </div>
          ))}
        </div>

        {/* Dock */}
        <div
          style={{
            position: "absolute",
            bottom: 26,
            left: 150,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 12px",
            borderRadius: 30,
            background: "rgba(255, 255, 255, 0.5)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.8), 0 18px 40px rgba(0,0,0,0.18)",
          }}
        >
          {dock.map((src, i) => (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img key={DOCK[i]} src={src} width={84} height={84} />
          ))}
          <div style={{ width: 2, height: 60, background: "rgba(0,0,0,0.12)", margin: "0 4px" }} />
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={bin} width={84} height={84} />
        </div>
      </div>
    ),
    size,
  );
}
