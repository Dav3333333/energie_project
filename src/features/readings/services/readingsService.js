import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export function subscribeReadingsByMeter(meterId, { pageSize = 50 } = {}, cb, onError) {
  return onSnapshot(
    query(
      collection(db, 'readings'),
      where('meterId', '==', meterId),
      orderBy('readingDate', 'desc'),
      limit(pageSize),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribeReadingsByShop(shopId, { pageSize = 50 } = {}, cb, onError) {
  return onSnapshot(
    query(
      collection(db, 'readings'),
      where('shopId', '==', shopId),
      orderBy('readingDate', 'desc'),
      limit(pageSize),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribeReadingsByGallery(galleryId, { pageSize = 50 } = {}, cb, onError) {
  const constraints = [];
  if (galleryId) constraints.push(where('galleryId', '==', galleryId));
  if (galleryId) constraints.push(orderBy('readingDate', 'desc'), limit(pageSize));
  return onSnapshot(
    query(collection(db, 'readings'), ...constraints),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => readingTime(b.readingDate) - readingTime(a.readingDate))),
    onError,
  );
}

function readingTime(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return value instanceof Date ? value.getTime() : (Date.parse(value ?? '') || 0);
}
