import { fb, toError } from './base';
import { getAuth } from 'firebase/auth';

export const AUDIT_ACTIONS = Object.freeze({
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_ARCHIVED: 'USER_ARCHIVED',
  GALLERY_CREATED: 'GALLERY_CREATED',
  GALLERY_UPDATED: 'GALLERY_UPDATED',
  GALLERY_ARCHIVED: 'GALLERY_ARCHIVED',
  SHOP_CREATED: 'SHOP_CREATED',
  SHOP_UPDATED: 'SHOP_UPDATED',
  SHOP_ARCHIVED: 'SHOP_ARCHIVED',
  METER_CREATED: 'METER_CREATED',
  METER_UPDATED: 'METER_UPDATED',
  METER_ARCHIVED: 'METER_ARCHIVED',
  READING_CREATED: 'READING_CREATED',
  READING_INVALIDATED: 'READING_INVALIDATED',
  PURCHASE_CREATED: 'PURCHASE_CREATED',
  PURCHASE_CANCELLED: 'PURCHASE_CANCELLED',
  POWER_EVENT_CREATED: 'POWER_EVENT_CREATED',
  INCIDENT_CREATED: 'INCIDENT_CREATED',
  INCIDENT_STATUS_UPDATED: 'INCIDENT_STATUS_UPDATED',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  ALERT_ACKNOWLEDGED: 'ALERT_ACKNOWLEDGED',
  ALERT_RESOLVED: 'ALERT_RESOLVED',
});

/**
 * Écrit une entrée d'audit. Tolérant : n'échoue jamais le flux métier.
 */
export async function writeAuditLog({
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
    const auth = getAuth();
    const uid = actorUserId ?? auth.currentUser?.uid;
    if (!uid) return;
    await fb.addDoc(fb.collection(fb.db, 'auditLogs'), {
      action,
      entityType,
      entityId,
      galleryId,
      shopId,
      actorUserId: uid,
      actorRole: actorRole ?? null,
      previousData,
      newData,
      reason,
      createdAt: fb.serverTimestamp(),
    });
  } catch (err) {
    console.error('[AuditLog] Échec écriture :', err);
  }
}