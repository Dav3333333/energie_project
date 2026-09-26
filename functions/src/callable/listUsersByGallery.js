const { onCall } = require('firebase-functions/v2/https');
const { z } = require('zod');
const { validate } = require('../utils/validate');
const { AppError, ERROR_CODES, toHttpsError } = require('../utils/errors');
const { requireAuth, requireGalleryAccess } = require('../middleware/requireAuth');
const { db } = require('../config/admin');
const { ROLES } = require('../constants/roles');

const Schema = z.object({ galleryId: z.string().min(1).optional() });

/**
 * Liste les utilisateurs rattachés à une galerie (admins, techniciens, owners, workers).
 * Réservé aux SUPER_ADMIN et GALLERY_ADMIN de la galerie.
 */
exports.listUsersByGallery = onCall({ region: 'us-central1' }, async (req) => {
  try {
    const actor = await requireAuth(req);
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.GALLERY_ADMIN) {
      throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé.');
    }
    const input = validate(req.data, Schema);
    if (actor.role === ROLES.GALLERY_ADMIN && !input.galleryId) {
      throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Une galerie est requise.');
    }
    if (input.galleryId) requireGalleryAccess(actor, input.galleryId);

    let usersQuery = db.collection('users');
    if (input.galleryId) {
      usersQuery = usersQuery.where('galleryIds', 'array-contains', input.galleryId);
    }
    const snap = await usersQuery.limit(500).get();

    const users = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: data.uid ?? d.id,
        email: data.email,
        username: data.username,
        fullName: data.fullName,
        role: data.role,
        status: data.status,
        galleryIds: data.galleryIds ?? [],
        shopIds: data.shopIds ?? [],
      };
    });
    return { ok: true, users };
  } catch (err) {
    throw toHttpsError(err);
  }
});