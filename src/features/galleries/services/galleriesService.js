import {
  collection, doc, getDoc, getDocs, onSnapshot, query,
  where, orderBy, limit, startAfter,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function fetchGallery(galleryId) {
  const snap = await getDoc(doc(db, 'galleries', galleryId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeGallery(galleryId, cb, onError) {
  return onSnapshot(doc(db, 'galleries', galleryId), (s) => {
    cb(s.exists() ? { id: s.id, ...s.data() } : null);
  }, onError);
}

export function subscribeGalleries({ status = null, pageSize = 30 } = {}, cb, onError) {
  const parts = [collection(db, 'galleries')];
  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('name'));
  constraints.push(limit(pageSize));
  return onSnapshot(query(...parts, ...constraints), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

export async function fetchGalleriesByIds(ids) {
  if (!ids?.length) return [];
  const results = await Promise.all(
    ids.map((id) => getDoc(doc(db, 'galleries', id))),
  );
  return results.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }));
}