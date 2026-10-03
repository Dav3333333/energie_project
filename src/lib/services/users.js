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
  createdByUserId, actorRole, actorGalleryIds = [],
}) {
  const superAdminRoles = ['SUPER_ADMIN', 'GALLERY_ADMIN', 'TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'];
  const galleryAdminRoles = ['TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'];
  if (!(actorRole === 'SUPER_ADMIN' ? superAdminRoles : galleryAdminRoles).includes(role)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Vous ne pouvez pas créer un utilisateur avec ce rôle.');
  }
  if (!['SUPER_ADMIN', 'GALLERY_ADMIN'].includes(actorRole)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Seuls les administrateurs peuvent créer des utilisateurs.');
  }

  if (role === 'SUPER_ADMIN') {
    if (galleryIds.length || shopIds.length) throw new AppError(ERR.INVALID_ARGUMENT, 'Un super administrateur ne peut pas être rattaché à une galerie ou boutique.');
  } else if (!Array.isArray(galleryIds) || galleryIds.length !== 1) {
    throw new AppError(ERR.INVALID_ARGUMENT, 'Associez cet utilisateur à une galerie.');
  }
  if (actorRole === 'GALLERY_ADMIN') {
    if (!['TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'].includes(role) || !actorGalleryIds.includes(galleryIds[0])) {
      throw new AppError(ERR.PERMISSION_DENIED, 'Vous pouvez uniquement créer des utilisateurs de votre galerie.');
    }
  }
  if (['SHOP_OWNER', 'SHOP_WORKER'].includes(role)) {
    if (!Array.isArray(shopIds) || shopIds.length !== 1) {
      throw new AppError(ERR.INVALID_ARGUMENT, 'Associez le propriétaire à une boutique.');
    }
    const shopSnap = await fb.getDoc(fb.doc(fb.db, 'shops', shopIds[0]));
    if (!shopSnap.exists() || shopSnap.data().galleryId !== galleryIds[0]) {
      throw new AppError(ERR.PERMISSION_DENIED, 'La boutique doit appartenir à la galerie sélectionnée.');
    }
  } else if (shopIds.length) {
    throw new AppError(ERR.INVALID_ARGUMENT, 'Seuls les utilisateurs de boutique peuvent être associés à une boutique.');
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
        tx.set(fb.doc(fb.db, `galleries/${gid}/members/${uid}`), {
          uid, role, status: 'ACTIVE', createdAt: now, updatedAt: now,
        });
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
  targetUid, patch, actorUserId, actorRole, actorGalleryIds = [], allowPrivilegedChange,
}) {
  const ref = fb.doc(fb.db, 'users', targetUid);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Utilisateur introuvable.');
  const previous = snap.data();

  if (!['SUPER_ADMIN', 'GALLERY_ADMIN'].includes(actorRole)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Action réservée aux administrateurs.');
  }
  if (actorRole === 'GALLERY_ADMIN' && (
    targetUid === actorUserId
    || !['TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'].includes(previous.role)
    || !(previous.galleryIds ?? []).some((galleryId) => actorGalleryIds.includes(galleryId))
  )) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Vous ne pouvez modifier que les utilisateurs de votre galerie.');
  }

  const allowedProfileKeys = ['firstName', 'lastName', 'fullName', 'phone'];
  const update = {};
  for (const key of allowedProfileKeys) {
    if (Object.hasOwn(patch, key)) update[key] = patch[key];
  }
  if (allowPrivilegedChange) {
    for (const key of ['role', 'status', 'galleryIds', 'shopIds']) {
      if (Object.hasOwn(patch, key)) update[key] = patch[key];
    }
    if (Object.hasOwn(update, 'role')) {
      const role = update.role;
      const galleryIds = update.galleryIds ?? previous.galleryIds ?? [];
      const shopIds = update.shopIds ?? previous.shopIds ?? [];
      if (!['SUPER_ADMIN', 'GALLERY_ADMIN', 'TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'].includes(role)) {
        throw new AppError(ERR.INVALID_ARGUMENT, 'Rôle invalide.');
      }
      if (role === 'SUPER_ADMIN') {
        update.galleryIds = [];
        update.shopIds = [];
      } else {
        if (galleryIds.length !== 1) throw new AppError(ERR.INVALID_ARGUMENT, 'Associez cet utilisateur à une galerie.');
        update.galleryIds = galleryIds;
        if (['SHOP_OWNER', 'SHOP_WORKER'].includes(role)) {
          if (shopIds.length !== 1) throw new AppError(ERR.INVALID_ARGUMENT, 'Associez cet utilisateur à une boutique.');
          const shopSnap = await fb.getDoc(fb.doc(fb.db, 'shops', shopIds[0]));
          if (!shopSnap.exists() || shopSnap.data().galleryId !== galleryIds[0]) {
            throw new AppError(ERR.INVALID_ARGUMENT, 'La boutique doit appartenir à la galerie sélectionnée.');
          }
          update.shopIds = shopIds;
        } else {
          update.shopIds = [];
        }
      }
    }
    if (update.status && !['ACTIVE', 'ARCHIVED'].includes(update.status)) {
      throw new AppError(ERR.INVALID_ARGUMENT, 'Statut utilisateur invalide.');
    }
  }
  update.updatedAt = fb.serverTimestamp();

  await fb.runTransaction(fb.db, async (tx) => {
    tx.update(ref, update);
    if (allowPrivilegedChange && (update.role || update.galleryIds)) {
      const newGalleryIds = update.galleryIds ?? previous.galleryIds ?? [];
      const newRole = update.role ?? previous.role;
      for (const galleryId of new Set([...(previous.galleryIds ?? []), ...newGalleryIds])) {
        if (newRole === 'SUPER_ADMIN' || !newGalleryIds.includes(galleryId)) {
          tx.delete(fb.doc(fb.db, `galleries/${galleryId}/members/${targetUid}`));
        }
        tx.delete(fb.doc(fb.db, `galleries/${galleryId}/admins/${targetUid}`));
        tx.delete(fb.doc(fb.db, `galleries/${galleryId}/technicians/${targetUid}`));
      }
      if (newRole !== 'SUPER_ADMIN') for (const galleryId of newGalleryIds) {
        tx.set(fb.doc(fb.db, `galleries/${galleryId}/members/${targetUid}`), {
          uid: targetUid,
          role: newRole,
          status: update.status ?? previous.status,
          updatedAt: update.updatedAt,
        });
        if (newRole === 'GALLERY_ADMIN') {
          tx.set(fb.doc(fb.db, `galleries/${galleryId}/admins/${targetUid}`), {
            userId: targetUid, assignedAt: update.updatedAt, assignedByUserId: actorUserId,
          });
        }
        if (newRole === 'TECHNICIAN') {
          tx.set(fb.doc(fb.db, `galleries/${galleryId}/technicians/${targetUid}`), {
            userId: targetUid, assignedAt: update.updatedAt, assignedByUserId: actorUserId,
          });
        }
      }
    }
  });

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

