const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const {
  requireAuth, requireGalleryAccess, requireShopAccess,
} = require('../middleware/requireAuth');
const { writeAuditLog } = require('../services/audit.service');
const { createIncident, updateIncidentStatus, INCIDENT_STATUS, INCIDENT_PRIORITY, INCIDENT_CATEGORY } = require('../services/incident.service');
const { AUDIT_ACTIONS } = require('../constants/actions');
const { ROLES } = require('../constants/roles');
const { db } = require('../config/admin');

// -------------------------------------------------------------------- create
const CreateSchema = z.object({
  galleryId: z.string().min(1).optional(),
  shopId: z.string().nullable().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(2000),
  category: z.enum(INCIDENT_CATEGORY),
  priority: z.enum(INCIDENT_PRIORITY),
  assignedToUserId: z.string().nullable().optional(),
});

exports.createIncident = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, CreateSchema);
    if (input.galleryId) requireGalleryAccess(actor, input.galleryId);
    if (input.shopId) requireShopAccess(actor, input.shopId);

    const incident = await createIncident({ input, actorUserId: actor.uid });

    await writeAuditLog({
      action: AUDIT_ACTIONS.INCIDENT_CREATED,
      entityType: 'incident',
      entityId: incident.id,
      galleryId: incident.galleryId,
      shopId: incident.shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      newData: { title: incident.title, category: incident.category, priority: incident.priority },
    });
    return { ok: true, incident: { id: incident.id } };
  } catch (err) {
    throw toHttpsError(err);
  }
});

// -------------------------------------------------------------------- update
const UpdateSchema = z.object({
  incidentId: z.string().min(1),
  status: z.enum(INCIDENT_STATUS),
  assignedToUserId: z.string().nullable().optional(),
  resolutionNotes: z.string().max(2000).nullable().optional(),
});

exports.updateIncidentStatus = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (![ROLES.SUPER_ADMIN, ROLES.GALLERY_ADMIN, ROLES.TECHNICIAN].includes(actor.role)) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, UpdateSchema);

    const snap = await db.collection('incidents').doc(input.incidentId).get();
    if (!snap.exists) throw new AppError(ERROR_CODES.NOT_FOUND, 'Incident introuvable.');
    requireGalleryAccess(actor, snap.data().galleryId);

    const result = await updateIncidentStatus({
      incidentId: input.incidentId,
      input,
      actorUserId: actor.uid,
    });

    await writeAuditLog({
      action: AUDIT_ACTIONS.INCIDENT_STATUS_UPDATED,
      entityType: 'incident',
      entityId: input.incidentId,
      galleryId: result.previous.galleryId,
      shopId: result.previous.shopId,
      actorUserId: actor.uid,
      actorRole: actor.role,
      previousData: { status: result.previous.status },
      newData: { status: input.status },
    });
    return { ok: true };
  } catch (err) {
    throw toHttpsError(err);
  }
});