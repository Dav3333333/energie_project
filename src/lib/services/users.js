import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword, updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { fb, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;

function normalizeUsername(input) {
  return String(input ?? '').trim().toLowerCase();
}

/**
 * Crée un utilisateur Firebase Auth via une instance secondaire
 * pour ne pas déconnecter l'admin courant.
 */
async function createAuthUserSecondary(email, password, displayName) {
  const primaryConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const secondary = initializeApp(primaryConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondary);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    await updateProfile(cred.user, { displayName });
    await fbSignOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondary);
  }
}

export async function createManagedUser({
  email, password, username, firstName, lastName, phone = null,
  role, galleryIds = [], shopIds = [],
  createdByUserId, actorRole,
}) {
  const superAdminRoles = ['SUPER_ADMIN', 'GALLERY_ADMIN', 'TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'];
  const galleryAdminRoles = ['TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'];
  if (!(actorRole === 'SUPER_ADMIN' ? superAdminRoles : galleryAdminRoles).includes(role)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Vous ne pouvez pas créer un utilisateur avec ce rôle.');
  }
  if (!['SUPER_ADMIN', 'GALLERY_ADMIN'].includes(actorRole)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Seuls les administrateurs peuvent créer des utilisateurs.');
  }

  const usernameNormalized = normalizeUsername(username);
  if (!USERNAME_REGEX.test(usernameNormalized)) {
    throw new AppError(ERR.INVALID_ARGUMENT, "Nom d'utilisateur invalide (3-30 caractères).");
  }

  const usernameRef = fb.doc(fb.db, 'usernames', usernameNormalized);
  const usernameSnap = await fb.getDoc(usernameRef);
  if (usernameSnap.exists()) {
    throw new AppError(ERR.ALREADY_EXISTS, "Ce nom d'utilisateur est déjà pris.");
  }

  let uid;
  try {
    uid = await createAuthUserSecondary(email, password, `${firstName} ${lastName}`.trim());
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      throw new AppError(ERR.ALREADY_EXISTS, 'Un compte existe déjà avec cet email.');
    }
    if (err.code === 'auth/weak-password') {
      throw new AppError(ERR.INVALID_ARGUMENT, 'Mot de passe trop faible.');
    }
    throw err;
  }

  const now = fb.serverTimestamp();
  await fb.runTransaction(fb.db, async (tx) => {
      const txUserSnap = await tx.get(usernameRef);
      if (txUserSnap.exists()) {
        throw new AppError(ERR.ALREADY_EXISTS, "Ce nom d'utilisateur est déjà pris.");
      }

      tx.set(fb.doc(fb.db, 'users', uid), {
        uid,
        email,
        username: usernameNormalized,
        usernameNormalized,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        phone,
        role,
        status: 'ACTIVE',
        galleryIds,
        shopIds,
        createdAt: now,
        updatedAt: now,
        createdByUserId,
        lastLoginAt: null,
      });

      tx.set(usernameRef, { uid, email, createdAt: now });

      for (const gid of galleryIds) {
        if (role === 'GALLERY_ADMIN') {
          tx.set(fb.doc(fb.db, `galleries/${gid}/admins/${uid}`), {
            userId: uid, assignedAt: now, assignedByUserId: createdByUserId,
          });
        }
        if (role === 'TECHNICIAN') {
          tx.set(fb.doc(fb.db, `galleries/${gid}/technicians/${uid}`), {
            userId: uid, assignedAt: now, assignedByUserId: createdByUserId,
          });
        }
      }
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: 'user',
    entityId: uid,
    galleryId: galleryIds[0] ?? null,
    shopId: shopIds[0] ?? null,
    actorUserId: createdByUserId,
    actorRole,
    newData: { uid, email, username: usernameNormalized, role, galleryIds, shopIds },
  });

  return { uid, email, username: usernameNormalized, role, status: 'ACTIVE', galleryIds, shopIds };
}

export async function updateManagedUser({
  targetUid, patch, actorUserId, actorRole, allowPrivilegedChange,
}) {
  const ref = fb.doc(fb.db, 'users', targetUid);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Utilisateur introuvable.');
  const previous = snap.data();

  const update = { ...patch, updatedAt: fb.serverTimestamp() };
  if (!allowPrivilegedChange) {
    delete update.role;
    delete update.status;
    delete update.galleryIds;
    delete update.shopIds;
  }

  await fb.updateDoc(ref, update);

  await writeAuditLog({
    action: AUDIT_ACTIONS.USER_UPDATED,
    entityType: 'user',
    entityId: targetUid,
    galleryId: patch.galleryIds?.[0] ?? previous.galleryIds?.[0] ?? null,
    actorUserId,
    actorRole,
    previousData: previous,
    newData: patch,
  });

  return { uid: targetUid, previous };
}

export async function archiveManagedUser({ targetUid, reason, actorUserId, actorRole }) {
  const ref = fb.doc(fb.db, 'users', targetUid);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Utilisateur introuvable.');
  const previous = snap.data();

  await fb.updateDoc(ref, {
    status: 'ARCHIVED',
    updatedAt: fb.serverTimestamp(),
    archivedAt: fb.serverTimestamp(),
    archivedByUserId: actorUserId,
    archiveReason: reason ?? null,
  });

  await writeAuditLog({
    action: AUDIT_ACTIONS.USER_ARCHIVED,
    entityType: 'user',
    entityId: targetUid,
    galleryId: previous.galleryIds?.[0] ?? null,
    actorUserId,
    actorRole,
    reason,
  });

  return { uid: targetUid, previous };
}

export async function listUsersByGallery(galleryId = null) {
  const constraints = [fb.collection(fb.db, 'users')];
  if (galleryId) constraints.push(fb.where('galleryIds', 'array-contains', galleryId));
  constraints.push(fb.limit(500));
  const usersQ = fb.query(...constraints);
  const snap = await fb.getDocs(usersQ);
  return snap.docs.map((d) => {
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
}
