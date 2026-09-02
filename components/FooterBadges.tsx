/**
 * The "featured on" strip, under everything else in the footer.
 *
 * Its own row rather than a corner of the brand column, because this list only
 * grows: every directory, launch board and newsletter that picks the
 * marketplace up adds one, and a column that has to hold four of them stops
 * being a brand column. Down here the strip can take as many as it is given
 * without moving anything above it.
 *
 * Adding one is a line in BADGES and nothing else.
 *
 * Every badge is somebody else's asset on somebody else's host, which is worth
 * being deliberate about: if their server goes down the strip shows broken
 * images on every page of this site. That is how these badges are meant to be
 * used (the host counts the impressions), so it is the trade being made, not an
 * oversight. Copy one into public/ and point at it locally to opt out.
 */
type Badge = {
  /** Where the badge links, UTM parameters and all, exactly as the host gives it. */
  href: string;
  /** Their image, on their host. */
  src: string;
  alt: string;
  width: number;
  height: number;
};

const BADGES: Badge[] = [
  {
    href: "https://nicklaunches.com/products/the-solo-market/?utm_source=thesolomarket.com&utm_medium=badge&utm_campaign=featured",
    src: "https://nicklaunches.com/badges/featured.png",
    alt: "The Solo Market on Nick Launches",
    width: 244,
    height: 56,
  },
];

/**
 * Below this, there is nothing to scroll past.
 *
 * A marquee is a way of fitting more than the row holds, and it loops by
 * running two copies of the list end to end. With a single badge those two
 * copies are the same badge twice, sliding by forever, which reads as a page
 * padding itself out. So one badge sits still in the middle, and the movement
 * starts on its own the moment a second one is added.
 */
const MIN_TO_SCROLL = 2;

export function FooterBadges() {
  if (BADGES.length === 0) return null;

  const scrolls = BADGES.length >= MIN_TO_SCROLL;

  return (
    <div className="border-t border-[var(--border)]">
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <h4 className="text-center text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Featured on
        </h4>

        <div className="mt-5">
          {scrolls ? (
            // Two identical halves, and the animation travels exactly half the
            // track, so the second copy is under the cursor at the instant the
            // first one leaves. The duplicate is hidden from assistive tech:
            // it is the same list of links a second time.
            <div className="badge-marquee">
              <div className="badge-marquee-track">
                <BadgeRow />
                <BadgeRow duplicate />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <BadgeLinks />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One copy of the list. The trailing padding matches the gap, so both halves of
 * the track are exactly the same width and the loop has no seam.
 */
function BadgeRow({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div
      aria-hidden={duplicate}
      // inert as well as aria-hidden: the copy is only there to make the loop
      // seamless, and a link nobody can see should not be reachable by tab.
      inert={duplicate}
      className="flex shrink-0 items-center gap-10 pr-10"
    >
      <BadgeLinks />
    </div>
  );
}

function BadgeLinks() {
  return (
    <>
      {BADGES.map((badge) => (
        <a
          key={badge.href}
          href={badge.href}
          target="_blank"
          rel="noopener"
          className="inline-block shrink-0 opacity-90 transition hover:opacity-100"
        >
          {/* Plain <img> rather than next/image, matching every other remote
              image here: it is their asset on their host, and routing it
              through the optimizer would mean listing each of them in
              remotePatterns to cache a few KB. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badge.src}
            alt={badge.alt}
            width={badge.width}
            height={badge.height}
            loading="lazy"
            className="h-14 w-auto"
          />
        </a>
      ))}
    </>
  );
}
