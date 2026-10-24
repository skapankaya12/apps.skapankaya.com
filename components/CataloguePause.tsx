/**
 * What the homepage and /marketplace show in place of the listings while
 * CATALOGUE_PAUSED is on. See lib/brand.ts.
 */
export function CataloguePause({ onHome = false }: { onHome?: boolean }) {
  return (
    <div
      id={onHome ? "apps" : undefined}
      className="scroll-mt-24 flex flex-col items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-6 py-10 text-center"
    >
      <MeltingIceCream className="h-40 w-auto sm:h-48" />
      <h2 className="mt-4 text-xl font-semibold tracking-tight">
        Listings are temporarily unavailable
      </h2>
      <p className="mt-2 max-w-2xl text-balance text-[var(--muted)]">
        Tool images and files aren&apos;t loading right now, so we&apos;ve
        hidden the listings until it&apos;s fixed. Nothing has been lost, and
        they&apos;ll be back soon.
      </p>
    </div>
  );
}

/** A cone in the logo's blue to violet, dripping into a puddle. Decorative. */
function MeltingIceCream({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 215" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="scoop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6aa8ff" />
          <stop offset="1" stopColor="#7b5cf2" />
        </linearGradient>
        <clipPath id="cone">
          <path d="M66 100 L134 100 L100 190 Z" />
        </clipPath>
      </defs>

      {/* Puddle */}
      <ellipse cx="104" cy="200" rx="62" ry="9" fill="url(#scoop)" opacity="0.35" />
      <ellipse cx="112" cy="199" rx="26" ry="5" fill="url(#scoop)" opacity="0.6" />

      {/* Cone, with its waffle */}
      <path d="M66 100 L134 100 L100 190 Z" fill="#ecc68f" />
      <g clipPath="url(#cone)" stroke="#d3a467" strokeWidth="2.5">
        {[-40, -20, 0, 20, 40, 60].map((o) => (
          <line key={`a${o}`} x1={60 + o} y1="95" x2={130 + o} y2="195" />
        ))}
        {[-40, -20, 0, 20, 40, 60].map((o) => (
          <line key={`b${o}`} x1={140 - o} y1="95" x2={70 - o} y2="195" />
        ))}
      </g>
      <path
        d="M66 100 L134 100 L100 190 Z"
        fill="none"
        stroke="#c9965a"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Scoop, dripping over the rim */}
      <path
        fill="url(#scoop)"
        d="M58 100 C52 70 75 42 100 42 C125 42 148 70 142 100
           C143 110 140 122 136 122 C132 122 131 112 130 106
           C126 110 120 110 117 106
           C114 112 112 142 108 142 C104 142 103 120 100 108
           C96 114 88 114 86 106
           C82 112 80 128 75 128 C70 128 69 114 66 106
           C62 108 58 106 58 100 Z"
      />
      {/* Shine */}
      <ellipse cx="82" cy="62" rx="11" ry="6" fill="#fff" opacity="0.35" transform="rotate(-30 82 62)" />
      {/* Sprinkles */}
      <g strokeLinecap="round" strokeWidth="3.5">
        <line x1="104" y1="56" x2="110" y2="53" stroke="#fff" />
        <line x1="122" y1="70" x2="124" y2="77" stroke="#ffd36e" />
        <line x1="92" y1="80" x2="98" y2="82" stroke="#ff8fb1" />
        <line x1="116" y1="90" x2="121" y2="86" stroke="#fff" />
        <line x1="74" y1="88" x2="76" y2="82" stroke="#ffd36e" />
      </g>

      {/* A drop on its way down */}
      <path
        d="M108 156 C111 162 113 166 113 169 A5 5 0 0 1 103 169 C103 166 105 162 108 156 Z"
        fill="url(#scoop)"
      />
    </svg>
  );
}
