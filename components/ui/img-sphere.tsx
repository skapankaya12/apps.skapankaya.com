"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * A drift of round nodes arranged on a sphere, draggable and slowly rotating.
 *
 * Adapted from the upstream SphereImageGrid in five ways worth knowing, each
 * one because of something this site needs that the original didn't:
 *
 *  - Positions are deterministic. Upstream jitters every position with
 *    Math.random(), which forces the whole thing to be client-only: it renders
 *    a grey "Loading..." box until mount and reshuffles on every remount. This
 *    is going on a marketing hero, so the sphere has to be in the server HTML,
 *    both for what a visitor sees first and for what a crawler sees at all. A
 *    Fibonacci lattice is already evenly spaced without the jitter.
 *
 *  - Rotation never touches React state. Upstream calls setState twice per
 *    frame, so the entire node list re-renders sixty times a second. Here the
 *    angles live in a ref and the loop writes transforms straight onto the DOM
 *    nodes, so React renders the list once and then stays out of the way.
 *
 *  - No per-frame collision pass. Upstream compares every node against every
 *    other one each frame and shrinks whatever overlaps, which is O(n^2) work
 *    to produce a visible jitter as nodes pass each other. Scaling and fading
 *    by depth separates them the way the eye already expects, and the lattice
 *    handles the rest.
 *
 *  - It holds nodes, not image URLs, so a caller can put a photo, a monogram or
 *    a placeholder in any slot. That matters here: most sellers have no photo,
 *    and their initial is a better placeholder than a stock silhouette.
 *
 *  - It stops when it isn't being watched, and when it's been asked to. An
 *    IntersectionObserver pauses the loop off-screen and prefers-reduced-motion
 *    turns the drift off entirely, leaving a still sphere that still drags.
 *    Same reasoning as components/ui/liquid-metal-button.tsx.
 */

export interface SphereNode {
  id: string;
  /**
   * Size multiplier for this node, 1 being the base. The caller uses it to
   * rank: on /sell a real photo outranks a placeholder, and staying bigger
   * through every rotation is what keeps the sphere reading as people.
   */
  weight?: number;
  /**
   * Shown on hover and on keyboard focus. A node without one is scenery: it
   * gets no label, and hovering it does not stop the sphere.
   */
  label?: string;
  node: ReactNode;
}

export interface ImgSphereProps {
  nodes: SphereNode[];
  /**
   * Width the server renders at, in pixels. After mount the real width is
   * measured and everything rescales, so this only has to be a reasonable
   * guess: it decides the first frame, not the final layout.
   */
  size?: number;
  /** Node diameter as a fraction of the container's width. */
  baseScale?: number;
  /** Sphere radius as a fraction of half the container's width. */
  radiusRatio?: number;
  /** Degrees per frame of unattended drift. */
  autoRotateSpeed?: number;
  className?: string;
}

/** The golden angle, which is what makes a Fibonacci lattice evenly spaced. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const DRAG_SENSITIVITY = 0.35;
const MOMENTUM_DECAY = 0.94;
/** Past this, a flick would spin the sphere faster than the eye can follow. */
const MAX_SPEED = 6;
/** How far the pitch may travel, so the sphere never rolls onto its head. */
const MAX_PITCH = 38;

/**
 * The arrangement the markup is generated at.
 *
 * Constants rather than the live angles, and read during render on purpose:
 * the server has no angles to read, so the first frame has to be something
 * fixed for the client to hydrate onto without a mismatch. The loop takes over
 * on the very next frame, so this is the starting pose and nothing more.
 */
const START_PITCH = -10;
const START_YAW = 0;

/** Breathing room between a face and its name, and the name's own height. */
const LABEL_GAP = 8;
const LABEL_HEIGHT = 24;

interface UnitPosition {
  x: number;
  y: number;
  z: number;
}

/**
 * Evenly spaced points on a unit sphere.
 *
 * Pure and deterministic: same count in, same points out, on the server and in
 * the browser. That equality is what lets the markup be generated once and
 * hydrated without a mismatch.
 */
function latticePoints(count: number): UnitPosition[] {
  const points: UnitPosition[] = [];
  for (let i = 0; i < count; i++) {
    // The half-step keeps the first and last points off the exact poles, where
    // a ring of nodes would otherwise collapse onto a single spot.
    const y = count === 1 ? 0 : 1 - ((i + 0.5) / count) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = GOLDEN_ANGLE * i;
    points.push({ x: Math.cos(theta) * ring, y, z: Math.sin(theta) * ring });
  }
  return points;
}

