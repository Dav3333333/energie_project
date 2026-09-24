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
  return onSnapshot(
    query(
      collection(db, 'readings'),
      where('galleryId', '==', galleryId),
      orderBy('readingDate', 'desc'),
      limit(pageSize),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}