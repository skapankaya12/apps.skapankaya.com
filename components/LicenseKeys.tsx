"use client";

import { useState } from "react";
import { clearUnusedLicenseKeys, uploadLicenseKeys } from "@/lib/store";
import {
  LICENSE_KEYS_LOW,
  LICENSE_KEYS_PER_UPLOAD,
  parseLicenseKeys,
  type ParsedKeys,
} from "@/lib/licenseKeys";
import type { LicenseKeyStock } from "@/lib/types";
import { Button } from "@/components/ui";
import { inputClass } from "@/components/ui/form";

/**
 * What a paste of keys amounts to, under the box it was pasted into. Says what
 * will be skipped before it is sent, so a paste with a stray header row or a
 * repeated line is fixed here rather than discovered later.
 */
export function KeyPasteSummary({
  parsed,
  onHand,
}: {
  parsed: ParsedKeys;
  /** Unused keys already loaded, when known. */
  onHand?: number;
}) {
  const parts: string[] = [];
  if (parsed.keys.length > 0) {
    parts.push(`${parsed.keys.length} ${parsed.keys.length === 1 ? "key" : "keys"} ready`);
  }
  if (parsed.duplicates > 0) {
    parts.push(`${parsed.duplicates} repeated ${parsed.duplicates === 1 ? "line" : "lines"} ignored`);
  }
  if (parsed.invalid > 0) {
    parts.push(`${parsed.invalid} ${parsed.invalid === 1 ? "line isn't" : "lines aren't"} a key`);
  }
  if (typeof onHand === "number") parts.push(`${onHand} unused already loaded`);
  if (parts.length === 0) return null;
  const tooMany = parsed.keys.length > LICENSE_KEYS_PER_UPLOAD;
  return (
    <p className={`mt-1.5 text-xs ${tooMany ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}>
      {tooMany ? "More than 1,000 keys. Paste them in smaller batches." : parts.join(" · ")}
    </p>
  );
}

/**
 * A listing's key stock on the seller dashboard, with a way to add more.
 *
 * Counts only. The seller never sees their keys read back: they have them
 * already, and nothing gains from a page that can display every unsold key.
 */
export function LicenseKeysPanel({
  listingId,
  stock,
}: {
  listingId: string;
  /** Undefined while the dashboard is still asking. */
  stock: LicenseKeyStock | undefined;
}) {
  // The dashboard's counts arrive after this mounts, so they are followed until
  // the seller changes the stock here, when the server's answer takes over.
  const [changed, setChanged] = useState<LicenseKeyStock | null>(null);
  const shown = changed ?? stock;
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const parsed = parseLicenseKeys(text);

  async function add() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await uploadLicenseKeys(listingId, text);
      setChanged(r.stock);
      setText("");
      setAdding(false);
      const skipped = r.alreadyLoaded + r.duplicates + r.invalid + r.overLimit;
      setMessage(
        `Added ${r.added} ${r.added === 1 ? "key" : "keys"}.` +
          (skipped ? ` Skipped ${skipped} already loaded, repeated or not a key.` : "") +
          (r.overLimit ? " You've reached the 5,000 unused key limit." : "")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your keys.");
    } finally {
      setBusy(false);
    }
  }

  async function clearUnused() {
    if (!window.confirm("Remove every key nobody has bought yet? Keys already given to buyers stay.")) {
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setChanged(await clearUnusedLicenseKeys(listingId));
      setMessage("Unused keys removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove the keys.");
    } finally {
      setBusy(false);
    }
  }

  const available = shown?.available;
  const low = typeof available === "number" && available < LICENSE_KEYS_LOW;

  return (
    <div className="mt-2 max-w-md text-xs">
      <p className={low ? "font-medium text-[var(--danger)]" : "text-[var(--muted)]"}>
        {shown === undefined
          ? "License keys: …"
          : available === 0
            ? "No license keys left. Nobody can buy it until you add more."
            : `License keys: ${available} left, ${shown.assigned} given to buyers.`}
      </p>

      {adding ? (
        <div className="mt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            spellCheck={false}
            autoComplete="off"
            placeholder="One key per line"
            className={`${inputClass} font-mono text-xs`}
          />
          <KeyPasteSummary parsed={parsed} />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={add}
              disabled={
                busy ||
                parsed.keys.length === 0 ||
                parsed.keys.length > LICENSE_KEYS_PER_UPLOAD
              }
            >
              {busy ? "Saving…" : "Add keys"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex gap-3">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            Add keys
          </button>
          {typeof available === "number" && available > 0 && (
            <button
              type="button"
              onClick={clearUnused}
              disabled={busy}
              className="text-[var(--muted)] hover:underline disabled:opacity-50"
            >
              Remove unused
            </button>
          )}
        </div>
      )}

      {message && <p className="mt-1 text-[var(--success)]">{message}</p>}
      {error && <p className="mt-1 text-[var(--danger)]">{error}</p>}
    </div>
  );
}
