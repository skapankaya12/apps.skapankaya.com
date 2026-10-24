import { getDesktopFeed } from "@/lib/desktop.server";

/**
 * The desktop's shelves and news, for pages other than the homepage: their
 * Spotlight and Notification Centre ask for it the first time either opens.
 * Public data only, the same the homepage prints into its HTML. Built
 * statically and refreshed every five minutes, like the homepage, so a busy
 * day costs one Firestore read per five minutes rather than one per visitor.
 */
export const dynamic = "force-static";
export const revalidate = 300;

export async function GET() {
  return Response.json(await getDesktopFeed());
}