export async function archiveManagedUser({ targetUid, reason, actorUserId, actorRole, actorGalleryIds = [] }) {
  const ref = fb.doc(fb.db, 'users', targetUid);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()) throw new AppError(ERR.NOT_FOUND, 'Utilisateur introuvable.');
  const previous = snap.data();
  if (targetUid === actorUserId) throw new AppError(ERR.PERMISSION_DENIED, 'Vous ne pouvez pas archiver votre propre compte.');
  if (actorRole === 'GALLERY_ADMIN' && (
    !['TECHNICIAN', 'SHOP_OWNER', 'SHOP_WORKER'].includes(previous.role)
    || !(previous.galleryIds ?? []).some((galleryId) => actorGalleryIds.includes(galleryId))
  )) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Vous ne pouvez archiver que les utilisateurs de votre galerie.');
  }
  if (!['SUPER_ADMIN', 'GALLERY_ADMIN'].includes(actorRole)) {
    throw new AppError(ERR.PERMISSION_DENIED, 'Action réservée aux administrateurs.');
  }

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

export async function listUsersByGalleries(galleryIds = null) {
  const usersCollection = fb.collection(fb.db, 'users');
  let docs = [];
  if (Array.isArray(galleryIds) && galleryIds.length) {
    const memberships = await Promise.all(galleryIds.map((galleryId) => fb.getDocs(
      fb.collection(fb.db, `galleries/${galleryId}/members`),
    )));
    const memberIds = [...new Set(memberships.flatMap((snapshot) => snapshot.docs.map((member) => member.id)))];
    const userSnaps = await Promise.all(memberIds.map((uid) => fb.getDoc(fb.doc(fb.db, 'users', uid))));
    docs = userSnaps.filter((snapshot) => snapshot.exists());
  } else {
    const snap = await fb.getDocs(fb.query(usersCollection, fb.limit(500)));
    docs = snap.docs;
    await ensureGalleryMemberIndexes(docs);
  }
  return docs.map((d) => {
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

async function ensureGalleryMemberIndexes(userDocs) {
  const membersByGallery = new Map();
  for (const userDoc of userDocs) {
    const user = userDoc.data();
    if (user.role === 'SUPER_ADMIN') continue;
    for (const galleryId of user.galleryIds ?? []) {
      if (!membersByGallery.has(galleryId)) membersByGallery.set(galleryId, []);
      membersByGallery.get(galleryId).push({ uid: user.uid ?? userDoc.id, role: user.role, status: user.status ?? 'ACTIVE' });
    }
  }

  for (const [galleryId, members] of membersByGallery) {
    const existing = await fb.getDocs(fb.collection(fb.db, `galleries/${galleryId}/members`));
    const existingIds = new Set(existing.docs.map((member) => member.id));
    const missing = members.filter((member) => !existingIds.has(member.uid));
    for (let offset = 0; offset < missing.length; offset += 450) {
      const batch = fb.writeBatch(fb.db);
      for (const member of missing.slice(offset, offset + 450)) {
        const ref = fb.doc(fb.db, `galleries/${galleryId}/members/${member.uid}`);
        batch.set(ref, { ...member, createdAt: fb.serverTimestamp(), updatedAt: fb.serverTimestamp() });
      }
      await batch.commit();
    }
  }
}
