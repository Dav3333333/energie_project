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

export function subscribePurchasesByGallery(galleryId, { status } = {}, cb, onError) {
  const constraints = [];
  if (galleryId) constraints.push(where('galleryId', '==', galleryId));
  return onSnapshot(
    query(collection(db, 'energyPurchases'), ...constraints),
    (snap) => cb(snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((purchase) => !status || purchase.status === status)
      .sort((a, b) => purchaseTime(b.purchaseDate) - purchaseTime(a.purchaseDate))),
    onError,
  );
}

function purchaseTime(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
}
