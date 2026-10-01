import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';
import { createAlertIfNotExists } from './alerts';

export async function createManualPowerEvent({ input, actorUserId, actorRole }) {
  const now = fb.serverTimestamp();
  const eventRef = fb.doc(fb.collection(fb.db, `galleries/${input.galleryId}/powerEvents`));

  const eventData = {
    scope: input.shopId ? 'SHOP' : 'GALLERY',
    shopId: input.shopId ?? null,
    powerStatus: input.powerStatus,
    energySource: input.energySource ?? 'UNKNOWN',
    description: input.description ?? null,
    source: 'MANUAL',
    declaredByUserId: actorUserId,
    declaredAt: now,
    resolvedAt: input.powerStatus === 'AVAILABLE' ? now : null,
    createdAt: now, updatedAt: now,
  };

  await fb.runTransaction(fb.db, async (tx) => {
    tx.set(eventRef, eventData);
    if (input.shopId) {
      tx.update(fb.doc(fb.db, 'shops', input.shopId), {
        currentPowerStatus: input.powerStatus,
        currentEnergySource: input.energySource ?? 'UNKNOWN',
        updatedAt: now,
      });
    } else {
      tx.update(fb.doc(fb.db, 'galleries', input.galleryId), {
        mainPowerStatus: input.powerStatus,
        mainEnergySource: input.energySource ?? 'UNKNOWN',
        updatedAt: now,
      });
    }
  });

  if (input.powerStatus === 'OUTAGE' || input.powerStatus === 'UNSTABLE') {
    await createAlertIfNotExists({
      galleryId: input.galleryId,
      shopId: input.shopId ?? null,
      type: input.powerStatus === 'OUTAGE' ? 'MANUAL_OUTAGE' : 'MANUAL_UNSTABLE_POWER',
      severity: input.powerStatus === 'OUTAGE' ? 'CRITICAL' : 'WARNING',
      title: input.powerStatus === 'OUTAGE' ? 'Coupure déclarée' : 'Courant instable déclaré',
      message: input.description || `Déclaration manuelle : ${input.powerStatus}.`,
      relatedEntityType: 'powerEvent', relatedEntityId: eventRef.id,
    });
  }

  await writeAuditLog({
    action: AUDIT_ACTIONS.POWER_EVENT_CREATED,
    entityType: 'powerEvent', entityId: eventRef.id,
    galleryId: input.galleryId, shopId: input.shopId ?? null,
    actorUserId, actorRole,
    newData: { powerStatus: input.powerStatus, energySource: input.energySource },
  });

  return { eventId: eventRef.id };
}