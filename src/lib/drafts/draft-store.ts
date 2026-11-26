import type { EditState } from "@/features/editor/types";
import type { PhotoEditState } from "@/features/editor/photo-editor";
import type { Sound } from "@/lib/db/sounds";

/**
 * Post drafts, kept on this phone (IndexedDB), like TikTok's: the original
 * clips or photos and the whole edit, so a draft reopens exactly as it was
 * left and keeps its full quality. Nothing is uploaded until it's posted,
 * so a draft costs no storage or bandwidth and is never public.
 *
 * Client-only. Each signed-in account sees only its own drafts on a
 * shared phone.
 */
export interface PostDraft {
  id: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  kind: "video" | "photo";
  /** A still for the drafts grid. */
  cover: Blob | null;
  caption: string;
  vehicleId: string;
  crewId: string;
  /** The library sound, credited on the post. */
  sound: Sound | null;
  soundStartMs: number;
  /** A video: the clip as it went into the editor, and the edit. */
  video?: { source: File; state: EditState };
  /** A photo post: the finished photos; a single edited photo also keeps
   * its original and its edit, so Back from the post screen reopens it. */
  photos?: { files: File[]; edited: boolean; editSource: File | null; editState: PhotoEditState | null };
}

/** Enough to fill a phone, not so many the grid gets unwieldy. */
export const MAX_DRAFTS = 30;

const DB_NAME = "sorza-drafts";
const STORE = "drafts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Drafts aren't available in this browser."));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: "id" });
      store.createIndex("userId", "userId");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Couldn't open drafts."));
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = work(tx.objectStore(STORE));
        let result: T;
        req.onsuccess = () => {
          result = req.result;
        };
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onerror = tx.onabort = () => {
          db.close();
          reject(tx.error ?? req.error ?? new Error("Drafts couldn't be saved."));
        };
      }),
  );
}

/** Newest first. */
export function sortDrafts(drafts: PostDraft[]): PostDraft[] {
  return [...drafts].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listDrafts(userId: string): Promise<PostDraft[]> {
  const all = await run<PostDraft[]>("readonly", (s) => s.index("userId").getAll(userId));
  return sortDrafts(all);
}

export async function saveDraft(draft: PostDraft): Promise<void> {
  // Asks the browser not to clear drafts when the phone is low on space.
  // Granted or not, saving goes ahead.
  await navigator.storage?.persist?.().catch(() => false);
  await run("readwrite", (s) => s.put(draft));
}

export async function deleteDraft(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

/** A save failing because the phone is full reads differently from any
 * other failure. */
export function draftErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : "";
  if (name === "QuotaExceededError") return "Your phone is out of space for drafts. Delete an old draft and try again.";
  return "Couldn't save your draft. Try again.";
}
