const PDFDocument = require('pdfkit');
const { admin, storage } = require('../config/admin');

const BRAND = '#0ea5e9';
const MUTED = '#64748b';
const TEXT = '#1e293b';
const SUCCESS = '#16a34a';
const DANGER = '#dc2626';
const WARNING = '#f59e0b';

function fmtMoney(amount, currency = 'USD') {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  try {
    return new Intl.NumberFormat(currency === 'CDF' ? 'fr-CD' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${amount} ${currency}`;
  }
}

function fmtKwh(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(v))} kWh`;
}

function fmtDate(v) {
  if (!v) return '—';
  const d = v.toDate ? v.toDate() : new Date(v);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Génère un PDF de facture/relevé et retourne un Buffer.
 * @param {Object} data - voir § 3 pour la structure attendue
 */
async function buildInvoicePdf(data) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

  // ----- Header -----
  doc
    .fillColor(BRAND)
    .rect(0, 0, doc.page.width, 70)
    .fill();

  doc
    .fillColor('#ffffff')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Galerie Énergie Manager', 40, 24);

  doc
    .fontSize(11)
    .font('Helvetica')
    .text(`${data.gallery.name} — ${data.gallery.code}`, 40, 48);

  doc
    .fillColor(TEXT)
    .fontSize(10)
    .font('Helvetica')
    .text(
      `${data.gallery.address || ''} ${data.gallery.city || ''} ${data.gallery.country || ''}`.trim() || '—',
      40,
      80,
    );

  // ----- Numéro & dates -----
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .text('Numéro', 400, 85)
    .fillColor(TEXT)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(data.invoice.invoiceNumber, 400, 97);

  doc
    .font('Helvetica')
    .fillColor(MUTED)
    .fontSize(9)
    .text(`Généré le ${fmtDate(data.invoice.createdAt ?? new Date())}`, 400, 118)
    .text(`Période : ${fmtDate(data.invoice.periodStart)} → ${fmtDate(data.invoice.periodEnd)}`, 400, 130);

  // ----- Titre -----
  doc
    .fillColor(TEXT)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(data.invoice.type === 'INVOICE' ? 'FACTURE' : 'RELEVÉ DE COMPTE', 40, 160);

  // ----- Boutique -----
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font('Helvetica')
    .text('Boutique', 40, 190)
    .fillColor(TEXT)
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`${data.shop.name} (${data.shop.code})`, 40, 202)
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED)
    .text(data.shop.location || '—', 40, 218);

  // ----- Tableau détail -----
  const rows = [
    ['Index ouverture', data.invoice.openingMeterKwh != null ? `${data.invoice.openingMeterKwh} kWh` : '—'],
    ['Index fermeture', data.invoice.closingMeterKwh != null ? `${data.invoice.closingMeterKwh} kWh` : '—'],
    ['Consommation période', fmtKwh(data.invoice.consumedKwh)],
    ['Total acheté', fmtKwh(data.invoice.purchasedKwh)],
    ['Crédit restant', fmtKwh(data.invoice.remainingKwh)],
    ['Prix par kWh', fmtMoney(data.invoice.pricePerKwh, data.invoice.currency)],
  ];

  let y = 255;
  doc.fillColor('#f1f5f9').rect(40, y, doc.page.width - 80, 20).fill();
  doc.fillColor(TEXT).fontSize(10).font('Helvetica-Bold')
    .text('Détail énergie', 50, y + 5);
  y += 26;

  doc.font('Helvetica').fontSize(10);
  for (const [label, value] of rows) {
    doc.fillColor(MUTED).text(label, 50, y);
    doc.fillColor(TEXT).text(String(value), 300, y, { width: 250, align: 'right' });
    y += 18;
  }

  // ----- Total -----
  y += 10;
  doc.fillColor('#f1f5f9').rect(40, y, doc.page.width - 80, 26).fill();
  doc.fillColor(TEXT).fontSize(11).font('Helvetica-Bold')
    .text('Montant consommé', 50, y + 7);
  doc.fillColor(DANGER).fontSize(13)
    .text(fmtMoney(data.invoice.consumedAmount, data.invoice.currency), 300, y + 5, {
      width: 250,
      align: 'right',
    });
  y += 34;

  doc.fillColor('#f1f5f9').rect(40, y, doc.page.width - 80, 26).fill();
  doc.fillColor(TEXT).fontSize(11).font('Helvetica-Bold')
    .text('Solde restant', 50, y + 7);
  doc.fillColor(SUCCESS).fontSize(13)
    .text(fmtMoney(data.invoice.remainingAmount, data.invoice.currency), 300, y + 5, {
      width: 250,
      align: 'right',
    });
  y += 50;

  // ----- Signature -----
  doc.fillColor(MUTED).fontSize(9).font('Helvetica')
    .text('Généré par', 40, y)
    .fillColor(TEXT).fontSize(11).font('Helvetica-Bold')
    .text(data.generatedBy.fullName || '—', 40, y + 14)
    .font('Helvetica').fontSize(9).fillColor(MUTED)
    .text(data.generatedBy.email || '', 40, y + 30)
    .text(`Le ${fmtDate(data.invoice.createdAt ?? new Date())}`, 40, y + 42);

  // ----- Footer -----
  doc.fillColor(MUTED).fontSize(8)
    .text(
      'Document généré automatiquement par Galerie Énergie Manager. Les valeurs reflètent les relevés et achats validés à la date de génération.',
      40,
      doc.page.height - 50,
      { width: doc.page.width - 80, align: 'center' },
    );

  doc.end();
  return done;
}

/**
 * Upload un Buffer PDF vers Firebase Storage et retourne l'URL signée (7 jours).
 */
async function uploadInvoicePdf({ galleryId, invoiceId, buffer }) {
  const bucket = storage.bucket();
  const path = `invoices/${galleryId}/${invoiceId}.pdf`;
  const file = bucket.file(path);

  await file.save(buffer, {
    contentType: 'application/pdf',
    metadata: { cacheControl: 'private, max-age=0' },
  });

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 3600 * 1000,
  });
  return { path, url };
}

module.exports = { buildInvoicePdf, uploadInvoicePdf, fmtMoney, fmtKwh };