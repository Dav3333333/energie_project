const { db, admin } = require('../config/admin');
const { AUDIT_ACTIONS } = require('../constants/actions');

/**
 * Écrit une entrée d'audit. Toujours exécuté côté serveur.
 * Tolérant : ne fait jamais échouer la mutation métier si l'audit échoue.
 */
async function writeAuditLog({
  action,
  entityType,
  entityId,
  galleryId = null,
  shopId = null,
  actorUserId,
  actorRole,
  previousData = null,
  newData = null,
  reason = null,
}) {
  try {
    const ref = db.collection('auditLogs').doc();
    await ref.set({
      action,
      entityType,
      entityId,
      galleryId,
      shopId,
      actorUserId,
      actorRole,
      previousData,
      newData,
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[AuditLog] Échec écriture :', err);
  }
}

module.exports = { writeAuditLog, AUDIT_ACTIONS };