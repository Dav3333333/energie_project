import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatKwh, formatCurrency, formatDate } from '@/lib/formatters';

/**
 * Export PDF côté client pour consultation rapide.
 * Les documents officiels (factures) sont générés côté serveur.
 */
export function downloadReportPdf({ shops, readings, purchases, period, totals }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text('Galerie Énergie Manager — Rapport', 40, 40);

  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Période : ${period.from ? formatDate(period.from) : '—'} → ${period.to ? formatDate(period.to) : '—'}`,
    40,
    60,
  );
  doc.text(`Généré le ${formatDate(new Date())}`, 40, 74);

  doc.setFontSize(12);
  doc.text('Synthèse', 40, 105);
  doc.autoTable({
    startY: 115,
    body: [
      ['Consommé', formatKwh(totals.totalConsumed)],
      ['Acheté', formatKwh(totals.totalPurchased)],
      ['Montant achats', formatCurrency(totals.totalSpent, 'USD')],
      ['Boutiques', String(shops.length)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: 30 },
    styles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: 'bold' } },
  });

  doc.setFontSize(12);
  doc.text('Boutiques', 40, doc.lastAutoTable.finalY + 20);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 30,
    head: [['Nom', 'Code', 'Reste kWh', 'Statut']],
    body: shops.map((s) => [s.name, s.code, String(s.remainingKwh ?? 0), s.balanceStatus ?? '—']),
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: '#fff' },
    styles: { fontSize: 9 },
  });

  doc.setFontSize(12);
  doc.text('Derniers achats', 40, doc.lastAutoTable.finalY + 20);
  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 30,
    head: [['N° reçu', 'Date', 'kWh', 'Montant']],
    body: purchases.slice(0, 30).map((p) => [
      p.receiptNumber,
      formatDate(p.purchaseDate),
      String(p.purchasedKwh),
      formatCurrency(p.totalAmount, p.currency),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: '#fff' },
    styles: { fontSize: 9 },
  });

  doc.save(`rapport-${Date.now()}.pdf`);
}