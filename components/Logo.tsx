/**
 * Brand mark: a shopping bag with four app tiles, echoing an app-store icon.
 * Pure SVG so it stays crisp at favicon size and scales for the header.
 * Gradient ids are suffixed so multiple instances on one page don't collide.
 */
export function Logo({
  size = 28,
  id = "hdr",
  className = "",
}: {
  size?: number;
  id?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="The Solo Market logo"
    >
      <defs>
        <linearGradient id={`bagFront-${id}`} x1="8" y1="8" x2="40" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2f8bff" />
          <stop offset="1" stopColor="#6a4bf0" />
        </linearGradient>
        <linearGradient id={`bagBack-${id}`} x1="30" y1="12" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f9a825" />
          <stop offset="1" stopColor="#f43f8e" />
        </linearGradient>
      </defs>

      {/* Back panel, peeking out on the right */}
      <path
        d="M20 15 L34 15 Q36 15 36.4 17 L39.4 40 Q39.8 43.2 36.4 43.2 L24 43.2 Q20.6 43.2 21 40 L23 17 Q23.2 15 20 15 Z"
        fill={`url(#bagBack-${id})`}
      />

      {/* Handle */}
      <path
        d="M16 16 C16 9.4 32 9.4 32 16"
        stroke={`url(#bagFront-${id})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Front bag */}
      <path
        d="M12 15 L32 15 Q34 15 34.4 17 L37 40 Q37.3 43.2 34 43.2 L10 43.2 Q6.7 43.2 7 40 L9.6 17 Q10 15 12 15 Z"
        fill={`url(#bagFront-${id})`}
      />

      {/* Four app tiles */}
      <rect x="13.5" y="22" width="7.5" height="7.5" rx="2.1" fill="#ef5138" />
      <rect x="23" y="22" width="7.5" height="7.5" rx="2.1" fill="#22c39a" />
      <rect x="13.5" y="31" width="7.5" height="7.5" rx="2.1" fill="#f7b70a" />
      <rect x="23" y="31" width="7.5" height="7.5" rx="2.1" fill="#b06cf0" />
    </svg>
  );
}
