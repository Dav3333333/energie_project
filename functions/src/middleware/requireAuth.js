const { db } = require('../config/admin');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { ROLES, USER_STATUS } = require('../constants/roles');

/**
 * Charge et vérifie l'utilisateur appelant.
 * Retourne { uid, role, status, galleryIds, shopIds }.
 */
async function requireAuth(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new AppError(ERROR_CODES.UNAUTHENTICATED, 'Authentification requise.');
  }

  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Profil utilisateur introuvable.');
  }

  const profile = snap.data();
  if (profile.status !== USER_STATUS.ACTIVE) {
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Compte inactif ou suspendu.');
  }

  return {
    uid,
    role: profile.role,
    status: profile.status,
    galleryIds: profile.galleryIds ?? [],
    shopIds: profile.shopIds ?? [],
    profile,
  };
}

function requireRole(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Rôle non autorisé pour cette opération.');
  }
}

function requireGalleryAccess(user, galleryId) {
  if (user.role === ROLES.SUPER_ADMIN) return;
  if (!user.galleryIds?.includes(galleryId)) {
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Accès à cette galerie refusé.');
  }
}

function requireShopAccess(user, shopId) {
  if (user.role === ROLES.SUPER_ADMIN) return;
  if (!user.shopIds?.includes(shopId)) {
    throw new AppError(ERROR_CODES.PERMISSION_DENIED, 'Accès à cette boutique refusé.');
  }
}

module.exports = { requireAuth, requireRole, requireGalleryAccess, requireShopAccess };