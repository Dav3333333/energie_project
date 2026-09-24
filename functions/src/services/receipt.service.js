const { db, admin } = require('../config/admin');

/**
 * Génère un numéro de reçu séquentiel et unique par galerie et par mois.
 * Format : RC-{galleryCode}-{YYYYMM}-{seq,5}. Ex. RC-GC-01-202509-00042
 * Utilise un compteur transactionnel pour garantir l'unicité.
 */
async function generateReceiptNumber({ galleryCode, transaction = null, date = new Date() }) {
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const counterId = `receipt_${galleryCode}_${yyyymm}`;
  const counterRef = db.collection('counters').doc(counterId);

  const tx = transaction ?? db.runTransaction.bind(db);
  const run = async (t) => {
    const snap = t ? await t.get(counterRef) : await counterRef.get();
    const current = snap.exists ? Number(snap.data().value ?? 0) : 0;
    const next = current + 1;
    if (t) t.set(counterRef, { value: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    else await counterRef.set({ value: next, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return next;
  };

  let seq;
  if (transaction) {
    seq = await run(transaction);
  } else {
    seq = await db.runTransaction(run);
  }

  return `RC-${galleryCode}-${yyyymm}-${String(seq).padStart(5, '0')}`;
}

module.exports = { generateReceiptNumber };