import { getWhatsNew } from "@/lib/whatsNew.server";

/**
 * The "new this week" popup's data. Public: approved listings and the public
 * half of their sellers, nothing the listing pages do not already show.
 *
 * Cached for five minutes like the homepage, and it reads nothing from the
 * request, so every visitor shares one copy rather than each one costing a
 * Firestore read.
 */
export const revalidate = 300;

export async function GET() {
  return Response.json({ items: await getWhatsNew() });
}
