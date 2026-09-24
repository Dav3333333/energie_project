import {
  collection, doc, getDoc, onSnapshot, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function fetchPurchase(id) {
  const snap = await getDoc(doc(db, 'energyPurchases', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribePurchase(id, cb, onError) {
  return onSnapshot(doc(db, 'energyPurchases', id), (s) => {
    cb(s.exists() ? { id: s.id, ...s.data() } : null);
  }, onError);
}

export function subscribePurchasesByShop(shopId, { pageSize = 50, status } = {}, cb, onError) {
  const constraints = [where('shopId', '==', shopId)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('purchaseDate', 'desc'));
  constraints.push(limit(pageSize));
  return onSnapshot(
    query(collection(db, 'energyPurchases'), ...constraints),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribePurchasesByGallery(galleryId, { pageSize = 50, status } = {}, cb, onError) {
  const constraints = [where('galleryId', '==', galleryId)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('purchaseDate', 'desc'));
  constraints.push(limit(pageSize));
  return onSnapshot(
    query(collection(db, 'energyPurchases'), ...constraints),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}