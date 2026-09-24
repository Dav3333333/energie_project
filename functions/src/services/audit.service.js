const { db, admin } = require('../config/admin');
const { AUDIT_ACTIONS } = require('../constants/actions');

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
    await db.collection('auditLogs').add({
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