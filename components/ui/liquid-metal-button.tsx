"use client";

import Link from "next/link";
import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A pill with an animated liquid-metal rim: the shader fills the whole button,
 * and a solid core sits 2px inside it, so only a shimmering edge shows.
 *
 * Adapted from the upstream component in four ways worth knowing:
 *
 *  - It is our colours, not black. The shader takes `u_colorBack` / `u_colorTint`
 *    as hex strings, so the rim is built from --accent and its tints, and the
 *    core is the accent gradient the site already uses for solid buttons.
 *  - It sizes to its content. Upstream hardcodes 142x46, which fits neither the
 *    nav item nor the form button; here the shader layer is inset-0 and the
 *    padding decides the size, so it drops into any slot.
 *  - The label lives inside the real <button>/<a>, not in a sibling layer with
 *    pointer-events disabled. That keeps the nav item a genuine anchor with
 *    genuine text — crawlable, selectable, and announced without an aria-label
 *    standing in for it. It also restores a focus ring; upstream sets
 *    `outline: none` with nothing in its place.
 *  - Cleanup actually runs. Upstream calls `shaderMount.destroy()`, but the
 *    method is `dispose()` — so the optional call silently no-ops and every
 *    unmount leaks a WebGL context and its animation loop.
 *
 * The library mounts its own IntersectionObserver and visibilitychange handler,
 * so the shader already pauses off-screen and in a background tab.
 *
 * The upstream 3D layering (perspective + translateZ on each layer) is dropped:
 * with no rotation anywhere it only scaled the layers by ~1-2%, which is not
 * visible, and it cost a stacking context per layer.
 */

/**
 * The shader wants colours as [r, g, b, a] in 0..1. The library ships a string
 * parser, but its uniform type only admits numbers, so convert here and stay
 * inside the types rather than casting past them.
 */
function rgba(hex: string, alpha = 1): number[] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
}

/** Rest, hover, and the kick on click. */
const SPEED = { rest: 0.6, hover: 1, press: 2.4 } as const;

const CANVAS_STYLE_ID = "liquid-metal-canvas-style";
const CANVAS_CSS = `
.liquid-metal-shader canvas {
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
}
@keyframes liquid-metal-ripple {
  from { transform: translate(-50%, -50%) scale(0); opacity: 0.55; }
  to   { transform: translate(-50%, -50%) scale(4); opacity: 0; }
}
`;

export interface LiquidMetalButtonProps {
  children: ReactNode;
  /** Render as a link instead of a button. */
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  /** Extra classes — use these for padding and text size at the call site. */
  className?: string;
}

export function LiquidMetalButton({
  children,
  href,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: LiquidMetalButtonProps) {
  const shaderRef = useRef<HTMLSpanElement>(null);
  const mountRef = useRef<ShaderMount | null>(null);
  const hoveredRef = useRef(false);
  const rippleId = useRef(0);
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>(
    []
  );
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!document.getElementById(CANVAS_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = CANVAS_STYLE_ID;
      style.textContent = CANVAS_CSS;
      document.head.appendChild(style);
    }

    const el = shaderRef.current;
    if (!el) return;

    let mount: ShaderMount;
    try {
      mount = new ShaderMount(
        el,
        liquidMetalFragmentShader,
        {
          // Ours. The rim reads as brushed indigo rather than chrome.
          u_colorBack: rgba("#4f46e5"),
          u_colorTint: rgba("#c7d2fe"),
          u_repetition: 4,
          u_softness: 0.5,
          u_shiftRed: 0.3,
          u_shiftBlue: 0.3,
          u_distortion: 0,
          u_contour: 0,
          u_angle: 45,
          u_scale: 8,
          u_shape: 1,
          u_offsetX: 0.1,
          u_offsetY: -0.1,
        },
        undefined,
        // Reduced motion still gets the metal, just held still.
        reduced ? 0 : SPEED.rest
      );
    } catch (error) {
      // No WebGL, or a driver that refused the shader. The core and the label
      // below render regardless, so the button stays a working button.
      console.error("Failed to mount liquid metal shader:", error);
      return;
    }

    mountRef.current = mount;
    return () => {
      mount.dispose();
      mountRef.current = null;
    };
  }, [reduced]);

  const setSpeed = (speed: number) => {
    if (!reduced) mountRef.current?.setSpeed(speed);
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    setSpeed(SPEED.press);
    window.setTimeout(
      () => setSpeed(hoveredRef.current ? SPEED.hover : SPEED.rest),
      300
    );

    if (!reduced) {
      const rect = e.currentTarget.getBoundingClientRect();
      const ripple = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        id: rippleId.current++,
      };
      setRipples((r) => [...r, ripple]);
      window.setTimeout(
        () => setRipples((r) => r.filter((x) => x.id !== ripple.id)),
        600
      );
    }

    onClick?.();
  };

  const shared = {
    onClick: handleClick,
    onMouseEnter: () => {
      hoveredRef.current = true;
      setSpeed(SPEED.hover);
    },
    onMouseLeave: () => {
      hoveredRef.current = false;
      setSpeed(SPEED.rest);
    },
    className: [
      "relative isolate inline-flex items-center justify-center overflow-hidden",
      "rounded-full text-sm font-medium text-[var(--accent-fg)]",
      "transition-transform active:translate-y-px",
      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    ].join(" "),
  };

  const layers = (
    <>
      {/* The shader fills the pill; the core covers all but a 2px rim. */}
      <span
        ref={shaderRef}
        aria-hidden
        className="liquid-metal-shader absolute inset-0 -z-10 rounded-full"
      />
      <span
        aria-hidden
        className="absolute inset-[2px] -z-10 rounded-full"
        style={{
          background: "linear-gradient(180deg, #5b52ea 0%, #4338ca 100%)",
        }}
      />
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute h-5 w-5 rounded-full"
          style={{
            left: r.x,
            top: r.y,
            background:
              "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)",
            animation: "liquid-metal-ripple 0.6s ease-out",
          }}
        />
      ))}
    </>
  );

  if (href) {
    return (
      <Link href={href} {...shared}>
        {layers}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} {...shared}>
      {layers}
    </button>
  );
}
