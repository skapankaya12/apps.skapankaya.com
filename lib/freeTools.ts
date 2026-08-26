"use client";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "./firebase";
import { slugify } from "./store";
import type { FreeTool, FreeToolStatus } from "./types";

/**
 * Client-side reads and writes for the /free directory.
 *
 * Deliberately NOT part of lib/store.ts. That file keeps live onSnapshot caches
 * because the whole app re-renders off listings, users and categories. The
 * directory is read by one server component and edited on one admin screen, so
 * a listener open on every page would be a subscription nobody consumes.
 *
 * The public page never calls any of this: it reads through the Admin SDK in
 * lib/freeTools.server.ts so a crawler sees real HTML. This is the editing
 * half, and every function here runs under the security rules.
 */

const COLLECTION = "freeTools";

/** Everything, any status, newest first. Admin-only by the rules. */
export async function listAllFreeTools(): Promise<FreeTool[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), orderBy("updatedAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FreeTool, "id">) }));
}

export interface FreeToolDraft {
  url: string;
  title: string;
  description: string;
  previewImage?: string;
  category: string;
}

/**
 * Submit one. Always enters the queue: the rules refuse a create whose status
 * is anything but `pending`, so an admin adding an entry reviews it in the same
 * two clicks a stranger's submission takes. That is deliberate — it keeps one
 * path through review rather than a fast lane nobody audits.
 */
export async function createFreeTool(
  draft: FreeToolDraft,
  submitter: { uid: string; displayName: string }
): Promise<string> {
  const now = Date.now();
  const ref = await addDoc(collection(db, COLLECTION), {
    ...draft,
    previewImage: draft.previewImage ?? "",
    slug: slugify(draft.title),
    submitterId: submitter.uid,
    submitterName: submitter.displayName,
    status: "pending" as FreeToolStatus,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/** Edit the content of an entry. Never touches status. */
export async function updateFreeTool(
  id: string,
  draft: Partial<FreeToolDraft>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { ...draft, updatedAt: Date.now() });
}

/** Approve or reject. Admin-only by the rules, not by this function. */
export async function setFreeToolStatus(
  id: string,
  status: FreeToolStatus,
  reviewNote?: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    status,
    ...(reviewNote !== undefined ? { reviewNote } : {}),
    updatedAt: Date.now(),
  });
}

export async function deleteFreeTool(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