/** Where one node sits on screen once the sphere has been turned. */
interface Projected {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

function project(
  point: UnitPosition,
  pitchDeg: number,
  yawDeg: number,
  radius: number,
  weight: number
): Projected {
  const pitch = (pitchDeg * Math.PI) / 180;
  const yaw = (yawDeg * Math.PI) / 180;

  // Yaw about the vertical axis, then pitch about the horizontal one. Order
  // matters: pitching first would make horizontal drags tilt as well as turn.
  const x1 = point.x * Math.cos(yaw) + point.z * Math.sin(yaw);
  const z1 = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
  const y2 = point.y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = point.y * Math.sin(pitch) + z1 * Math.cos(pitch);

  // Depth as 0 (furthest) to 1 (nearest), which both scale and opacity read.
  const depth = (z2 + 1) / 2;

  return {
    x: x1 * radius,
    y: y2 * radius,
    scale: (0.45 + depth * 0.75) * weight,
    opacity: 0.4 + depth * 0.6,
    zIndex: Math.round(depth * 1000),
  };
}

export function ImgSphere({
  nodes,
  size = 560,
  baseScale = 0.145,
  radiusRatio = 0.86,
  autoRotateSpeed = 0.12,
  className = "",
}: ImgSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const labelRef = useRef<HTMLDivElement>(null);

  // Which node is being pointed at, held twice on purpose. The state renders
  // the label's text, which happens once per hover; the ref is what the
  // animation loop reads sixty times a second, because reading state there
  // would mean rebuilding the loop on every hover.
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(null);

  // Everything the animation loop mutates lives in refs. None of it is state:
  // a re-render per frame is the cost this component exists to avoid.
  const angles = useRef({ pitch: START_PITCH, yaw: START_YAW });
  const velocity = useRef({ pitch: 0, yaw: 0 });
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const measured = useRef(size);

  const points = latticePoints(nodes.length);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Measured synchronously, before the first draw. A ResizeObserver only
    // calls back on a later task, and `size` is the server's guess: on a narrow
    // screen that guess is twice the real width, so a first draw using it flings
    // every node far outside the box. Below the fold that is also the LAST draw,
    // because the IntersectionObserver stops the loop before it can correct
    // itself, and the nodes sit over whatever is above them until scrolled to.
    measured.current = container.getBoundingClientRect().width || size;

    // Square, and driven by the width, so the sphere fills a narrow screen
    // without ever being taller than it is wide. Redraws on its own rather than
    // waiting for the loop, for the same reason: a resize while paused has to
    // land somewhere.
    const resize = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width && width !== measured.current) {
        measured.current = width;
        draw();
      }
    });
    resize.observe(container);

    let frame: number | null = null;
    let visible = true;

    function draw() {
      const radius = (measured.current / 2) * radiusRatio;
      const nodeSize = measured.current * baseScale;

      for (let i = 0; i < points.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const p = project(
          points[i],
          angles.current.pitch,
          angles.current.yaw,
          radius,
          nodes[i]?.weight ?? 1
        );
        el.style.width = `${nodeSize}px`;
        el.style.height = `${nodeSize}px`;
        el.style.transform = `translate3d(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px), 0) scale(${p.scale})`;
        el.style.opacity = String(p.opacity);
        el.style.zIndex = String(p.zIndex);

        // The label rides along with its node but is deliberately not inside
        // it: everything in that wrapper inherits the wrapper's scale, so a
        // name on a node at the back of the sphere would be rendered at half
        // size. Positioned here instead, it stays the same size wherever the
        // face it belongs to happens to be.
        if (i === hoveredRef.current && labelRef.current) {
          const half = (nodeSize * p.scale) / 2;
          // Below the face normally, above it near the foot of the sphere.
          // Without the flip a name on a low node lands on whatever caption
          // the page has put underneath, and covers it.
          const below = p.y + half + LABEL_GAP;
          const flip = below + LABEL_HEIGHT > measured.current / 2;
          const y = flip ? p.y - half - LABEL_GAP - LABEL_HEIGHT : below;
          labelRef.current.style.transform = `translate3d(calc(-50% + ${p.x}px), ${y}px, 0)`;
          // It mounts at opacity 0, because React paints it before this loop
          // gets to place it and the untouched position is the middle of the
          // sphere. Revealed here, once it is where it belongs.
          labelRef.current.style.opacity = "1";
        }
      }
    }

    function tick() {
      if (!dragging.current) {
        velocity.current.pitch *= MOMENTUM_DECAY;
        velocity.current.yaw *= MOMENTUM_DECAY;
        if (Math.abs(velocity.current.pitch) < 0.005) velocity.current.pitch = 0;
        if (Math.abs(velocity.current.yaw) < 0.005) velocity.current.yaw = 0;

        angles.current.yaw += velocity.current.yaw;
        angles.current.pitch += velocity.current.pitch;
        // The drift is the only thing reduced motion turns off. A sphere that
        // still answers a drag is a control; one that spins on its own is an
        // animation, and that is the distinction the setting is asking about.
        //
        // Pointing at a face holds it still too. Reading a name off a target
        // that is sliding out from under the cursor is a small fight, and the
        // hover ends the moment it drifts away.
        if (!reduceMotion && hoveredRef.current === null) {
          angles.current.yaw += autoRotateSpeed;
        }
      }

      angles.current.pitch = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, angles.current.pitch)
      );
      draw();
      frame = requestAnimationFrame(tick);
    }

    // Off-screen, the loop is pure waste: it burns a frame budget on a hero
    // nobody is looking at while they read further down the page.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && frame === null) {
          frame = requestAnimationFrame(tick);
        } else if (!visible && frame !== null) {
          cancelAnimationFrame(frame);
          frame = null;
        }
      },
      { threshold: 0 }
    );
    observer.observe(container);

    draw();
    frame = requestAnimationFrame(tick);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
    };
    // points is derived from nodes.length and recomputed each render; the loop
    // reads it through the closure, so the effect has to be rebuilt when the
    // node list changes shape.
  }, [nodes, points, size, baseScale, radiusRatio, autoRotateSpeed]);

  // Pointer events rather than the upstream pair of mouse and touch handlers:
  // one code path, and pointer capture means a drag that leaves the element
  // keeps working without listeners on the document.
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    velocity.current = { pitch: 0, yaw: 0 };
    lastPointer.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };

    const yaw = clamp(dx * DRAG_SENSITIVITY);
    const pitch = clamp(-dy * DRAG_SENSITIVITY);
    angles.current.yaw += yaw;
    angles.current.pitch += pitch;
    velocity.current = { pitch, yaw };
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  if (!nodes.length) return null;

  const hoveredLabel = hovered === null ? null : (nodes[hovered]?.label ?? null);

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      // touch-pan-y, not touch-none: on a narrow screen this is a full-width
      // square sitting in the middle of the page, and touch-none would have it
      // swallow every vertical swipe that started inside it. The page scrolls,
      // and horizontal drags still reach us, which is the axis worth turning.
      // `isolate` is load-bearing, not decoration. The nodes carry z-indices up
      // to 1000 so they can stack back to front against each other, and without
      // a stacking context here those numbers compete with the whole page: the
      // navbar is z-40, so faces painted straight over the open account menu.
      // Isolating keeps the depth ordering internal and puts the sphere as a
      // whole back in normal document order.
      className={`relative isolate aspect-square w-full cursor-grab touch-pan-y select-none active:cursor-grabbing ${className}`}
      style={{ maxWidth: size }}
    >
      {nodes.map((item, i) => {
        // The first frame, computed during render so the sphere arrives in the
        // HTML already arranged. Identical on both sides because the lattice
        // and the starting angles are fixed.
        const initial = project(
          points[i],
          START_PITCH,
          START_YAW,
          (size / 2) * radiusRatio,
          item.weight ?? 1
        );
        const style: CSSProperties = {
          width: size * baseScale,
          height: size * baseScale,
          transform: `translate3d(calc(-50% + ${initial.x}px), calc(-50% + ${initial.y}px), 0) scale(${initial.scale})`,
          opacity: initial.opacity,
          zIndex: initial.zIndex,
        };
        const track = item.label
          ? {
              onPointerEnter: () => {
                hoveredRef.current = i;
                setHovered(i);
              },
              onPointerLeave: () => {
                hoveredRef.current = null;
                setHovered(null);
              },
              // Focus as well as hover, so tabbing through the faces says who
              // they are rather than moving a silent ring around the sphere.
              onFocus: () => {
                hoveredRef.current = i;
                setHovered(i);
              },
              onBlur: () => {
                hoveredRef.current = null;
                setHovered(null);
              },
            }
          : null;

        return (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            style={style}
            className="absolute left-1/2 top-1/2 will-change-transform"
            {...track}
          >
            {item.node}
          </div>
        );
      })}

      {/* One label, moved to whichever node is being pointed at. Rendering it
          only while something is hovered keeps it out of the document the rest
          of the time; aria-hidden because the name is already the accessible
          name of the link it belongs to, and announcing it twice is noise. */}
      {hoveredLabel && (
        <div
          ref={labelRef}
          aria-hidden
          style={{ opacity: 0 }}
          className="pointer-events-none absolute left-1/2 top-1/2 z-[2000] whitespace-nowrap rounded-lg bg-[var(--foreground)] px-2.5 py-1 text-xs font-medium text-[var(--background)] shadow-[var(--shadow-md)]"
        >
          {hoveredLabel}
        </div>
      )}
    </div>
  );
}

function clamp(value: number): number {
  return Math.max(-MAX_SPEED, Math.min(MAX_SPEED, value));
}
