import type { SellerProfile } from "@/lib/types";

/**
 * A seller's face, or their initial when they haven't uploaded one.
 *
 * The initial is the default rather than a placeholder silhouette on purpose:
 * most sellers here will never upload an avatar, and a tinted initial reads as
 * a deliberate mark where a grey person icon reads as something missing. Same
 * reasoning as components/Monogram.tsx, which does this for listings.
 *
 * Plain <img> rather than next/image, matching how listing screenshots are
 * rendered: these are Firebase Storage URLs, and next/image would need every
 * bucket added to remotePatterns before it would load one at all.
 */
export function SellerAvatar({
  seller,
  size = 44,
  className = "",
}: {
  seller: Pick<SellerProfile, "displayName" | "avatarUrl">;
  size?: number;
  className?: string;
}) {
  const initial = seller.displayName.trim().charAt(0).toUpperCase() || "?";
  const box = { width: size, height: size };

  if (seller.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={seller.avatarUrl}
        // Empty alt, not the seller's name: the name is always rendered as text
        // next to this, and announcing it twice is noise to a screen reader.
        alt=""
        style={box}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ ...box, fontSize: Math.round(size * 0.4) }}
      className={`grid shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-semibold text-[var(--accent)] ${className}`}
    >
      {initial}
    </span>
  );
}
