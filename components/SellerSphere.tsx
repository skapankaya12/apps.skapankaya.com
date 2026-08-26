import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ImgSphere, type SphereNode } from "@/components/ui/img-sphere";
import type { SellerFace } from "@/lib/types";

/**
 * The sellers, as a slowly turning sphere of faces.
 *
 * This is a recruiting page, so what it has to say is "real people are already
 * here". That makes the fill order the whole design, because most sellers have
 * no photo and, early on, there are not many sellers:
 *
 *   1. a photo, when they uploaded one or pulled it from X
 *   2. their initial, when they didn't — still a real person, and the same
 *      reasoning as components/SellerAvatar.tsx, which prefers a tinted initial
 *      to a grey silhouette because most people never upload anything
 *   3. the brand mark, muted and small, for the empty space around them
 *
 * Tier 2 matters more than it looks. It means the sphere reads as people from
 * the first seller onwards, and every photo that gets added upgrades a node
 * without anybody deploying anything. Tier 3 is scenery: dimmed and weighted
 * smaller so it never competes with a real face, because a sphere of identical
 * logos pretending to be a crowd is exactly what a maker would see through.
 */

/** Enough nodes to read as a sphere rather than a scattering. */
const TARGET_NODES = 34;

/** Real faces are drawn larger than placeholders, whichever way it has turned. */
const WEIGHT_PHOTO = 1.15;
const WEIGHT_INITIAL = 1;
const WEIGHT_PLACEHOLDER = 0.7;

/**
 * A seller's initial, drawn as SVG rather than styled text.
 *
 * The sphere sizes every node in pixels and then scales it, so text set in
 * pixels would be right at one container width and wrong at every other. Text
 * inside a viewBox scales with the box for free.
 */
function InitialFace({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <svg
      viewBox="0 0 100 100"
      className="h-full w-full"
      role="img"
      aria-label={name}
    >
      <circle cx="50" cy="50" r="50" className="fill-[var(--accent-soft)]" />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="42"
        fontWeight="600"
        className="fill-[var(--accent)]"
      >
        {initial}
      </text>
    </svg>
  );
}

function PlaceholderFace({ index }: { index: number }) {
  return (
    <span
      aria-hidden
      className="grid h-full w-full place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] opacity-55"
    >
      {/* The id has to differ per instance: Logo suffixes its gradient ids for
          exactly this case, and thirty placeholders sharing one id would be
          thirty duplicate ids in the document. Size is a formality, since the
          CSS width and height override the SVG attributes. */}
      <Logo size={24} id={`sphere-${index}`} className="h-[58%] w-[58%]" />
    </span>
  );
}

function Face({ seller }: { seller: SellerFace }) {
  const face = seller.avatarUrl ? (
    // Plain <img>, matching SellerAvatar: these are Firebase Storage URLs and
    // next/image would need every bucket in remotePatterns to load one at all.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={seller.avatarUrl}
      alt={seller.displayName}
      draggable={false}
      className="h-full w-full rounded-full object-cover"
    />
  ) : (
    <InitialFace name={seller.displayName} />
  );

  // A claimed handle is what makes a face clickable. Sending people to our own
  // seller page rather than off to an external profile keeps the visit here,
  // and that page links onward to whatever the seller listed anyway.
  if (!seller.handle) {
    return <span className="block h-full w-full">{face}</span>;
  }
  return (
    <Link
      href={`/seller/${seller.handle}`}
      // Rounded so the focus ring traces the face rather than boxing it.
      className="block h-full w-full rounded-full outline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      title={seller.displayName}
    >
      {face}
    </Link>
  );
}

export function SellerSphere({
  sellers,
  className = "",
}: {
  sellers: SellerFace[];
  className?: string;
}) {
  const real: SphereNode[] = sellers.map((seller, i) => ({
    id: `seller-${seller.handle ?? i}`,
    weight: seller.avatarUrl ? WEIGHT_PHOTO : WEIGHT_INITIAL,
    node: <Face seller={seller} />,
  }));

  const fillers: SphereNode[] = Array.from(
    { length: Math.max(0, TARGET_NODES - real.length) },
    (_, i) => ({
      id: `spot-${i}`,
      weight: WEIGHT_PLACEHOLDER,
      node: <PlaceholderFace index={i} />,
    })
  );

  // Real sellers first: the sphere gives its early indices the larger weights
  // and the lattice spreads them apart, so faces end up distributed through the
  // placeholders rather than clustered on one side.
  return <ImgSphere nodes={[...real, ...fillers]} className={className} />;
}
