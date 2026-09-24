import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
}

export function subscribeUserProfile(uid, callback, onError) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => callback(snap.exists() ? { uid: snap.id, ...snap.data() } : null),
    (err) => onError?.(err),
  );
}