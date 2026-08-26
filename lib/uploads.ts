"use client";

import { useCallback, useState } from "react";
import type { ProgressFn } from "./storage";

/* ---------------------------------------------------------------------------
   Files that upload as they are chosen, rather than all at once on submit.

   The listing form used to hold every file in memory and push the lot inside
   the submit handler. For a 500MB installer that meant minutes on a button
   labelled "Uploading…" with no bar, no per-file state and no way to tell a
   stalled connection from a slow one — and any failure threw away the whole
   batch, including the files that had already made it.

   Uploading on pick fixes all of that and buys something else: because the
   result is a path rather than a File, it can go in the saved draft, so coming
   back tomorrow no longer means re-sending the package.
--------------------------------------------------------------------------- */

/** One file being uploaded, or already uploaded. */
export type Slot = {
  /**
   * Distinguishes this attempt from the next one. Progress and completion
   * callbacks check it before writing, so a slow upload that has since been
   * replaced cannot overwrite the state of the file that replaced it. Names
   * would not do: the same file can be chosen twice.
   */
  id: number;
  name: string;
  /** 0 to 1. Meaningless once `value` is set. */
  progress: number;
  /** The storage path or public URL, once the upload has landed. */
  value?: string;
  /** Shown under the field. Set means this slot holds nothing usable. */
  error?: string;
};

/**
 * Ids for every slot, from one counter.
 *
 * Shared rather than per-hook so that slots from different sources cannot
 * collide: restored files and freshly picked ones sit in the same list and are
 * keyed by this, and two slots with the same id make React drop one of them.
 */
let slotSeq = 0;

export function nextSlotId(): number {
  return ++slotSeq;
}

/** A slot for a file that was already uploaded, e.g. when editing a listing. */
export function doneSlot(value: string, name?: string): Slot {
  return {
    id: nextSlotId(),
    name: name ?? value.split("/").pop() ?? "file",
    progress: 1,
    value,
  };
}

export function isReady(slot: Slot | null): boolean {
  return Boolean(slot?.value);
}

export function isBusy(slot: Slot | null): boolean {
  return Boolean(slot && !slot.value && !slot.error);
}

const FAILED = "Upload failed. Check your connection and choose the file again.";

/**
 * One file that uploads the moment it is chosen.
 *
 * `begin` takes the work rather than the file so the caller decides where the
 * bytes go: a package and a demo video land in different buckets under
 * different rules.
 */
export function useUploadSlot(initial: Slot | null = null) {
  const [slot, setSlot] = useState<Slot | null>(initial);

  const begin = useCallback(
    async (
      name: string,
      run: (onProgress: ProgressFn) => Promise<string>
    ): Promise<string | undefined> => {
      const id = nextSlotId();
      setSlot({ id, name, progress: 0 });
      const mine = (s: Slot | null) => (s?.id === id ? s : null);
      try {
        const value = await run((progress) =>
          setSlot((s) => (mine(s) ? { ...s!, progress } : s))
        );
        setSlot((s) => (mine(s) ? { ...s!, progress: 1, value } : s));
        return value;
      } catch (err) {
        console.error("[upload]", name, err);
        setSlot((s) => (mine(s) ? { ...s!, error: FAILED } : s));
        return undefined;
      }
    },
    []
  );

  /** Reject a file before it is sent, e.g. a .zip where a .dmg was required. */
  const reject = useCallback((name: string, error: string) => {
    setSlot({ id: nextSlotId(), name, progress: 0, error });
  }, []);

  const clear = useCallback(() => setSlot(null), []);

  return { slot, begin, reject, clear, setSlot };
}
