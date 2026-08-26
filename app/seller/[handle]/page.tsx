import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import {
  resolveHandle,
  getSellerProfile,
  getListingsBySeller,
} from "@/lib/profiles.server";
import { safeHttpsUrl } from "@/lib/utils";
import { xProfileUrl } from "@/lib/xhandle";
import { Section } from "@/components/ui";
import { SellerAvatar } from "@/components/SellerAvatar";
import { JsonLd } from "@/components/JsonLd";
import { ListingCard } from "@/components/ListingCard";
import type { SellerProfile } from "@/lib/types";

/**
 * A seller's public page.
 *
 * The marketplace sells "a real person made this", and until now there was
 * nowhere that person existed as anything other than a name repeated on each of
 * their listings. This is also the page a maker can link to from their own
 * site, which during a seller-first launch is most of the distribution.
 *
 * Server-rendered like the listing pages, and for the same reason: the user
 * document is not readable from the client, and a crawler does not run JS.
 */
export const revalidate = 300;

/** Shared by the page and its metadata, so both agree on who this is. */
async function load(handleParam: string) {
  const handle = handleParam.toLowerCase();
  const owner = await resolveHandle(handle);
  if (!owner) return null;
  const profile = await getSellerProfile(owner.uid);
  if (!profile) return null;
  return { owner, profile, handle };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const found = await load(handle);
  if (!found) return { title: "Seller not found" };

  const { profile } = found;
  const description =
    profile.bio?.trim() ||
    `Tools by ${profile.displayName} on ${brand.name}. Buy once, own forever.`;

  return {
    title: profile.displayName,
    description,
    alternates: { canonical: `/seller/${profile.handle ?? found.handle}` },
    openGraph: {
      type: "profile",
      title: `${profile.displayName} · ${brand.name}`,
      description,
      url: `${brand.url}/seller/${profile.handle ?? found.handle}`,
    },
  };
}

export default async function SellerPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const found = await load(handle);
  if (!found) notFound();

  const { owner, profile } = found;

  // A retired handle still belongs to its owner, so an old bookmark lands on
  // the seller it always pointed at rather than a 404. Handles are never freed,
  // which is what makes this safe to follow.
  if (!owner.active && profile.handle && profile.handle !== handle.toLowerCase()) {
    redirect(`/seller/${profile.handle}`);
  }

  const listings = await getListingsBySeller(owner.uid);
  const website = safeHttpsUrl(profile.website);
  const xUrl = xProfileUrl(profile.xHandle);

  /*
   * Who this page is about, in machine-readable form.
   *
   * Every listing already publishes `author` as a Person whose url points here,
   * so this page was the one end of that edge that declared nothing at all. The
   * shared @id closes the loop: the author on a listing and the subject of this
   * page resolve to one entity rather than to two strangers with the same name.
   *
   * That edge is the marketplace's whole argument, stated in the only form a
   * search engine can follow: this tool was made by this identifiable person.
   *
   * `sameAs` carries only profiles the seller entered themselves, which is what
   * the property is for. Nothing here is inferred, and a seller who filled in
   * neither field simply has no sameAs.
   *
   * Anything on our own host is dropped. `sameAs` asserts that two URLs are the
   * same entity, so a seller who types thesolomarket.com into their website
   * field would otherwise have us publish that they and the marketplace are one
   * and the same. Their profile page is already `url`, which is the correct
   * property for it.
   */
  const canonicalHandle = profile.handle ?? handle.toLowerCase();
  const pageUrl = `${brand.url}/seller/${canonicalHandle}`;
  const ownHost = new URL(brand.url).host.replace(/^www\./, "");
  const sameAs = [website, xUrl].filter((u): u is string => {
    if (!u) return false;
    try {
      return new URL(u).host.replace(/^www\./, "") !== ownHost;
    } catch {
      return false;
    }
  });

  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${pageUrl}#person`,
    name: profile.displayName?.trim() || canonicalHandle,
    url: pageUrl,
    ...(profile.bio?.trim() ? { description: profile.bio.trim() } : {}),
    ...(profile.avatarUrl ? { image: profile.avatarUrl } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };

  const profilePageLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${pageUrl}#page`,
    url: pageUrl,
    name: `${profile.displayName?.trim() || canonicalHandle} on ${brand.name}`,
    mainEntity: { "@id": `${pageUrl}#person` },
    isPartOf: { "@id": `${brand.url}/#website` },
  };

  return (
    <Section className="py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <SellerAvatar seller={profile} size={80} />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">
            {profile.displayName}
          </h1>
          {profile.handle && (
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              @{profile.handle}
            </p>
          )}
          {profile.bio?.trim() && (
            <p className="mt-3 max-w-prose break-words text-[var(--muted)]">
              {profile.bio}
            </p>
          )}
          <SellerMeta profile={profile} toolCount={listings.length} />
          {(website || xUrl || profile.supportEmail) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                >
                  Website
                </a>
              )}
              {xUrl && (
                <a
                  href={xUrl}
                  target="_blank"
                  // nofollow like the website link beside it: an outbound link a
                  // seller types is theirs to choose, not ours to vouch for.
                  rel="noopener noreferrer nofollow"
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                >
                  @{profile.xHandle}
                </a>
              )}
              {profile.supportEmail && (
                <a
                  href={`mailto:${profile.supportEmail}`}
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:border-[var(--accent)]"
                >
                  Contact
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <h2 className="mt-12 text-lg font-semibold">
        {listings.length === 1 ? "1 tool" : `${listings.length} tools`}
      </h2>

      {listings.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] py-14 text-center">
          <p className="text-[var(--muted)]">Nothing on sale here yet.</p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      <JsonLd data={personLd} />
      <JsonLd data={profilePageLd} />
    </Section>
  );
}

/**
 * The one-line "who is this" strip.
 *
 * Deliberately thin: a join year and a tool count are facts the marketplace
 * already holds. Anything richer (ratings, follower counts, response times) is
 * a number somebody has to earn and somebody has to moderate.
 */
function SellerMeta({
  profile,
  toolCount,
}: {
  profile: SellerProfile;
  toolCount: number;
}) {
  const parts: string[] = [];
  if (profile.memberSince) {
    parts.push(`Selling since ${new Date(profile.memberSince).getFullYear()}`);
  }
  parts.push(toolCount === 1 ? "1 tool" : `${toolCount} tools`);
  return (
    <p className="mt-3 text-sm text-[var(--muted)]">{parts.join(" · ")}</p>
  );
}
