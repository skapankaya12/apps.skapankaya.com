"use client";

import * as React from "react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * macOS-style dock magnification for a row of text pills.
 *
 * Hovering an item swells it and its neighbours fall off either side, biased by
 * where in the item the cursor actually sits — so sweeping across the row feels
 * like a wave rather than a set of steps.
 *
 * Differences from the icon-tile version this is adapted from:
 *
 *  - It scales with `transform`, not `width`/`height`. Animating the box of a
 *    text pill relays out the whole row on every pointer move, and the labels
 *    reflow while they grow. A transform is composited and changes no layout,
 *    so the words stay put and the row never jitters.
 *  - The falloff CSS lives in globals.css, not a `<style jsx>` block inside the
 *    item. Those rules are sibling selectors that must match ACROSS item
 *    instances; keeping them in one stylesheet says so plainly, and avoids
 *    emitting a duplicate <style> element per item in the row.
 *  - `scaleValue` no longer floors. Upstream returns pixels, where flooring is
 *    harmless; here the output is a fraction of a scale factor, and flooring
 *    would collapse every bias to zero.
 *
 * The magnification is presentation only — each item stays whatever you put in
 * it, so links stay links and the CTA keeps its own behaviour.
 */

type Range = [number, number];

/** Map `value` from one range onto another, clamped to the source range. */
export function scaleValue(value: number, from: Range, to: Range): number {
  const ratio = (to[1] - to[0]) / (from[1] - from[0]);
  const capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
  return capped * ratio + to[0];
}

interface DockProps {
  children: React.ReactNode;
  /** Applied to the <nav>. */
  className?: string;
  /** Applied to the <ul> that holds the items. */
  listClassName?: string;
  /** How far the cursor's position within an item biases its neighbours. */
  maxBias?: number;
  "aria-label"?: string;
}

interface DockItemProps {
  children: React.ReactNode;
  className?: string;
  /** Injected by <Dock>. */
  onPointerBias?: (e: React.MouseEvent<HTMLLIElement>) => void;
}

export function DockItem({ children, className, onPointerBias }: DockItemProps) {
  return (
    <li onMouseMove={onPointerBias} className={cn("dock-item", className)}>
      {children}
    </li>
  );
}

export function Dock({
  children,
  className,
  listClassName,
  maxBias = 0.06,
  "aria-label": ariaLabel = "Main",
}: DockProps) {
  const dockRef = useRef<HTMLElement | null>(null);

  const onPointerBias = (e: React.MouseEvent<HTMLLIElement>) => {
    const dock = dockRef.current;
    if (!dock) return;

    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;

    // 0 at the item's left edge, 1 at its right edge.
    const across = (e.clientX - rect.left) / rect.width;
    const bias = scaleValue(across, [0, 1], [-maxBias, maxBias]);

    // Lean the neighbours the way the cursor is leaning: the side being
    // approached grows a little more than the side being left behind.
    dock.style.setProperty("--dock-bias-left", `${-bias}`);
    dock.style.setProperty("--dock-bias-right", `${bias}`);
  };

  return (
    <nav ref={dockRef} aria-label={ariaLabel} className={className}>
      <ul className={cn("flex items-center gap-1", listClassName)}>
        {React.Children.map(children, (child) =>
          React.isValidElement<DockItemProps>(child)
            ? React.cloneElement(child, { onPointerBias })
            : child
        )}
      </ul>
    </nav>
  );
}
