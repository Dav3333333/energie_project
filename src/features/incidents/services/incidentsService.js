import { collection, doc, getDoc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function fetchIncident(id) {
  const snap = await getDoc(doc(db, 'incidents', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeIncident(id, cb, onError) {
  return onSnapshot(doc(db, 'incidents', id), (s) => {
    cb(s.exists() ? { id: s.id, ...s.data() } : null);
  }, onError);
}

export function subscribeIncidentsByGallery(galleryId, { status, pageSize = 50 } = {}, cb, onError) {
  const constraints = [where('galleryId', '==', galleryId)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('updatedAt', 'desc'));
  constraints.push(limit(pageSize));
  return onSnapshot(
    query(collection(db, 'incidents'), ...constraints),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}