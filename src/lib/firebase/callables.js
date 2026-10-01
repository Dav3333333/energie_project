/**
 * Routeur d'API client-side. Remplace les anciennes Cloud Functions.
 * Chaque méthode appelle un service dans src/lib/services/.
 *
 * La forme de retour imite `httpsCallable` ({ data: ... }) pour
 * compatibilité avec les pages existantes.
 */
import { getAuth } from 'firebase/auth';
import * as Users from '@/lib/services/users';
import * as Galleries from '@/lib/services/galleries';
import * as Shops from '@/lib/services/shops';
import * as Meters from '@/lib/services/meters';
import * as Readings from '@/lib/services/readings';
import * as Purchases from '@/lib/services/purchases';
import * as Alerts from '@/lib/services/alerts';
import * as PowerEvents from '@/lib/services/powerEvents';
import * as Incidents from '@/lib/services/incidents';
import * as Invoices from '@/lib/services/invoices';

function currentActor() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('unauthenticated');
  return user.uid;
}

/**
 * Wrapper qui fournit un retour { data: ... } et rejette comme httpsCallable.
 */
async function invoke(fn, ...args) {
  const data = await fn(...args);
  return { data };
}

// Cache du profil pour éviter des lectures répétées.
let _profileCache = null;
async function getActorProfile() {
  if (_profileCache) return _profileCache;
  const uid = currentActor();
  const { getDoc, doc } = await import('firebase/firestore');
  const { db } = await import('./firebase');
  const snap = await getDoc(doc(db, 'users', uid));
  _profileCache = snap.exists() ? { uid, ...snap.data() } : null;
  return _profileCache;
}
export function invalidateActorProfileCache() {
  _profileCache = null;
}

// ---------------------------------------------------------------- Users
async function _userCtx() {
  const actor = await getActorProfile();
  return { actorUserId: actor.uid, actorRole: actor.role, actorFullName: actor.fullName, actorEmail: actor.email };
}

export const callables = {
  // --- Users ------------------------------------------------------------
  createManagedUser: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      return Users.createManagedUser({ ...payload, ...ctx });
    }),

  updateManagedUser: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      const actor = await getActorProfile();
      const isSuperAdmin = actor.role === 'SUPER_ADMIN';
      await Users.updateManagedUser({ ...payload, ...ctx, allowPrivilegedChange: isSuperAdmin });
      return { ok: true, uid: payload.targetUid };
    }),

  archiveManagedUser: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Users.archiveManagedUser({ ...payload, ...ctx });
      return { ok: true, uid: payload.targetUid };
    }),

  listUsersByGallery: (payload) =>
    invoke(async () => {
      const users = await Users.listUsersByGallery(payload.galleryId);
      return { ok: true, users };
    }),

  // --- Galeries ---------------------------------------------------------
  createGallery: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      const g = await Galleries.createGallery({ input: payload, ...ctx });
      return { ok: true, gallery: { id: g.id } };
    }),

  updateGallery: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Galleries.updateGallery({ galleryId: payload.galleryId, patch: payload.patch, ...ctx });
      return { ok: true };
    }),

  archiveGallery: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Galleries.archiveGallery({ ...payload, ...ctx });
      return { ok: true };
    }),

  // --- Boutiques --------------------------------------------------------
  createShop: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      const s = await Shops.createShop({ input: payload, ...ctx });
      return { ok: true, shop: { id: s.id } };
    }),

  updateShop: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Shops.updateShop({ shopId: payload.shopId, patch: payload.patch, ...ctx });
      return { ok: true };
    }),

  archiveShop: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Shops.archiveShop({ ...payload, ...ctx });
      return { ok: true };
    }),

  // --- Compteurs --------------------------------------------------------
  createMeter: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      const m = await Meters.createMeter({ input: payload, ...ctx });
      return { ok: true, meter: { id: m.id } };
    }),

  updateMeter: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Meters.updateMeter({ meterId: payload.meterId, patch: payload.patch, ...ctx });
      return { ok: true };
    }),

  archiveMeter: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Meters.archiveMeter({ ...payload, ...ctx });
      return { ok: true };
    }),

  // --- Relevés ----------------------------------------------------------
  createManualReading: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      return Readings.createManualReading({ input: payload, ...ctx });
    }),

  // --- Achats -----------------------------------------------------------
  createEnergyPurchase: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      const r = await Purchases.createEnergyPurchase({ input: payload, ...ctx });
      return {
        ok: true,
        purchase: { id: r.id, receiptNumber: r.receiptNumber, purchasedKwh: r.purchasedKwh, totalAmount: r.totalAmount, currency: r.currency },
        balance: r.balance ? { remainingKwh: r.balance.remainingKwh, remainingAmount: r.balance.remainingAmount, balanceStatus: r.balance.balanceStatus } : null,
      };
    }),

  cancelEnergyPurchase: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Purchases.cancelEnergyPurchase({ ...payload, ...ctx });
      return { ok: true };
    }),

  // --- Alertes ----------------------------------------------------------
  acknowledgeAlert: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Alerts.acknowledgeAlert?.({ ...payload, ...ctx });
      return { ok: true };
    }),

  resolveAlert: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Alerts.resolveAlert?.({ ...payload, ...ctx });
      return { ok: true };
    }),

  // --- Power events -----------------------------------------------------
  createManualPowerEvent: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      const r = await PowerEvents.createManualPowerEvent({ input: payload, ...ctx });
      return { ok: true, eventId: r.eventId };
    }),

  // --- Incidents --------------------------------------------------------
  createIncident: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      const i = await Incidents.createIncident({ input: payload, ...ctx });
      return { ok: true, incident: { id: i.id } };
    }),

  updateIncidentStatus: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      await Incidents.updateIncidentStatus({ incidentId: payload.incidentId, input: payload, ...ctx });
      return { ok: true };
    }),

  // --- Factures ---------------------------------------------------------
  generateInvoice: (payload) =>
    invoke(async () => {
      const ctx = await _userCtx();
      const r = await Invoices.generateInvoice({ input: payload, ...ctx });
      return { ok: true, invoice: { id: r.id, invoiceNumber: r.invoiceNumber, pdfUrl: r.pdfUrl } };
    }),
};

/**
 * Normalise une erreur (identique à la version httpsCallable).
 */
export function callableError(err) {
  return {
    code: err?.code ?? 'unknown',
    message: err?.message ?? 'Une erreur est survenue.',
    details: err?.details ?? null,
  };
}
