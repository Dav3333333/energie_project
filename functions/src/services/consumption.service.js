const { db } = require('../config/admin');

/**
 * Récupère le dernier relevé VALID pour un compteur donné (hors celui en cours de création).
 */
async function getLastValidReading(meterId, { transaction = null, excludeReadingId = null } = {}) {
  const q = db
    .collection('readings')
    .where('meterId', '==', meterId)
    .where('status', '==', 'VALID')
    .orderBy('readingDate', 'desc')
    .limit(5);

  const snap = transaction ? await transaction.get(q) : await q.get();
  const docs = snap.docs.filter((d) => d.id !== excludeReadingId);
  return docs[0] ? { id: docs[0].id, ...docs[0].data() } : null;
}

module.exports = { getLastValidReading };