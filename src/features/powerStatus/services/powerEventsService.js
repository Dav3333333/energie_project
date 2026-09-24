import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export function subscribePowerEventsByGallery(galleryId, { pageSize = 50 } = {}, cb, onError) {
  return onSnapshot(
    query(
      collection(db, 'galleries', galleryId, 'powerEvents'),
      orderBy('declaredAt', 'desc'),
      limit(pageSize),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}