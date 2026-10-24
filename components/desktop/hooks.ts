"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_WALLPAPER, OLD_WALLPAPERS, WALLPAPERS, type Wallpaper } from "@/lib/desktop";
import type { Look } from "./types";

/*
 * Things only the browser knows (the visitor's clock, the window size, what
 * they chose last time) read through useSyncExternalStore: the server renders
 * a fixed answer, the browser swaps in the real one after hydration, and no
 * effect has to copy anything into state.
 */

/* ------------------------------------------------------------------ clock */

const TICK = 15_000;

function subscribeClock(cb: () => void) {
  const t = setInterval(cb, TICK);
  return () => clearInterval(t);
}

/** The visitor's own time, to the quarter minute. Null on the server. */
export function useClock(): Date | null {
  const tick = useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / TICK),
    () => 0,
  );
  return tick ? new Date(tick * TICK) : null;
}

/* --------------------------------------------------------------- viewport */

function subscribeSize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

/** Window size as [width, height]. A large desktop on the server. */
export function useViewport(): [number, number] {
  const key = useSyncExternalStore(
    subscribeSize,
    () => `${window.innerWidth}x${window.innerHeight}`,
    () => "1440x900",
  );
  const [w, h] = key.split("x").map(Number);
  return [w, h];
}

/* ------------------------------------------------------------ preferences */

type Prefs = { look?: Look; wallpaper?: Wallpaper; noteShift?: number; keepShift?: number };

const KEY = "sm-desktop";
const listeners = new Set<() => void>();
/** Used when storage is refused (private windows, blocked site data). */
let memory: string | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function parse(raw: string | null): Prefs {
  try {
    return raw ? (JSON.parse(raw) as Prefs) : {};
  } catch {
    return {};
  }
}

export function setPrefs(patch: Prefs) {
  memory = JSON.stringify({ ...parse(read()), ...patch });
  try {
    localStorage.setItem(KEY, memory);
  } catch {}
  listeners.forEach((f) => f());
}

function subscribePrefs(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Appearance and wallpaper, remembered per visitor. Defaults on the server. */
export function usePrefs(): Required<Prefs> {
  const raw = useSyncExternalStore(subscribePrefs, read, () => null);
  const p = parse(raw);
  const stored = p.wallpaper ? (OLD_WALLPAPERS[p.wallpaper] ?? p.wallpaper) : DEFAULT_WALLPAPER;
  const wallpaper = WALLPAPERS.some((w) => w.id === stored) ? stored : DEFAULT_WALLPAPER;
  return { look: p.look ?? "auto", wallpaper, noteShift: p.noteShift ?? 0, keepShift: p.keepShift ?? 0 };
}
