import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { callables } from '@/lib/firebase/callables';

export async function fetchUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { uid: snap.id, ...snap.data() } : null;
}

export function subscribeUser(uid, cb, onError) {
  return onSnapshot(doc(db, 'users', uid), (s) => {
    cb(s.exists() ? { uid: s.id, ...s.data() } : null);
  }, onError);
}

export async function listUsersByGallery(galleryId) {
  const { data } = await callables.listUsersByGallery(galleryId ? { galleryId } : {});
  return data.users;
}