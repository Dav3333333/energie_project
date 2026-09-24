import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export function subscribeAlertsByGallery(galleryId, { status, pageSize = 50 } = {}, cb, onError) {
  const constraints = [where('galleryId', '==', galleryId)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize));
  return onSnapshot(
    query(collection(db, 'alerts'), ...constraints),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribeAlertsByShop(shopId, { status, pageSize = 50 } = {}, cb, onError) {
  const constraints = [where('shopId', '==', shopId)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize));
  return onSnapshot(
    query(collection(db, 'alerts'), ...constraints),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}