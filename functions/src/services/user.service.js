const { db, auth, admin } = require('../config/admin');
const { AppError, ERROR_CODES } = require('../utils/errors');
const { ROLES, USER_STATUS } = require('../constants/roles');

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;

function normalizeUsername(input) {
  return String(input ?? '').trim().toLowerCase();
}

function isValidUsername(username) {
  return USERNAME_REGEX.test(username);
}

/**
 * Crée un utilisateur Firebase Auth + son profil Firestore + le mapping username.
 * Utilise une transaction pour la cohérence Firestore, et supprime l'utilisateur
 * Auth en cas d'échec Firestore (best effort).
 */
async function createManagedUser({
  email,
  password,
  username,
  firstName,
  lastName,
  phone = null,
  role,
  galleryIds = [],
  shopIds = [],
  createdByUserId,
  actorRole,
}) {
  const usernameNormalized = normalizeUsername(username);
  if (!isValidUsername(usernameNormalized)) {
    throw new AppError(
      ERROR_CODES.INVALID_ARGUMENT,
      "Nom d'utilisateur invalide (3-30 caractères, minuscules, lettres/chiffres/._).",
    );
  }

  // Vérifications préalables.
  const usernameRef = db.collection('usernames').doc(usernameNormalized);
  const usernameSnap = await usernameRef.get();
  if (usernameSnap.exists) {
    throw new AppError(ERROR_CODES.ALREADY_EXISTS, "Ce nom d'utilisateur est déjà pris.");
  }

  try {
    await auth.getUserByEmail(email);
    throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Un compte existe déjà avec cet email.');
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
  }

  // Création Auth.
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
      disabled: false,
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new AppError(ERROR_CODES.ALREADY_EXISTS, 'Un compte existe déjà avec cet email.');
    }
    if (err.code === 'auth/invalid-password') {
      throw new AppError(ERROR_CODES.INVALID_ARGUMENT, 'Mot de passe trop faible.');
    }
    throw err;
  }

  const uid = userRecord.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Écriture Firestore en transaction.
  try {
    await db.runTransaction(async (tx) => {
      // Re-vérifier username dans la transaction.
      const txUsernameSnap = await tx.get(usernameRef);
      if (txUsernameSnap.exists) {
        throw new AppError(ERROR_CODES.ALREADY_EXISTS, "Ce nom d'utilisateur est déjà pris.");
      }

      tx.set(db.collection('users').doc(uid), {
        uid,
        email,
        username: usernameNormalized,
        usernameNormalized,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        phone,
        role,
        status: USER_STATUS.ACTIVE,
        galleryIds,
        shopIds,
        createdAt: now,
        updatedAt: now,
        createdByUserId,
        lastLoginAt: null,
      });

      tx.set(usernameRef, {
        uid,
        email,
        createdAt: now,
      });

      // Sous-collections galerie
      for (const gid of galleryIds) {
        if (role === ROLES.GALLERY_ADMIN) {
          tx.set(db.doc(`galleries/${gid}/admins/${uid}`), {
            userId: uid,
            assignedAt: now,
            assignedByUserId: createdByUserId,
          });
        }
        if (role === ROLES.TECHNICIAN) {
          tx.set(db.doc(`galleries/${gid}/technicians/${uid}`), {
            userId: uid,
            assignedAt: now,
            assignedByUserId: createdByUserId,
          });
        }
      }
    });
  } catch (err) {
    // Rollback Auth.
    await auth.deleteUser(uid).catch((e) => console.error('[Rollback Auth]', e));
    throw err;
  }

  return {
    uid,
    email,
    username: usernameNormalized,
    role,
    status: USER_STATUS.ACTIVE,
    galleryIds,
    shopIds,
  };
}

/**
 * Met à jour un utilisateur géré (profil, statut, rôle, relations).
 * @param {boolean} allowPrivilegedChange - true si acteur SUPER_ADMIN (peut changer rôle/relations).
 */
async function updateManagedUser({
  targetUid,
  patch,
  actorUserId,
  actorRole,
  allowPrivilegedChange,
}) {
  const userRef = db.collection('users').doc(targetUid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Utilisateur introuvable.');
  }
  const previous = snap.data();

  const now = admin.firestore.FieldValue.serverTimestamp();
  const next = { ...patch, updatedAt: now };

  if (!allowPrivilegedChange) {
    delete next.role;
    delete next.status;
    delete next.galleryIds;
    delete next.shopIds;
  }

  await userRef.update(next);

  // Mise à jour des sous-collections si les galeries changent (TECHNICIAN / GALLERY_ADMIN).
  if (allowPrivilegedChange && patch.galleryIds !== undefined) {
    const before = new Set(previous.galleryIds ?? []);
    const after = new Set(patch.galleryIds ?? []);
    const role = patch.role ?? previous.role;

    const toAdd = [...after].filter((g) => !before.has(g));
    const toRemove = [...before].filter((g) => !after.has(g));

    const batch = db.batch();
    for (const gid of toAdd) {
      if (role === ROLES.GALLERY_ADMIN) {
        batch.set(db.doc(`galleries/${gid}/admins/${targetUid}`), {
          userId: targetUid,
          assignedAt: now,
          assignedByUserId: actorUserId,
        });
      }
      if (role === ROLES.TECHNICIAN) {
        batch.set(db.doc(`galleries/${gid}/technicians/${targetUid}`), {
          userId: targetUid,
          assignedAt: now,
          assignedByUserId: actorUserId,
        });
      }
    }
    for (const gid of toRemove) {
      batch.delete(db.doc(`galleries/${gid}/admins/${targetUid}`));
      batch.delete(db.doc(`galleries/${gid}/technicians/${targetUid}`));
    }
    await batch.commit();
  }

  return { uid: targetUid, previous, updated: next };
}

/**
 * Archive un utilisateur (statut ARCHIVED, désactivation Auth).
 * Aucune suppression physique.
 */
async function archiveManagedUser({ targetUid, reason, actorUserId }) {
  const userRef = db.collection('users').doc(targetUid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Utilisateur introuvable.');
  }
  const previous = snap.data();

  await userRef.update({
    status: USER_STATUS.ARCHIVED,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    archivedAt: admin.firestore.FieldValue.serverTimestamp(),
    archivedByUserId: actorUserId,
    archiveReason: reason ?? null,
  });

  await auth.updateUser(targetUid, { disabled: true }).catch((err) => {
    console.error('[archiveManagedUser] Auth disable failed:', err);
  });

  return { uid: targetUid, previous };
}

module.exports = {
  createManagedUser,
  updateManagedUser,
  archiveManagedUser,
  normalizeUsername,
  isValidUsername,
};