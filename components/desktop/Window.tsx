"use client";

import {
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion } from "motion/react";
import type { Win } from "./types";

const MIN_W = 360;
const MIN_H = 240;
/** Menu bar height; nothing may be dragged above it. */
const TOP = 25;

type Props = {
  win: Win;
  title: string;
  active: boolean;
  /**
   * "tall" for windows with a unified toolbar (Marketplace, Pages), where the
   * lights sit in a 52px bar; "short" for a plain 32px title bar.
   */
  bar: "tall" | "short";
  onFocus: () => void;
  onClose: () => void;
  onMinimise: () => void;
  onZoom: () => void;
  onFrame: (frame: Pick<Win, "x" | "y" | "w" | "h">) => void;
  children: ReactNode;
};

/**
 * A window frame and nothing else: the three lights, the outline, the shadow,
 * the resize edges. What sits under the lights (a sidebar, a toolbar, a title
 * bar) belongs to the app inside, the way a Mac app draws its own toolbar.
 * Any element marked `data-drag` moves the window; double-clicking one zooms.
 *
 * Dragging writes straight to the element and reports the frame once on
 * release, so a drag is one re-render rather than one per pointer move.
 * Below 768px every window fills the screen and none of this applies.
 */
export function Window({
  win,
  title,
  active,
  bar,
  onFocus,
  onClose,
  onMinimise,
  onZoom,
  onFrame,
  children,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  function track(e: ReactPointerEvent, mode: "move" | "e" | "s" | "se") {
    if (win.max || e.button !== 0 || window.innerWidth < 768) return;
    const el = ref.current;
    if (!el) return;
    e.preventDefault();
    const start = {
      px: e.clientX,
      py: e.clientY,
      x: win.x,
      y: win.y,
      w: win.w,
      h: win.h,
    };
    let frame = { x: win.x, y: win.y, w: win.w, h: win.h };
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.px;
      const dy = ev.clientY - start.py;
      if (mode === "move") {
        frame = {
          ...frame,
          x: Math.min(
            window.innerWidth - 80,
            Math.max(80 - start.w, start.x + dx),
          ),
          y: Math.min(window.innerHeight - 60, Math.max(TOP, start.y + dy)),
        };
      } else {
        if (mode !== "s")
          frame = { ...frame, w: Math.max(MIN_W, start.w + dx) };
        if (mode !== "e")
          frame = { ...frame, h: Math.max(MIN_H, start.h + dy) };
      }
      el.style.left = `${frame.x}px`;
      el.style.top = `${frame.y}px`;
      el.style.width = `${frame.w}px`;
      el.style.height = `${frame.h}px`;
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
      document.body.style.userSelect = "";
      onFrame(frame);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  }

  /** A press on a toolbar (but not on a control inside it) starts a move. */
  function onDown(e: ReactPointerEvent) {
    onFocus();
    const t = e.target as HTMLElement;
    if (
      !t.closest("[data-drag]") ||
      t.closest("button, input, a, select, textarea, iframe")
    )
      return;
    track(e, "move");
  }

  return (
    <motion.section
      ref={ref}
      role="dialog"
      aria-label={title}
      className={`sm-win bar-${bar}${active ? " is-active" : ""}${win.max ? " is-max" : ""}`}
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
      }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.25,
        y: 360,
        transition: { duration: 0.3, ease: [0.5, 0, 0.9, 0.6] },
      }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      onPointerDown={onDown}
      onDoubleClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("[data-drag]") && !t.closest("button, input, a"))
          onZoom();
      }}
    >
      {children}
      <div className="sm-lights">
        <button
          type="button"
          className="l-close"
          aria-label="Close window"
          onClick={onClose}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3.5 3.5l5 5M8.5 3.5l-5 5" />
          </svg>
        </button>
        <button
          type="button"
          className="l-min"
          aria-label="Minimise window"
          onClick={onMinimise}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.8 6h6.4" />
          </svg>
        </button>
        <button
          type="button"
          className="l-zoom"
          aria-label="Zoom window"
          onClick={onZoom}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M3.3 8.7V4.6l4.1 4.1zM8.7 3.3v4.1L4.6 3.3z"
              className="fill"
            />
          </svg>
        </button>
      </div>
      <div
        className="sm-rz sm-rz-e"
        onPointerDown={(e) => track(e, "e")}
        aria-hidden="true"
      />
      <div
        className="sm-rz sm-rz-s"
        onPointerDown={(e) => track(e, "s")}
        aria-hidden="true"
      />
      <div
        className="sm-rz sm-rz-se"
        onPointerDown={(e) => track(e, "se")}
        aria-hidden="true"
      />
    </motion.section>
  );
}
