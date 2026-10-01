import { fb } from './base';
import { fb as _fb } from './base';

function startOfDayUtc(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}


export async function acknowledgeAlert({ alertId, actorUserId, actorRole }) {
  const ref = _fb.doc(_fb.db, 'alerts', alertId);
  const snap = await _fb.getDoc(ref);
  if (!snap.exists()) throw new Error('Alerte introuvable.');
  await _fb.updateDoc(ref, {
    status: 'ACKNOWLEDGED',
    acknowledgedAt: _fb.serverTimestamp(),
    acknowledgedByUserId: actorUserId,
  });
}

export async function resolveAlert({ alertId, actorUserId, actorRole }) {
  const ref = _fb.doc(_fb.db, 'alerts', alertId);
  const snap = await _fb.getDoc(ref);
  if (!snap.exists()) throw new Error('Alerte introuvable.');
  await _fb.updateDoc(ref, {
    status: 'RESOLVED',
    resolvedAt: _fb.serverTimestamp(),
    resolvedByUserId: actorUserId,
  });
}

/**
 * Parcourt les boutiques ACTIVE et crée les alertes crédit manquantes.
 * À appeler depuis le dashboard d'un SUPER_ADMIN ou GALLERY_ADMIN au chargement.
 * (Remplace l'ancienne scheduled function.)
 */
export async function runCheckLowCredits() {
  const statuses = ['LOW', 'CRITICAL', 'EXHAUSTED'];
  let created = 0;
  for (const status of statuses) {
    const q = fb.query(
      fb.collection(fb.db, 'shops'),
      fb.where('status', '==', 'ACTIVE'),
      fb.where('balanceStatus', '==', status),
      fb.limit(500),
    );
    const snap = await fb.getDocs(q);
    for (const d of snap.docs) {
      const shop = d.data();
      const conf = {
        LOW: { type: 'LOW_CREDIT', severity: 'WARNING', title: 'Crédit faible' },
        CRITICAL: { type: 'CRITICAL_CREDIT', severity: 'CRITICAL', title: 'Crédit critique' },
        EXHAUSTED: { type: 'EXHAUSTED_CREDIT', severity: 'CRITICAL', title: 'Crédit épuisé' },
      }[status];
      const a = await createAlertIfNotExists({
        galleryId: shop.galleryId,
        shopId: d.id,
        type: conf.type, severity: conf.severity, title: conf.title,
        message: `${shop.name} (${shop.code}) — ${status}. Reste ${shop.remainingKwh ?? 0} kWh.`,
        relatedEntityType: 'shop', relatedEntityId: d.id,
      });
      if (a) created += 1;
    }
  }
  return { created };
}

export async function createAlertIfNotExists({
  galleryId, shopId = null, type, severity, title, message,
  relatedEntityType = null, relatedEntityId = null,
}) {
  const since = fb.Timestamp.fromDate(startOfDayUtc());

  const q = fb.query(
    fb.collection(fb.db, 'alerts'),
    fb.where('shopId', '==', shopId),
    fb.where('type', '==', type),
    fb.where('createdAt', '>=', since),
    fb.limit(1),
  );
  const existing = await fb.getDocs(q);
  if (!existing.empty) return null;

  const ref = fb.doc(fb.collection(fb.db, 'alerts'));
  await fb.setDoc(ref, {
    galleryId,
    shopId,
    type,
    severity,
    title,
    message,
    status: 'OPEN',
    relatedEntityType,
    relatedEntityId,
    createdAt: fb.serverTimestamp(),
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    resolvedAt: null,
    resolvedByUserId: null,
  });
  return { id: ref.id };
}