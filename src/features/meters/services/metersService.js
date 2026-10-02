import { collection, doc, getDoc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function fetchMeter(meterId) {
  const snap = await getDoc(doc(db, 'meters', meterId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeMeter(meterId, cb, onError) {
  return onSnapshot(doc(db, 'meters', meterId), (s) => {
    cb(s.exists() ? { id: s.id, ...s.data() } : null);
  }, onError);
}

export function subscribeMetersByShop(shopId, cb, onError) {
  return onSnapshot(
    query(collection(db, 'meters'), where('shopId', '==', shopId), orderBy('code')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribeMetersByGallery(galleryId, { type, status, pageSize } = {}, cb, onError) {
  const constraints = [];
  if (galleryId) constraints.push(where('galleryId', '==', galleryId));
  if (status) constraints.push(where('status', '==', status));
  if (pageSize) constraints.push(limit(pageSize));
  return onSnapshot(query(collection(db, 'meters'), ...constraints), (snap) => {
    cb(snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((meter) => !type || meter.type === type)
      .sort((a, b) => a.code.localeCompare(b.code)));
  }, onError);
}
