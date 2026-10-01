import { fb, toError, AppError, ERR } from './base';

/**
 * Incrémente un compteur séquentiel dans une transaction et renvoie la valeur.
 */
export async function nextCounter(counterId) {
  const ref = fb.doc(fb.db, 'counters', counterId);
  return fb.runTransaction(fb.db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() ? Number(snap.data().value ?? 0) : 0;
    const next = current + 1;
    tx.set(ref, { value: next, updatedAt: fb.serverTimestamp() }, { merge: true });
    return next;
  });
}

export async function generateReceiptNumber({ galleryCode, date = new Date() }) {
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const seq = await nextCounter(`receipt_${galleryCode}_${yyyymm}`);
  return `RC-${galleryCode}-${yyyymm}-${String(seq).padStart(5, '0')}`;
}

export async function generateInvoiceNumber({ galleryCode, date = new Date() }) {
  const yyyymm = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const seq = await nextCounter(`invoice_${galleryCode}_${yyyymm}`);
  return `FAC-${galleryCode}-${yyyymm}-${String(seq).padStart(5, '0')}`;
}