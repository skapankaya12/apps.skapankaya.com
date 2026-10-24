"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

export type DockEntry =
  | { kind: "sep"; key: string }
  | {
      kind: "app";
      key: string;
      label: string;
      icon: ReactNode;
      /** Shows the small dot under the icon. */
      running?: boolean;
      href?: string;
      onOpen: () => void;
    };

const BASE = 58;
const MAG = 1.7;
/** How far either side of the pointer the swell reaches. */
const REACH = BASE * 4;

/**
 * The Dock. Icons swell as the pointer passes, nearest most.
 *
 * The swell follows the approach in Renovamen/playground-macos and
 * PuruVJ/macos-web (both MIT): each icon maps its distance from the pointer
 * to a width through a spring. Written fresh against `motion` rather than
 * copied, and without their per-frame loop: the distance is derived from the
 * pointer's motion value, so nothing runs while the pointer is elsewhere.
 */
export function Dock({ entries }: { entries: DockEntry[] }) {
  const mouseX = useMotionValue(Infinity);
  return (
    <nav
      aria-label="Dock"
      className="sm-dock"
      onPointerMove={(e) => e.pointerType === "mouse" && mouseX.set(e.clientX)}
      onPointerLeave={() => mouseX.set(Infinity)}
    >
      {entries.map((d) =>
        d.kind === "sep" ? (
          <span key={d.key} className="sm-dsep" aria-hidden="true" />
        ) : (
          <DockItem key={d.key} entry={d} mouseX={mouseX} />
        ),
      )}
    </nav>
  );
}

function DockItem({
  entry,
  mouseX,
}: {
  entry: Extract<DockEntry, { kind: "app" }>;
  mouseX: MotionValue<number>;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const distance = useTransform(mouseX, (x) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? x - (r.left + r.width / 2) : Infinity;
  });
  const target = useTransform(
    distance,
    [-REACH, -REACH / 2, 0, REACH / 2, REACH],
    [BASE, BASE * 1.25, BASE * MAG, BASE * 1.25, BASE],
  );
  const size = useSpring(target, { stiffness: 900, damping: 60, mass: 0.4 });

  return (
    <motion.a
      ref={ref}
      href={entry.href ?? "#"}
      className="sm-dk"
      aria-label={entry.label}
      style={{ width: size, height: size }}
      whileTap={{ y: -14 }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        entry.onOpen();
      }}
    >
      <span className="sm-dk-tip" role="tooltip">
        {entry.label}
      </span>
      <span className="sm-dk-icon">{entry.icon}</span>
      <span
        className={entry.running ? "sm-dk-dot" : "sm-dk-nodot"}
        aria-hidden="true"
      />
    </motion.a>
  );
}
