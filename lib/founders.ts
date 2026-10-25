/**
 * Founders who built alone and kept going: the people on the "Keep going"
 * wallpaper. Each line says only what that person's own website says, checked
 * on 24 October 2026, and the handles are the ones their sites link to. If a
 * line here ever stops being true, change it or take the card down.
 *
 * Photos are their public X profile pictures, fetched once into
 * public/founders/ so visitors load nothing from X. Re-fetch with:
 *
 *   curl -sL -o public/founders/<handle>.jpg "https://unavatar.io/x/<handle>?fallback=false"
 */
export type Founder = {
  name: string;
  /** Shown on its own under the row, with Sevval's note. One at a time. */
  pinned?: boolean;
  /** X handle, without the @. Also the photo's file name. */
  handle: string;
  /** One short line, from their own site. */
  built: string;
  linkedin?: string;
};

/** Sevval's own X handle, offered under the pinned founder. */
export const OWNER_X = "skpnky";

/** The note beside the pinned founder, in Sevval's words. */
export const PINNED_NOTE = "because he follows me on X, do you wanna follow me? 😛";

export const FOUNDERS: Founder[] = [
  // Pinned by Sevval on 24 October 2026. SuperX was built with a partner, so
  // the line says so; the row below is for people who built alone.
  { name: "Rob Hallam", handle: "robj3d3", built: "Built SuperX with Tibo Louis-Lucas", pinned: true },
  { name: "Pieter Levels", handle: "levelsio", built: "Builds startups by himself: Nomads.com, Photo AI" },
  { name: "Marc Lou", handle: "marclou", built: "Built 38 startups solo, ShipFast among them", linkedin: "https://www.linkedin.com/in/marclouvion" },
  { name: "Danny Postma", handle: "dannypostma", built: "Founder of HeadshotPro", linkedin: "https://www.linkedin.com/in/dannypostma" },
  { name: "Justin Welsh", handle: "thejustinwelsh", built: "Built a one-person business", linkedin: "https://www.linkedin.com/in/justinwelsh" },
  { name: "Daniel Vassallo", handle: "dvassallo", built: "Small Bets, and a run of small products" },
  { name: "Andrey Azimov", handle: "AndreyAzimov", built: "Sheet2Site and many small products" },
];
