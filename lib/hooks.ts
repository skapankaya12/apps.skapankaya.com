"use client";

import { useState, useEffect, useRef } from "react";
import { subscribe, getUser } from "./store";
import type { AppUser } from "./types";

/**
 * Subscribe a component to the store.
 *
 * On the server and the first client render, reads return their fallbacks (the
 * store's hydration gate is still closed), so SSR and hydration agree. After
 * mount we recompute and then re-run on every store change. selector() is free
 * to return fresh arrays — we hold the result in state, so there's no snapshot-
 * stability requirement to worry about.
 */
export function useStoreValue<T>(selector: () => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const [value, setValue] = useState<T>(() => selector());

  useEffect(() => {
    const update = () => setValue(selectorRef.current());
    update(); // recompute once mounted (store gate is open by now)
    return subscribe(update);
  }, []);

  return value;
}

export function useUser(): AppUser | null {
  return useStoreValue(getUser);
}
