import { collection, doc, getDoc, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function fetchShop(shopId) {
  const snap = await getDoc(doc(db, 'shops', shopId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeShop(shopId, cb, onError) {
  return onSnapshot(doc(db, 'shops', shopId), (s) => {
    cb(s.exists() ? { id: s.id, ...s.data() } : null);
  }, onError);
}

export function subscribeShopsByGallery(galleryId, { status, balanceStatus, pageSize = 50 } = {}, cb, onError) {
  const constraints = [where('galleryId', '==', galleryId)];
  if (status) constraints.push(where('status', '==', status));
  if (balanceStatus) constraints.push(where('balanceStatus', '==', balanceStatus));
  constraints.push(limit(pageSize));
  return onSnapshot(query(collection(db, 'shops'), ...constraints), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
  }, onError);
}

export function subscribeAllShops({ status, balanceStatus, pageSize = 100 } = {}, cb, onError) {
  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  if (balanceStatus) constraints.push(where('balanceStatus', '==', balanceStatus));
  constraints.push(limit(pageSize));
  return onSnapshot(query(collection(db, 'shops'), ...constraints), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
  }, onError);
}

export function subscribeShopsByIds(shopIds, cb, onError) {
  if (!shopIds?.length) {
    cb([]);
    return () => {};
  }
  const constraints = [where('__name__', 'in', shopIds.slice(0, 10))];
  return onSnapshot(query(collection(db, 'shops'), ...constraints), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}