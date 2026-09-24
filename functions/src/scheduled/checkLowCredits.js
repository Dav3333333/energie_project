const { onSchedule } = require('firebase-functions/v2/scheduler');
const { db } = require('../config/admin');
const {
  createAlertIfNotExists,
  ALERT_TYPE,
  SEVERITY,
} = require('../services/alert.service');

/**
 * Exécution quotidienne (03:00 UTC) — parcourt les boutiques actives
 * et crée les alertes de crédit manquantes sans doublons.
 */
exports.checkLowCredits = onSchedule(
  { region: 'us-central1', schedule: '0 3 * * *', timeZone: 'UTC' },
  async () => {
    const statuses = ['LOW', 'CRITICAL', 'EXHAUSTED'];
    let created = 0;
    let scanned = 0;

    for (const status of statuses) {
      const snap = await db
        .collection('shops')
        .where('status', '==', 'ACTIVE')
        .where('balanceStatus', '==', status)
        .limit(1000)
        .get();

      for (const doc of snap.docs) {
        scanned += 1;
        const shop = doc.data();
        const map = {
          LOW: { type: ALERT_TYPE.LOW_CREDIT, severity: SEVERITY.WARNING, title: 'Crédit faible' },
          CRITICAL: { type: ALERT_TYPE.CRITICAL_CREDIT, severity: SEVERITY.CRITICAL, title: 'Crédit critique' },
          EXHAUSTED: { type: ALERT_TYPE.EXHAUSTED_CREDIT, severity: SEVERITY.CRITICAL, title: 'Crédit épuisé' },
        }[status];

        const alert = await createAlertIfNotExists({
          galleryId: shop.galleryId,
          shopId: doc.id,
          type: map.type,
          severity: map.severity,
          title: map.title,
          message:
            `${shop.name} (${shop.code}) — ${status}. ` +
            `Reste ${shop.remainingKwh ?? 0} kWh.`,
          relatedEntityType: 'shop',
          relatedEntityId: doc.id,
        });
        if (alert) created += 1;
      }
    }

    console.log(`[checkLowCredits] scanned=${scanned} created=${created}`);
    return { scanned, created };
  },
);