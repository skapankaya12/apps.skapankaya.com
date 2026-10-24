/**
 * The groups the video prompts are sorted into, by what the video is for.
 * Shared by the /video-prompts page and the desktop, where each group is a
 * subfolder of the Video prompts aisle. Lives here rather than in the gallery
 * component so the server can read it too.
 */
export const VIDEO_GROUPS = [
  { id: "launch", label: "Launch films", blurb: "The short film for launch day." },
  { id: "demo", label: "Product demos", blurb: "Your real product UI, in motion." },
  { id: "app", label: "App previews", blurb: "Phone and desktop app previews for the stores and your site." },
  { id: "feature", label: "Feature announcements", blurb: "One new thing, shown well." },
  { id: "explainer", label: "Explainers", blurb: "What your product does and how it works." },
  { id: "brand", label: "Logo & brand reveals", blurb: "Logo intros, outros and brand films." },
  { id: "data", label: "Data & milestones", blurb: "Numbers that move: users, revenue, charts." },
  { id: "template", label: "Fill-in templates", blurb: "Prompts that ask about your product first, then build the video." },
  { id: "style", label: "Brand film styles", blurb: "Ten second films, one style each. Swap in your brand, copy and colours." },
] as const;
