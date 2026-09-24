/* eslint-disable no-console */
/**
 * Crée le premier SUPER_ADMIN de l'application.
 * À exécuter UNE SEULE FOIS, après déploiement des Cloud Functions et des rules.
 *
 * Usage :
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   SUPER_ADMIN_EMAIL=admin@exemple.com \
 *   SUPER_ADMIN_PASSWORD='MotDePasseSolide!' \
 *   SUPER_ADMIN_USERNAME=superadmin \
 *   SUPER_ADMIN_FIRSTNAME=Super \
 *   SUPER_ADMIN_LASTNAME=Admin \
 *   node scripts/create-super-admin.js
 */

const admin = require('firebase-admin');
const path = require('node:path');

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('GOOGLE_APPLICATION_CREDENTIALS manquant.');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/;

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const username = (process.env.SUPER_ADMIN_USERNAME ?? '').trim().toLowerCase();
  const firstName = process.env.SUPER_ADMIN_FIRSTNAME ?? 'Super';
  const lastName = process.env.SUPER_ADMIN_LASTNAME ?? 'Admin';

  if (!email || !password || !username) {
    console.error('Variables SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD et SUPER_ADMIN_USERNAME requises.');
    process.exit(1);
  }
  if (!USERNAME_REGEX.test(username)) {
    console.error('SUPER_ADMIN_USERNAME invalide.');
    process.exit(1);
  }

  // Interdit la création d'un second SUPER_ADMIN via ce script sans confirmation explicite.
  const existing = await db.collection('users').where('role', '==', 'SUPER_ADMIN').limit(1).get();
  if (!existing.empty && process.env.FORCE !== 'true') {
    console.error('Un SUPER_ADMIN existe déjà. Utiliser FORCE=true pour créer malgré tout.');
    process.exit(1);
  }

  // Réservation du username.
  const usernameRef = db.collection('usernames').doc(username);
  const usernameSnap = await usernameRef.get();
  if (usernameSnap.exists) {
    console.error('Username déjà utilisé.');
    process.exit(1);
  }

  // Création Auth.
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim(),
    });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      console.error('Cet email est déjà utilisé. Utilisez un autre email.');
      process.exit(1);
    }
    throw err;
  }

  const uid = userRecord.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();

  try {
    await db.runTransaction(async (tx) => {
      tx.set(db.collection('users').doc(uid), {
        uid,
        email,
        username,
        usernameNormalized: username,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        phone: null,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        galleryIds: [],
        shopIds: [],
        createdAt: now,
        updatedAt: now,
        createdByUserId: null,
        lastLoginAt: null,
      });
      tx.set(usernameRef, { uid, email, createdAt: now });
      tx.set(db.collection('auditLogs').doc(), {
        action: 'SUPER_ADMIN_BOOTSTRAPPED',
        entityType: 'user',
        entityId: uid,
        galleryId: null,
        shopId: null,
        actorUserId: uid,
        actorRole: 'SUPER_ADMIN',
        previousData: null,
        newData: { email, username, role: 'SUPER_ADMIN' },
        reason: 'Bootstrap initial',
        createdAt: now,
      });
    });
  } catch (err) {
    await auth.deleteUser(uid).catch(() => {});
    throw err;
  }

  console.log('SUPER_ADMIN créé avec succès :');
  console.log(`  uid      : ${uid}`);
  console.log(`  email    : ${email}`);
  console.log(`  username : ${username}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});