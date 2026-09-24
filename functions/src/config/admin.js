const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

db.settings({ ignoreUndefinedProperties: true });

module.exports = { admin, db, auth, storage };