import { collection, doc, getDoc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export async function fetchInvoice(id) {
  const snap = await getDoc(doc(db, 'invoices', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeInvoice(id, cb, onError) {
  return onSnapshot(doc(db, 'invoices', id), (s) => {
    cb(s.exists() ? { id: s.id, ...s.data() } : null);
  }, onError);
}

export function subscribeInvoicesByShop(shopId, { pageSize = 50 } = {}, cb, onError) {
  return onSnapshot(
    query(
      collection(db, 'invoices'),
      where('shopId', '==', shopId),
      orderBy('periodEnd', 'desc'),
      limit(pageSize),
    ),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

export function subscribeInvoicesByGallery(galleryId, { pageSize = 50 } = {}, cb, onError) {
  const constraints = [];
  if (galleryId) constraints.push(where('galleryId', '==', galleryId), orderBy('periodEnd', 'desc'), limit(pageSize));
  return onSnapshot(
    query(collection(db, 'invoices'), ...constraints),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => invoiceTime(b.periodEnd) - invoiceTime(a.periodEnd))),
    onError,
  );
}

function invoiceTime(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return value instanceof Date ? value.getTime() : (Date.parse(value ?? '') || 0);
}
