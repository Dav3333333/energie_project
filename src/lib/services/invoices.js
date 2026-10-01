import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/firebase';
import { fb, toMillis, AppError, ERR } from './base';
import { writeAuditLog, AUDIT_ACTIONS } from './audit';
import { recalculateShopBalance } from './balances';
import { generateInvoiceNumber } from './counters';

function fmtMoney(v, currency = 'USD') {
  if (v == null || Number.isNaN(Number(v))) return '—';
  try {
    return new Intl.NumberFormat(currency === 'CDF' ? 'fr-CD' : 'en-US',
      { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(v));
  } catch { return `${v} ${currency}`; }
}
function fmtKwh(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(v))} kWh`;
}
function fmtDate(v) {
  if (!v) return '—';
  const d = v.toDate ? v.toDate() : new Date(v);
  return d.toLocaleDateString('fr-FR');
}

function buildPdf({ gallery, shop, invoice, generatedBy }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 70, 'F');
  doc.setTextColor('#ffffff').setFontSize(20).setFont('helvetica', 'bold');
  doc.text('Galerie Énergie Manager', 40, 30);
  doc.setFontSize(11).setFont('helvetica', 'normal');
  doc.text(`${gallery.name} — ${gallery.code}`, 40, 50);

  doc.setTextColor('#1e293b').setFontSize(10);
  doc.text(`${gallery.address || ''} ${gallery.city || ''} ${gallery.country || ''}`.trim(), 40, 85);

  doc.setTextColor('#64748b').setFontSize(9).text('Numéro', 400, 85);
  doc.setTextColor('#1e293b').setFontSize(12).setFont('helvetica', 'bold');
  doc.text(invoice.invoiceNumber, 400, 97);

  doc.setFont('helvetica', 'normal').setTextColor('#64748b').setFontSize(9);
  doc.text(`Généré le ${fmtDate(invoice.createdAt)}`, 400, 118);
  doc.text(`Période : ${fmtDate(invoice.periodStart)} → ${fmtDate(invoice.periodEnd)}`, 400, 130);

  doc.setTextColor('#1e293b').setFontSize(16).setFont('helvetica', 'bold');
  doc.text(invoice.type === 'INVOICE' ? 'FACTURE' : 'RELEVÉ DE COMPTE', 40, 165);

  doc.setTextColor('#64748b').setFontSize(9).setFont('helvetica', 'normal');
  doc.text('Boutique', 40, 195);
  doc.setTextColor('#1e293b').setFontSize(12).setFont('helvetica', 'bold');
  doc.text(`${shop.name} (${shop.code})`, 40, 208);

  doc.autoTable({
    startY: 240,
    head: [['Détail énergie', 'Valeur']],
    body: [
      ['Index ouverture', invoice.openingMeterKwh != null ? `${invoice.openingMeterKwh} kWh` : '—'],
      ['Index fermeture', invoice.closingMeterKwh != null ? `${invoice.closingMeterKwh} kWh` : '—'],
      ['Consommation période', fmtKwh(invoice.consumedKwh)],
      ['Total acheté', fmtKwh(invoice.purchasedKwh)],
      ['Crédit restant', fmtKwh(invoice.remainingKwh)],
      ['Prix par kWh', fmtMoney(invoice.pricePerKwh, invoice.currency)],
      ['Montant consommé', fmtMoney(invoice.consumedAmount, invoice.currency)],
      ['Solde restant', fmtMoney(invoice.remainingAmount, invoice.currency)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: '#fff' },
    styles: { fontSize: 9 },
  });

  const y = doc.lastAutoTable.finalY + 40;
  doc.setTextColor('#64748b').setFontSize(9).setFont('helvetica', 'normal');
  doc.text('Généré par', 40, y);
  doc.setTextColor('#1e293b').setFontSize(11).setFont('helvetica', 'bold');
  doc.text(generatedBy.fullName || '—', 40, y + 14);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor('#64748b');
  doc.text(generatedBy.email || '', 40, y + 30);

  return doc.output('blob');
}

export async function generateInvoice({ input, actorUserId, actorRole, actorFullName, actorEmail }) {
  const shopSnap = await fb.getDoc(fb.doc(fb.db, 'shops', input.shopId));
  if (!shopSnap.exists()) throw new AppError(ERR.NOT_FOUND, 'Boutique introuvable.');
  const shop = shopSnap.data();

  const gallerySnap = await fb.getDoc(fb.doc(fb.db, 'galleries', shop.galleryId));
  const gallery = gallerySnap.data() ?? {};

  const ps = fb.Timestamp.fromDate(new Date(input.periodStart));
  const pe = fb.Timestamp.fromDate(new Date(input.periodEnd));
  if (ps.toMillis() >= pe.toMillis()) throw new AppError(ERR.INVALID_ARGUMENT, 'Période invalide.');

  // Relevés dans la période
  const readingsQ = fb.query(
    fb.collection(fb.db, 'readings'),
    fb.where('shopId', '==', input.shopId),
    fb.where('status', '==', 'VALID'),
    fb.orderBy('readingDate', 'asc'),
  );
  const readingsSnap = await fb.getDocs(readingsQ);
  const allReadings = readingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const inPeriod = allReadings.filter((r) => {
    const t = toMillis(r.readingDate);
    return t >= ps.toMillis() && t <= pe.toMillis();
  });
  const before = allReadings.filter((r) => toMillis(r.readingDate) < ps.toMillis());

  const openingMeterKwh = before.length
    ? before[before.length - 1].totalKwh
    : allReadings[0]?.previousTotalKwh ?? 0;
  const closingMeterKwh = inPeriod.length
    ? inPeriod[inPeriod.length - 1].totalKwh
    : openingMeterKwh;
  const consumedKwh = Number(inPeriod.reduce((s, r) => s + Number(r.consumptionKwh ?? 0), 0).toFixed(3));

  // Achats dans la période
  const purchasesQ = fb.query(
    fb.collection(fb.db, 'energyPurchases'),
    fb.where('shopId', '==', input.shopId),
    fb.where('status', '==', 'VALID'),
  );
  const purchasesSnap = await fb.getDocs(purchasesQ);
  const purchasesInPeriod = purchasesSnap.docs
    .map((d) => d.data())
    .filter((p) => {
      const t = toMillis(p.purchaseDate);
      return t >= ps.toMillis() && t <= pe.toMillis();
    });
  const purchasedKwh = Number(purchasesInPeriod.reduce((s, p) => s + Number(p.purchasedKwh ?? 0), 0).toFixed(3));

  const pricePerKwh = Number(shop.customPricePerKwh ?? gallery.defaultPricePerKwh ?? 0);
  const balance = await recalculateShopBalance(input.shopId);

  const consumedAmount = Number((consumedKwh * pricePerKwh).toFixed(2));
  const remainingAmount = Number((balance.remainingKwh * pricePerKwh).toFixed(2));
  const currency = gallery.currency ?? 'USD';

  const invoiceNumber = await generateInvoiceNumber({
    galleryCode: gallery.code,
    date: pe.toDate(),
  });

  const invoiceRef = fb.doc(fb.collection(fb.db, 'invoices'));
  const now = fb.serverTimestamp();

  // PDF client-side
  const pdfBlob = buildPdf({
    gallery, shop,
    invoice: {
      invoiceNumber, type: input.type ?? 'STATEMENT',
      periodStart: ps, periodEnd: pe, createdAt: new Date(),
      openingMeterKwh, closingMeterKwh, consumedKwh, purchasedKwh,
      remainingKwh: balance.remainingKwh, pricePerKwh, consumedAmount, remainingAmount, currency,
    },
    generatedBy: { fullName: actorFullName, email: actorEmail },
  });

  // Upload Storage
  const storagePath = `invoices/${shop.galleryId}/${invoiceRef.id}.pdf`;
  const storageRef = sRef(storage, storagePath);
  await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
  const pdfUrl = await getDownloadURL(storageRef);

  const data = {
    galleryId: shop.galleryId,
    shopId: input.shopId,
    invoiceNumber,
    type: input.type ?? 'STATEMENT',
    periodStart: ps, periodEnd: pe,
    openingMeterKwh, closingMeterKwh, consumedKwh, purchasedKwh,
    remainingKwh: balance.remainingKwh, pricePerKwh,
    consumedAmount, remainingAmount, currency,
    status: 'ISSUED',
    pdfUrl, pdfPath: storagePath,
    generatedByUserId: actorUserId,
    createdAt: now, updatedAt: now,
  };
  await fb.setDoc(invoiceRef, data);

  await writeAuditLog({
    action: AUDIT_ACTIONS.INVOICE_GENERATED,
    entityType: 'invoice', entityId: invoiceRef.id,
    galleryId: shop.galleryId, shopId: input.shopId,
    actorUserId, actorRole,
    newData: { invoiceNumber, type: input.type, consumedKwh, consumedAmount },
  });

  return { id: invoiceRef.id, invoiceNumber, pdfUrl };
}