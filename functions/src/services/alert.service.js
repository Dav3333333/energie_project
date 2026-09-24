const { db, admin } = require('../config/admin');

const ALERT_TYPE = Object.freeze({
  LOW_CREDIT: 'LOW_CREDIT',
  CRITICAL_CREDIT: 'CRITICAL_CREDIT',
  EXHAUSTED_CREDIT: 'EXHAUSTED_CREDIT',
  MANUAL_OUTAGE: 'MANUAL_OUTAGE',
  MANUAL_UNSTABLE_POWER: 'MANUAL_UNSTABLE_POWER',
  READING_ANOMALY: 'READING_ANOMALY',
  INCIDENT: 'INCIDENT',
});

const SEVERITY = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
});

const BALANCE_TO_ALERT = {
  LOW: { type: ALERT_TYPE.LOW_CREDIT, severity: SEVERITY.WARNING, title: 'Crédit faible' },
  CRITICAL: { type: ALERT_TYPE.CRITICAL_CREDIT, severity: SEVERITY.CRITICAL, title: 'Crédit critique' },
  EXHAUSTED: { type: ALERT_TYPE.EXHAUSTED_CREDIT, severity: SEVERITY.CRITICAL, title: 'Crédit épuisé' },
};

/**
 * Retourne le début du jour courant (UTC) pour la déduplication.
 */
function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Crée une alerte si aucune alerte équivalente n'existe le même jour (OPEN ou ACKNOWLEDGED).
 * Retourne le document créé ou null si dédupliqué.
 */
async function createAlertIfNotExists({
  galleryId,
  shopId = null,
  type,
  severity,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
}) {
  const since = admin.firestore.Timestamp.fromDate(startOfDay());

  const q = db
    .collection('alerts')
    .where('shopId', '==', shopId)
    .where('type', '==', type)
    .where('createdAt', '>=', since)
    .limit(1);

  const existing = await q.get();
  if (!existing.empty) return null;

  const ref = db.collection('alerts').doc();
  await ref.set({
    galleryId,
    shopId,
    type,
    severity,
    title,
    message,
    status: 'OPEN',
    relatedEntityType,
    relatedEntityId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    resolvedAt: null,
    resolvedByUserId: null,
  });
  return { id: ref.id };
}

/**
 * Après recalcul de solde, génère l'alerte correspondant au statut si LOW/CRITICAL/EXHAUSTED.
 */
async function maybeCreateBalanceAlert(shopId, balanceResult) {
  const map = BALANCE_TO_ALERT[balanceResult.balanceStatus];
  if (!map) return null;

  const shopSnap = await db.collection('shops').doc(shopId).get();
  const shop = shopSnap.data();

  return createAlertIfNotExists({
    galleryId: shop.galleryId,
    shopId,
    type: map.type,
    severity: map.severity,
    title: map.title,
    message:
      `${shop.name} (${shop.code}) — ${balanceResult.balanceStatus}. ` +
      `Reste ${balanceResult.remainingKwh} kWh.`,
    relatedEntityType: 'shop',
    relatedEntityId: shopId,
  });
}

module.exports = {
  createAlertIfNotExists,
  maybeCreateBalanceAlert,
  ALERT_TYPE,
  SEVERITY,
};