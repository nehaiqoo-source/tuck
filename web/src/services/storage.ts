import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { SEED_ITEMS } from '../data/seedItems';
import type { TuckItem, TuckStatus } from '../types';

const LOCAL_STORAGE_KEY = 'tuck_items_v1';

export { SEED_ITEMS };

export function loadLocalItems(): TuckItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as TuckItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalItems(items: TuckItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors on large screenshots
  }
}

export function subscribeUserItems(
  uid: string,
  onChange: (items: TuckItem[]) => void
): () => void {
  if (!db) {
    onChange(loadLocalItems());
    return () => {};
  }

  const itemsRef = collection(db, 'users', uid, 'items');
  const q = query(itemsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: TuckItem[] = snapshot.docs.map((d) => d.data() as TuckItem);
    onChange(list);
  });
}

export async function persistItem(
  uid: string | null,
  item: TuckItem
): Promise<void> {
  if (db && uid) {
    const ref = doc(db, 'users', uid, 'items', item.id);
    // Keep imageDataUrl local-only if marked private to honor privacy-first promise
    const firestorePayload: TuckItem = item.isPrivate
      ? { ...item, imageDataUrl: undefined }
      : item;
    await setDoc(ref, firestorePayload);
  }
}

export async function updateItemStatus(
  uid: string | null,
  itemId: string,
  status: TuckStatus
): Promise<void> {
  if (db && uid) {
    const ref = doc(db, 'users', uid, 'items', itemId);
    await updateDoc(ref, { status, updatedAt: Date.now() });
  }
}

export async function removeItem(
  uid: string | null,
  itemId: string
): Promise<void> {
  if (db && uid) {
    const ref = doc(db, 'users', uid, 'items', itemId);
    await deleteDoc(ref);
  }
}
