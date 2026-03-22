import { jsPDF } from 'jspdf';
import { invoicesApi } from '../api/services/invoices';

export function getInvoiceId(inv) {
  return inv.invoice_id ?? inv.id;
}

/** Same patient resolution as the invoices table. */
export function getInvoicePatientLabel(inv) {
  const obj = inv.patient;
  if (obj && typeof obj === 'object') {
    return obj.full_name ?? obj.name ?? (obj.id != null ? `#${obj.id}` : '—');
  }
  return (
    inv.patient_name ??
    inv.patientName ??
    (inv.patient_id != null ? `#${inv.patient_id}` : inv.patient != null ? `#${inv.patient}` : '—')
  );
}

function parseAmountNumber(amount) {
  if (amount == null || amount === '') return 0;
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  return isNaN(num) ? 0 : num;
}

function formatMoney(amount) {
  const num = parseAmountNumber(amount);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Normalize API response (snake_case + optional camelCase). */
export function normalizeVoucherPayload(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return {
    patient_name: raw.patient_name ?? raw.patientName,
    tel: raw.tel ?? raw.phone ?? raw.telephone,
    treatment: raw.treatment,
    amount: raw.amount,
    date: raw.date,
    doctor: raw.doctor ?? raw.doctor_name,
  };
}

/** DD/MM/YYYY for invoice header. */
function formatInvoiceDateShort(d) {
  if (!d && d !== 0) return '—';
  const str = String(d);
  const date = new Date(str.includes('T') ? str : `${str}T12:00:00`);
  if (isNaN(date.getTime())) return escapeHtml(str);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function voucherErrorMessage(err) {
  const d = err.response?.data;
  if (!d) return err.message || 'Could not load voucher.';
  if (typeof d.detail === 'string') return d.detail;
  if (typeof d.message === 'string') return d.message;
  return 'Could not load voucher.';
}

/** Inline SVG: tooth mark + blue panel (print-safe). */
const LOGO_SVG = `
<svg class="invoice-logo-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="80" height="80" rx="12" fill="url(#g)"/>
  <path fill="#ffffff" d="M40 18c-6 0-10 4-12 10-1 3-2 7-2 11 0 8 2 15 5 22 2 4 5 7 9 7s7-3 9-7c3-7 5-14 5-22 0-4-1-8-2-11-2-6-6-10-12-10zm-8 45c-2 0-4-2-5-5-2-6-3-12-3-18 0-3 0-6 1-8 1-4 3-6 5-6 3 0 5 4 6 10l2 14c0 8-2 13-6 13zm16 0c-4 0-6-5-6-13l2-14c1-6 3-10 6-10 2 0 4 2 5 6 1 2 1 5 1 8 0 6-1 12-3 18-1 3-3 5-5 5z"/>
</svg>
`;

function buildPrintableHtmlFromVoucher(v, invoiceId) {
  const idStr = escapeHtml(String(invoiceId));
  const patient = escapeHtml(v.patient_name ?? '—');
  const tel = escapeHtml(v.tel ?? '—');
  const treatment = escapeHtml(v.treatment ?? 'Service');
  const doctor = escapeHtml(v.doctor ?? '—');
  const dateShort = formatInvoiceDateShort(v.date);
  const lineAmount = formatMoney(v.amount);
  const subtotal = parseAmountNumber(v.amount);
  const tax = 0;
  const grand = subtotal + tax;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Invoice #${idStr}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: "Segoe UI", system-ui, sans-serif;
    color: #0f172a;
    background: #f8fafc;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .invoice-sheet {
    max-width: 800px;
    margin: 0 auto;
    background: #fff;
    padding: 32px 36px 40px;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
  }
  .invoice-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 28px;
    padding-bottom: 24px;
    border-bottom: 2px solid #e0e7ff;
  }
  .invoice-brand {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .logo-wrap {
    flex-shrink: 0;
    width: 80px;
    height: 80px;
    filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.25));
  }
  .invoice-logo-svg { width: 80px; height: 80px; display: block; }
  .brand-lines .tagline {
    margin: 0 0 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #1e40af;
    letter-spacing: 0.02em;
  }
  .brand-lines .name {
    margin: 0;
    font-size: 0.75rem;
    color: #64748b;
  }
  .invoice-title-block {
    text-align: right;
  }
  .invoice-title-block .big {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 800;
    color: #2563eb;
    letter-spacing: 0.06em;
    line-height: 1;
  }
  .invoice-meta-row {
    display: flex;
    justify-content: space-between;
    gap: 32px;
    margin-bottom: 28px;
  }
  .meta-left p {
    margin: 0 0 10px;
    font-size: 0.9rem;
    color: #334155;
  }
  .meta-left strong {
    color: #1e40af;
    font-weight: 700;
    margin-right: 6px;
  }
  .invoice-to {
    text-align: right;
    min-width: 220px;
  }
  .invoice-to .label {
    margin: 0 0 8px;
    font-size: 0.8rem;
    font-weight: 800;
    color: #1e40af;
    letter-spacing: 0.08em;
  }
  .invoice-to .patient-name {
    margin: 0 0 4px;
    font-size: 1.05rem;
    font-weight: 600;
    color: #0f172a;
  }
  .invoice-to .patient-tel {
    margin: 0;
    font-size: 0.9rem;
    color: #64748b;
  }
  .invoice-items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 0.9rem;
  }
  .invoice-items thead th {
    background: linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%);
    color: #fff;
    font-weight: 700;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    padding: 12px 14px;
    text-align: left;
  }
  .invoice-items thead th:nth-child(2),
  .invoice-items thead th:nth-child(3),
  .invoice-items thead th:nth-child(4) {
    text-align: right;
  }
  .invoice-items tbody td {
    padding: 14px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .invoice-items tbody tr:nth-child(even) td {
    background: #f8fafc;
  }
  .invoice-items tbody td:nth-child(2),
  .invoice-items tbody td:nth-child(3),
  .invoice-items tbody td:nth-child(4) {
    text-align: right;
    white-space: nowrap;
  }
  .invoice-totals {
    max-width: 280px;
    margin-left: auto;
    margin-top: 16px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    font-size: 0.9rem;
    color: #334155;
  }
  .totals-row span:first-child {
    font-weight: 700;
    color: #2563eb;
  }
  .totals-row.grand {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 2px solid #bfdbfe;
    font-size: 1.1rem;
  }
  .totals-row.grand span {
    font-weight: 800;
    color: #1d4ed8;
  }
  .doctor-line {
    margin: 28px 0 0;
    padding: 12px 14px;
    background: #eff6ff;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #1e3a8a;
  }
  .invoice-footer {
    margin-top: 36px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    font-size: 0.8rem;
    color: #94a3b8;
  }
  .payment-info strong {
    display: block;
    color: #2563eb;
    margin-bottom: 6px;
    font-size: 0.85rem;
  }
  .signature {
    text-align: center;
    min-width: 160px;
  }
  .signature .line {
    border-bottom: 1px solid #cbd5e1;
    margin-bottom: 6px;
    height: 36px;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .invoice-sheet { box-shadow: none; border-radius: 0; max-width: none; }
  }
</style></head><body>
  <div class="invoice-sheet">
    <header class="invoice-header">
      <div class="invoice-brand">
        <div class="logo-wrap">${LOGO_SVG}</div>
        <div class="brand-lines">
          <p class="tagline">Professional Dental Clinic</p>
          <p class="name">Dental Management System</p>
        </div>
      </div>
      <div class="invoice-title-block">
        <p class="big">INVOICE</p>
      </div>
    </header>

    <div class="invoice-meta-row">
      <div class="meta-left">
        <p><strong>INVOICE NO :</strong> #${idStr}</p>
        <p><strong>DATE :</strong> ${dateShort}</p>
      </div>
      <div class="invoice-to">
        <p class="label">INVOICE TO :</p>
        <p class="patient-name">${patient}</p>
        <p class="patient-tel">${tel}</p>
      </div>
    </div>

    <table class="invoice-items">
      <thead>
        <tr>
          <th>ITEM NAME</th>
          <th>PRICE</th>
          <th>QTY</th>
          <th>TOTAL</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${treatment}</td>
          <td>$${lineAmount}</td>
          <td>1</td>
          <td>$${lineAmount}</td>
        </tr>
      </tbody>
    </table>

    <div class="invoice-totals">
      <div class="totals-row">
        <span>SUBTOTAL</span>
        <span>$${formatMoney(subtotal)}</span>
      </div>
      <div class="totals-row">
        <span>TAX</span>
        <span>$${formatMoney(tax)}</span>
      </div>
      <div class="totals-row grand">
        <span>GRAND TOTAL</span>
        <span>$${formatMoney(grand)}</span>
      </div>
    </div>

    <p class="doctor-line"><strong>Attending doctor:</strong> ${doctor}</p>

    <footer class="invoice-footer">
      <div class="payment-info">
        <strong>Payment info</strong>
        Thank you for choosing our clinic. Please retain this invoice for your records.
      </div>
      <div class="signature">
        <div class="line"></div>
        <span>Signature</span>
      </div>
    </footer>
  </div>
</body></html>`;
}

function renderPdfFromVoucher(v, invoiceId) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const m = 15;
  let y = m;

  const subtotal = parseAmountNumber(v.amount);
  const tax = 0;
  const grand = subtotal + tax;
  const lineAmount = formatMoney(v.amount);
  const dateStr =
    v.date == null || v.date === ''
      ? '—'
      : (() => {
          const str = String(v.date);
          const date = new Date(str.includes('T') ? str : `${str}T12:00:00`);
          if (isNaN(date.getTime())) return str;
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          return `${day}/${month}/${date.getFullYear()}`;
        })();

  // Logo block (left)
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(m, y, 22, 20, 2.5, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DMS', m + 6, y + 12);
  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Dental', m + 4, y + 17);

  doc.setTextColor(30, 64, 175);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Professional Dental Clinic', m + 26, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Dental Management System', m + 26, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(37, 99, 235);
  doc.text('INVOICE', pageW - m, y + 14, { align: 'right' });

  y += 28;

  const metaTop = y;
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE NO :', m, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${invoiceId}`, m + 32, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('DATE :', m, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, m + 32, y);
  const leftBottom = y + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text('INVOICE TO :', pageW - m, metaTop, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const patientLines = doc.splitTextToSize(String(v.patient_name ?? '—'), 58);
  let ty = metaTop + 5;
  patientLines.forEach((line) => {
    doc.text(line, pageW - m, ty, { align: 'right' });
    ty += 5;
  });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(String(v.tel ?? '—'), pageW - m, ty + 1, { align: 'right' });
  ty += 8;

  y = Math.max(leftBottom, ty);

  // Table header
  const col1 = m;
  const col2 = pageW * 0.52;
  const col3 = pageW * 0.68;
  const col4 = pageW - m;
  doc.setFillColor(96, 165, 250);
  doc.rect(m, y, pageW - 2 * m, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ITEM NAME', col1 + 2, y + 5.5);
  doc.text('PRICE', col2, y + 5.5);
  doc.text('QTY', col3, y + 5.5);
  doc.text('TOTAL', col4 - 2, y + 5.5, { align: 'right' });
  y += 10;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const itemName = String(v.treatment ?? 'Service');
  const nameLines = doc.splitTextToSize(itemName, col2 - col1 - 6);
  let rowH = Math.max(10, nameLines.length * 4.5 + 4);
  doc.setFillColor(248, 250, 252);
  doc.rect(m, y - 2, pageW - 2 * m, rowH, 'F');
  let ny = y + 4;
  nameLines.forEach((line) => {
    doc.text(line, col1 + 2, ny);
    ny += 4.5;
  });
  doc.text(`$${lineAmount}`, col2, y + 4);
  doc.text('1', col3, y + 4);
  doc.text(`$${lineAmount}`, col4 - 2, y + 4, { align: 'right' });
  y += rowH + 4;

  // Totals (right)
  const tw = 65;
  const tx = pageW - m - tw;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235);
  doc.text('SUBTOTAL', tx, y);
  doc.text(`$${formatMoney(subtotal)}`, pageW - m, y, { align: 'right' });
  y += 7;
  doc.text('TAX', tx, y);
  doc.text(`$${formatMoney(tax)}`, pageW - m, y, { align: 'right' });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(29, 78, 216);
  doc.text('GRAND TOTAL', tx, y);
  doc.text(`$${formatMoney(grand)}`, pageW - m, y, { align: 'right' });
  y += 12;

  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.setFont('helvetica', 'normal');
  const docLine = doc.splitTextToSize(`Attending doctor: ${v.doctor ?? '—'}`, pageW - 2 * m);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(m, y, pageW - 2 * m, 6 + docLine.length * 4.5, 2, 2, 'F');
  doc.text(docLine, m + 3, y + 5);
  y += 10 + docLine.length * 4.5;

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for choosing our clinic.', m, y);
  doc.text('Signature', pageW - m - 25, y + 15, { align: 'center' });
  doc.line(pageW - m - 45, y + 12, pageW - m - 5, y + 12);

  doc.save(`invoice-${invoiceId}-voucher.pdf`);
}

/** Fetches voucher from GET /api/invoices/{id}/voucher/ then opens print dialog. */
export async function printInvoiceVoucher(inv) {
  const id = getInvoiceId(inv);
  if (id == null) {
    window.alert('Missing invoice ID.');
    return;
  }
  try {
    const res = await invoicesApi.getVoucher(id);
    const voucher = normalizeVoucherPayload(res.data ?? {});
    const html = buildPrintableHtmlFromVoucher(voucher, id);
    const w = window.open('', '_blank');
    if (!w) {
      window.alert('Please allow pop-ups to print the voucher.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.addEventListener('load', () => {
      setTimeout(() => {
        w.focus();
        w.print();
      }, 100);
    });
  } catch (err) {
    window.alert(voucherErrorMessage(err));
  }
}

/** Fetches voucher from API then downloads PDF. */
export async function downloadInvoiceVoucherPdf(inv) {
  const id = getInvoiceId(inv);
  if (id == null) {
    window.alert('Missing invoice ID.');
    return;
  }
  try {
    const res = await invoicesApi.getVoucher(id);
    const voucher = normalizeVoucherPayload(res.data ?? {});
    renderPdfFromVoucher(voucher, id);
  } catch (err) {
    window.alert(voucherErrorMessage(err));
  }
}
