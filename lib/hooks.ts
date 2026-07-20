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
 * to return fresh arrays. We hold the result in state, so there is no
 * snapshot stability requirement to worry about.
 */
export function useStoreValue<T>(selector: () => T): T {
  const selectorRef = useRef(selector);
  const [value, setValue] = useState<T>(() => selector());

  // Keep the latest selector without touching the ref during render. This
  // effect is declared first, so it has already run by the time the
  // subscription below fires.
  useEffect(() => {
    selectorRef.current = selector;
  });

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
