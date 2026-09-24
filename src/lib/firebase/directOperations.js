import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';

function actorId() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Connexion requise.');
  return uid;
}

function result(data) {
  return Promise.resolve({ data });
}

function fail(message, code = 'failed-precondition') {
  const error = new Error(message);
  error.code = code;
  return Promise.reject(error);
}

function parseDate(value) {
  return value ? Timestamp.fromDate(new Date(value)) : Timestamp.now();
}

async function getRequired(path, message) {
  const snapshot = await getDoc(doc(db, path));
  if (!snapshot.exists()) throw new Error(message);
  return { id: snapshot.id, ...snapshot.data() };
}

async function recalculateBalance(shopId) {
  const shop = await getRequired(`shops/${shopId}`, 'Boutique introuvable.');
  const purchasesSnapshot = await getDocs(
    query(collection(db, 'energyPurchases'), where('shopId', '==', shopId)),
  );
  const readingsSnapshot = await getDocs(
    query(collection(db, 'readings'), where('shopId', '==', shopId), where('status', '==', 'VALID')),
  );
  const totalPurchasedKwh = purchasesSnapshot.docs.reduce(
    (total, item) => item.data().status === 'VALID' ? total + Number(item.data().purchasedKwh ?? 0) : total,
    0,
  );
  const totalConsumedKwh = readingsSnapshot.docs.reduce(
    (total, item) => total + Number(item.data().consumptionKwh ?? 0),
    0,
  );
  const remainingKwh = Math.max(0, totalPurchasedKwh - totalConsumedKwh);
  const remainingAmount = Number((remainingKwh * Number(shop.activePricePerKwh ?? 0)).toFixed(2));
  const threshold = Number(shop.lowCreditThresholdKwh ?? 50);
  const critical = Number(shop.criticalCreditThresholdKwh ?? 10);
  const balanceStatus = remainingKwh <= 0 ? 'EXHAUSTED' : remainingKwh <= critical ? 'CRITICAL' : remainingKwh <= threshold ? 'LOW' : 'OK';
  await updateDoc(doc(db, 'shops', shopId), {
    totalPurchasedKwh,
    totalConsumedKwh,
    remainingKwh,
    remainingAmount,
    balanceStatus,
    lastBalanceCalculatedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { totalPurchasedKwh, totalConsumedKwh, remainingKwh, remainingAmount, balanceStatus };
}

export async function createGallery(input) {
  const uid = actorId();
  const duplicate = await getDocs(query(collection(db, 'galleries'), where('code', '==', input.code)));
  if (!duplicate.empty) return fail('Ce code de galerie existe déjà.', 'already-exists');
  const reference = await addDoc(collection(db, 'galleries'), {
    ...input,
    defaultPricePerKwh: Number(input.defaultPricePerKwh ?? 0),
    lowCreditThresholdKwh: Number(input.lowCreditThresholdKwh ?? 50),
    criticalCreditThresholdKwh: Number(input.criticalCreditThresholdKwh ?? 10),
    status: 'ACTIVE',
    mainPowerStatus: 'UNKNOWN',
    mainEnergySource: 'UNKNOWN',
    createdByUserId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return result({ gallery: { id: reference.id, ...input } });
}

export async function updateGallery({ galleryId, patch }) {
  actorId();
  await updateDoc(doc(db, 'galleries', galleryId), { ...patch, updatedAt: serverTimestamp() });
  return result({ id: galleryId });
}

export async function archiveGallery({ galleryId, reason }) {
  actorId();
  await updateDoc(doc(db, 'galleries', galleryId), { status: 'ARCHIVED', archiveReason: reason ?? null, updatedAt: serverTimestamp() });
  return result({ id: galleryId });
}

export async function createShop(input) {
  const uid = actorId();
  const gallery = await getRequired(`galleries/${input.galleryId}`, 'Galerie introuvable.');
  const duplicate = await getDocs(query(collection(db, 'shops'), where('galleryId', '==', input.galleryId), where('code', '==', input.code)));
  if (!duplicate.empty) return fail('Ce code boutique existe déjà dans cette galerie.', 'already-exists');
  const data = {
    ...input,
    ownerIds: [], workerIds: [], meterIds: [], status: 'ACTIVE',
    customPricePerKwh: input.customPricePerKwh ?? null,
    lowCreditThresholdKwh: input.lowCreditThresholdKwh ?? null,
    criticalCreditThresholdKwh: input.criticalCreditThresholdKwh ?? null,
    currentPowerStatus: 'UNKNOWN', currentEnergySource: 'UNKNOWN',
    totalPurchasedKwh: 0, totalConsumedKwh: 0, remainingKwh: 0, remainingAmount: 0,
    activePricePerKwh: Number(gallery.defaultPricePerKwh ?? 0),
    averageDailyConsumptionKwh: null, estimatedDaysRemaining: null, estimatedDepletionDate: null,
    balanceStatus: 'UNKNOWN', lastReadingAt: null, lastPurchaseAt: null, lastBalanceCalculatedAt: null,
    createdByUserId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  const reference = await addDoc(collection(db, 'shops'), data);
  return result({ shop: { id: reference.id, ...data } });
}

export async function updateShop({ shopId, patch }) {
  actorId();
  await updateDoc(doc(db, 'shops', shopId), { ...patch, updatedAt: serverTimestamp() });
  return result({ id: shopId });
}

export async function archiveShop({ shopId, reason }) {
  actorId();
  await updateDoc(doc(db, 'shops', shopId), { status: 'ARCHIVED', archiveReason: reason ?? null, updatedAt: serverTimestamp() });
  return result({ id: shopId });
}

export async function createMeter(input) {
  const uid = actorId();
  const shop = await getRequired(`shops/${input.shopId}`, 'Boutique introuvable.');
  const duplicate = await getDocs(query(collection(db, 'meters'), where('galleryId', '==', shop.galleryId), where('code', '==', input.code)));
  if (!duplicate.empty) return fail('Ce code compteur existe déjà.', 'already-exists');
  const initialKwh = Number(input.initialKwh ?? 0);
  const reference = doc(collection(db, 'meters'));
  const data = {
    ...input, id: undefined, galleryId: shop.galleryId, initialKwh, lastTotalKwh: initialKwh,
    parentMeterId: input.parentMeterId ?? null, serialNumber: input.serialNumber ?? null,
    description: input.description ?? null, readingMode: 'MANUAL', status: 'ACTIVE',
    lastValidReadingId: null, lastReadingAt: null, createdByUserId: uid,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  delete data.id;
  const batch = writeBatch(db);
  batch.set(reference, data);
  batch.update(doc(db, `shops/${input.shopId}`), { meterIds: [...(shop.meterIds ?? []), reference.id], updatedAt: serverTimestamp() });
  await batch.commit();
  return result({ meter: { id: reference.id, ...data } });
}

export async function updateMeter({ meterId, patch }) {
  actorId();
  await updateDoc(doc(db, 'meters', meterId), { ...patch, updatedAt: serverTimestamp() });
  return result({ id: meterId });
}

export async function archiveMeter({ meterId, reason }) {
  actorId();
  await updateDoc(doc(db, 'meters', meterId), { status: 'ARCHIVED', archiveReason: reason ?? null, updatedAt: serverTimestamp() });
  return result({ id: meterId });
}

export async function createManualReading(input) {
  const uid = actorId();
  const meter = await getRequired(`meters/${input.meterId}`, 'Compteur introuvable.');
  const totalKwh = Number(input.totalKwh);
  if (!Number.isFinite(totalKwh) || totalKwh < Number(meter.lastTotalKwh ?? meter.initialKwh ?? 0)) {
    return fail('Le nouvel index doit être supérieur ou égal au dernier index.', 'failed-precondition');
  }
  const readingDate = parseDate(input.readingDate);
  const data = {
    galleryId: meter.galleryId, shopId: meter.shopId, meterId: input.meterId,
    previousTotalKwh: Number(meter.lastTotalKwh ?? meter.initialKwh ?? 0), totalKwh,
    consumptionKwh: totalKwh - Number(meter.lastTotalKwh ?? meter.initialKwh ?? 0),
    readingDate, notes: input.notes ?? null, evidenceImageUrl: input.evidenceImageUrl ?? null,
    status: 'VALID', validatedByUserId: uid, createdByUserId: uid,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  const reference = doc(collection(db, 'readings'));
  const batch = writeBatch(db);
  batch.set(reference, data);
  batch.update(doc(db, `meters/${input.meterId}`), { lastTotalKwh: totalKwh, lastValidReadingId: reference.id, lastReadingAt: readingDate, updatedAt: serverTimestamp() });
  await batch.commit();
  const balance = await recalculateBalance(meter.shopId);
  return result({ reading: { id: reference.id, ...data }, balance });
}

export async function createEnergyPurchase(input) {
  const uid = actorId();
  const shop = await getRequired(`shops/${input.shopId}`, 'Boutique introuvable.');
  const gallery = await getRequired(`galleries/${shop.galleryId}`, 'Galerie introuvable.');
  const purchasedKwh = Number(input.purchasedKwh);
  const pricePerKwh = Number(input.pricePerKwh ?? shop.customPricePerKwh ?? gallery.defaultPricePerKwh ?? 0);
  if (!Number.isFinite(purchasedKwh) || purchasedKwh <= 0) return fail('Quantité kWh invalide.', 'invalid-argument');
  const purchaseDate = parseDate(input.purchaseDate);
  const data = {
    galleryId: shop.galleryId, shopId: input.shopId,
    receiptNumber: `REC-${Date.now()}`, purchasedKwh, pricePerKwh,
    totalAmount: Number((purchasedKwh * pricePerKwh).toFixed(2)), currency: input.currency ?? gallery.currency ?? 'USD',
    paymentMethod: input.paymentMethod ?? 'CASH', paymentReference: input.paymentReference ?? null,
    receiptFileUrl: null, purchaseDate, status: 'VALID', createdByUserId: uid,
    cancelledByUserId: null, cancelledAt: null, cancellationReason: null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  const reference = await addDoc(collection(db, 'energyPurchases'), data);
  await updateDoc(doc(db, `shops/${input.shopId}`), { lastPurchaseAt: purchaseDate, updatedAt: serverTimestamp() });
  const balance = await recalculateBalance(input.shopId);
  return result({ purchase: { id: reference.id, ...data }, balance });
}

export async function cancelEnergyPurchase({ purchaseId, reason }) {
  const uid = actorId();
  const purchase = await getRequired(`energyPurchases/${purchaseId}`, 'Achat introuvable.');
  await updateDoc(doc(db, 'energyPurchases', purchaseId), { status: 'CANCELLED', cancelledByUserId: uid, cancelledAt: serverTimestamp(), cancellationReason: reason ?? null, updatedAt: serverTimestamp() });
  return result({ id: purchaseId, balance: await recalculateBalance(purchase.shopId) });
}

export async function createManualPowerEvent({ galleryId, status, source, notes }) {
  const uid = actorId();
  const reference = await addDoc(collection(db, `galleries/${galleryId}/powerEvents`), { galleryId, status, source: source ?? null, notes: notes ?? null, createdByUserId: uid, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'galleries', galleryId), { mainPowerStatus: status, mainEnergySource: source ?? 'UNKNOWN', updatedAt: serverTimestamp() });
  return result({ event: { id: reference.id } });
}

export async function createIncident(input) {
  const uid = actorId();
  const reference = await addDoc(collection(db, 'incidents'), { ...input, status: 'OPEN', createdByUserId: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return result({ incident: { id: reference.id, ...input } });
}

export async function updateIncidentStatus({ incidentId, status }) {
  actorId();
  await updateDoc(doc(db, 'incidents', incidentId), { status, updatedAt: serverTimestamp() });
  return result({ id: incidentId });
}

export async function acknowledgeAlert({ alertId }) {
  const uid = actorId();
  await updateDoc(doc(db, 'alerts', alertId), { status: 'ACKNOWLEDGED', acknowledgedAt: serverTimestamp(), acknowledgedByUserId: uid, updatedAt: serverTimestamp() });
  return result({ id: alertId });
}

export async function resolveAlert({ alertId }) {
  const uid = actorId();
  await updateDoc(doc(db, 'alerts', alertId), { status: 'RESOLVED', resolvedAt: serverTimestamp(), resolvedByUserId: uid, updatedAt: serverTimestamp() });
  return result({ id: alertId });
}

export async function updateManagedUser({ userId, patch }) {
  actorId();
  await updateDoc(doc(db, 'users', userId), { ...patch, updatedAt: serverTimestamp() });
  return result({ id: userId });
}

export async function archiveManagedUser({ targetUid, reason }) {
  actorId();
  await updateDoc(doc(db, 'users', targetUid), { status: 'ARCHIVED', archiveReason: reason ?? null, updatedAt: serverTimestamp() });
  return result({ id: targetUid });
}

export async function listUsersByGallery({ galleryId }) {
  actorId();
  const snapshot = await getDocs(query(collection(db, 'users'), where('galleryIds', 'array-contains', galleryId)));
  return result({ users: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) });
}

export function createManagedUser() {
  return fail('La création Auth des utilisateurs doit être faite dans Firebase Console sans Cloud Functions.', 'unavailable');
}

export function generateInvoice() {
  return fail('Les factures PDF sont désactivées dans le mode gratuit sans Storage ni Cloud Functions.', 'unavailable');
}
