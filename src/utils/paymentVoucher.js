import { jsPDF } from 'jspdf';
import { paymentsApi } from '../api/services/payments';

export function getPaymentId(p) {
  return p.id ?? p.payment_id;
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

function formatDateShort(d) {
  if (!d && d !== 0) return '—';
  const str = String(d);
  const date = new Date(str.includes('T') ? str : `${str}T12:00:00`);
  if (isNaN(date.getTime())) return escapeHtml(str);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatMethod(m) {
  if (m == null || m === '') return '—';
  const s = String(m).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Normalize GET /api/payments/{id}/voucher/ JSON. */
export function normalizePaymentVoucherPayload(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return {
    patient_name: raw.patient_name ?? raw.patientName,
    tel: raw.tel ?? raw.phone ?? raw.telephone,
    invoice_id: raw.invoice_id ?? raw.invoiceId,
    invoice_total: raw.invoice_total ?? raw.invoiceTotal,
    amount: raw.amount,
    method: raw.method,
    payment_date: raw.payment_date ?? raw.paymentDate,
    treatment: raw.treatment,
    doctor: raw.doctor ?? raw.doctor_name,
    total_paid: raw.total_paid ?? raw.totalPaid,
    balance: raw.balance,
  };
}

function voucherErrorMessage(err) {
  const d = err.response?.data;
  if (!d) return err.message || 'Could not load payment voucher.';
  if (typeof d.detail === 'string') return d.detail;
  if (typeof d.message === 'string') return d.message;
  return 'Could not load payment voucher.';
}

const LOGO_SVG = `
<svg class="invoice-logo-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="pv" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="80" height="80" rx="12" fill="url(#pv)"/>
  <path fill="#ffffff" d="M40 18c-6 0-10 4-12 10-1 3-2 7-2 11 0 8 2 15 5 22 2 4 5 7 9 7s7-3 9-7c3-7 5-14 5-22 0-4-1-8-2-11-2-6-6-10-12-10zm-8 45c-2 0-4-2-5-5-2-6-3-12-3-18 0-3 0-6 1-8 1-4 3-6 5-6 3 0 5 4 6 10l2 14c0 8-2 13-6 13zm16 0c-4 0-6-5-6-13l2-14c1-6 3-10 6-10 2 0 4 2 5 6 1 2 1 5 1 8 0 6-1 12-3 18-1 3-3 5-5 5z"/>
</svg>
`;

const PAYMENT_VOUCHER_STYLES = `
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
  .invoice-brand { display: flex; align-items: center; gap: 16px; }
  .logo-wrap { flex-shrink: 0; width: 80px; height: 80px; filter: drop-shadow(0 4px 12px rgba(37, 99, 235, 0.25)); }
  .invoice-logo-svg { width: 80px; height: 80px; display: block; }
  .brand-lines .tagline { margin: 0 0 4px; font-size: 0.85rem; font-weight: 600; color: #1e40af; letter-spacing: 0.02em; }
  .brand-lines .name { margin: 0; font-size: 0.75rem; color: #64748b; }
  .invoice-title-block { text-align: right; }
  .invoice-title-block .big { margin: 0; font-size: 2.2rem; font-weight: 800; color: #2563eb; letter-spacing: 0.06em; line-height: 1; }
  .invoice-meta-row { display: flex; justify-content: space-between; gap: 32px; margin-bottom: 24px; }
  .meta-left p { margin: 0 0 10px; font-size: 0.9rem; color: #334155; }
  .meta-left strong { color: #1e40af; font-weight: 700; margin-right: 6px; }
  .invoice-to { text-align: right; min-width: 220px; }
  .invoice-to .label { margin: 0 0 8px; font-size: 0.8rem; font-weight: 800; color: #1e40af; letter-spacing: 0.08em; }
  .invoice-to .patient-name { margin: 0 0 4px; font-size: 1.05rem; font-weight: 600; color: #0f172a; }
  .invoice-to .patient-tel { margin: 0; font-size: 0.9rem; color: #64748b; }
  .pv-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.9rem; }
  .pv-table th {
    text-align: left;
    padding: 10px 12px;
    background: linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%);
    color: #fff;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
  }
  .pv-table td { padding: 12px 14px; border-bottom: 1px solid #e2e8f0; color: #334155; }
  .pv-table td:last-child { text-align: right; font-weight: 600; color: #0f172a; white-space: nowrap; }
  .pv-table td.pv-text { text-align: left !important; font-weight: 500; color: #0f172a; }
  .pv-table tr:nth-child(even) td { background: #f8fafc; }
  .pv-summary { max-width: 320px; margin-left: auto; margin-top: 8px; }
  .pv-summary .row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 0.95rem; border-bottom: 1px solid #e2e8f0; }
  .pv-summary .row strong { color: #2563eb; }
  .pv-summary .row.grand { margin-top: 8px; padding-top: 14px; border-top: 2px solid #bfdbfe; border-bottom: none; font-size: 1.05rem; font-weight: 800; color: #1d4ed8; }
  .doctor-line {
    margin: 24px 0 0;
    padding: 12px 14px;
    background: #eff6ff;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #1e3a8a;
  }
  .invoice-footer {
    margin-top: 32px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 24px;
    font-size: 0.8rem;
    color: #94a3b8;
  }
  .payment-info strong { display: block; color: #2563eb; margin-bottom: 6px; font-size: 0.85rem; }
  .signature { text-align: center; min-width: 160px; }
  .signature .line { border-bottom: 1px solid #cbd5e1; margin-bottom: 6px; height: 36px; }
  @media print {
    body { background: #fff; padding: 0; }
    .invoice-sheet { box-shadow: none; border-radius: 0; max-width: none; }
  }
`;

function buildPrintableHtmlFromPaymentVoucher(v, paymentId) {
  const idStr = escapeHtml(String(paymentId));
  const patient = escapeHtml(v.patient_name ?? '—');
  const tel = escapeHtml(v.tel ?? '—');
  const invId = v.invoice_id != null ? escapeHtml(String(v.invoice_id)) : '—';
  const invTotal = formatMoney(v.invoice_total);
  const payAmt = formatMoney(v.amount);
  const method = escapeHtml(formatMethod(v.method));
  const dateShort = formatDateShort(v.payment_date);
  const treatment = escapeHtml(v.treatment ?? '—');
  const doctor = escapeHtml(v.doctor ?? '—');
  const totalPaid = formatMoney(v.total_paid);
  const balance = formatMoney(v.balance);

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Payment #${idStr}</title>
<style>${PAYMENT_VOUCHER_STYLES}</style></head><body>
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
        <p class="big">PAYMENT VOUCHER</p>
      </div>
    </header>

    <div class="invoice-meta-row">
      <div class="meta-left">
        <p><strong>PAYMENT NO :</strong> #${idStr}</p>
        <p><strong>DATE :</strong> ${dateShort}</p>
        <p><strong>INVOICE NO :</strong> #${invId}</p>
      </div>
      <div class="invoice-to">
        <p class="label">RECEIVED FROM :</p>
        <p class="patient-name">${patient}</p>
        <p class="patient-tel">${tel}</p>
      </div>
    </div>

    <table class="pv-table">
      <thead><tr><th colspan="2">Payment details</th></tr></thead>
      <tbody>
        <tr><td>Invoice total</td><td>$${invTotal}</td></tr>
        <tr><td>This payment</td><td>$${payAmt}</td></tr>
        <tr><td>Method</td><td class="pv-text">${method}</td></tr>
        <tr><td>Treatment</td><td class="pv-text">${treatment}</td></tr>
      </tbody>
    </table>

    <div class="pv-summary">
      <div class="row"><strong>Total paid (on invoice)</strong><span>$${totalPaid}</span></div>
      <div class="row grand"><strong>Balance</strong><span>$${balance}</span></div>
    </div>

    <p class="doctor-line"><strong>Attending doctor:</strong> ${doctor}</p>

    <footer class="invoice-footer">
      <div class="payment-info">
        <strong>Payment receipt</strong>
        Thank you. Please retain this voucher for your records.
      </div>
      <div class="signature">
        <div class="line"></div>
        <span>Signature</span>
      </div>
    </footer>
  </div>
</body></html>`;
}

function renderPdfFromPaymentVoucher(v, paymentId) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const m = 15;
  let y = m;

  doc.setFillColor(37, 99, 235);
  doc.roundedRect(m, y, 22, 20, 2.5, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DMS', m + 6, y + 12);

  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PAYMENT VOUCHER', pageW - m, y + 14, { align: 'right' });
  y += 28;

  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT NO :', m, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${paymentId}`, m + 32, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('DATE :', m, y);
  doc.setFont('helvetica', 'normal');
  const dateStr = v.payment_date
    ? (() => {
        const str = String(v.payment_date);
        const d = new Date(str.includes('T') ? str : `${str}T12:00:00`);
        if (isNaN(d.getTime())) return str;
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      })()
    : '—';
  doc.text(dateStr, m + 32, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE NO :', m, y);
  doc.setFont('helvetica', 'normal');
  doc.text(v.invoice_id != null ? `#${v.invoice_id}` : '—', m + 32, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text('RECEIVED FROM :', pageW - m, y - 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  const patientLines = doc.splitTextToSize(String(v.patient_name ?? '—'), 55);
  let ty = y - 10;
  patientLines.forEach((line) => {
    doc.text(line, pageW - m, ty, { align: 'right' });
    ty += 5;
  });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(String(v.tel ?? '—'), pageW - m, ty + 1, { align: 'right' });
  y = Math.max(y, ty + 8);

  const rows = [
    ['Invoice total', `$${formatMoney(v.invoice_total)}`],
    ['This payment', `$${formatMoney(v.amount)}`],
    ['Method', formatMethod(v.method)],
    ['Treatment', String(v.treatment ?? '—')],
  ];

  doc.setFillColor(96, 165, 250);
  doc.rect(m, y, pageW - 2 * m, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Payment details', m + 2, y + 5.5);
  y += 10;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  rows.forEach(([label, val]) => {
    doc.text(label, m + 2, y + 5);
    doc.text(val, pageW - m - 2, y + 5, { align: 'right' });
    y += 7;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text('Total paid (on invoice)', m + 2, y + 5);
  doc.text(`$${formatMoney(v.total_paid)}`, pageW - m - 2, y + 5, { align: 'right' });
  y += 8;
  doc.setFontSize(11);
  doc.setTextColor(29, 78, 216);
  doc.text('Balance', m + 2, y + 5);
  doc.text(`$${formatMoney(v.balance)}`, pageW - m - 2, y + 5, { align: 'right' });
  y += 14;

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
  doc.text('Thank you. Please retain this voucher for your records.', m, y);

  doc.save(`payment-${paymentId}-voucher.pdf`);
}

/**
 * Opens the printable payment voucher in a new tab (no print dialog).
 * Use after recording a payment so the user can review or Ctrl+P to print.
 */
export async function openPaymentVoucherInNewTab(payment) {
  const id = getPaymentId(payment);
  if (id == null) throw new Error('Missing payment ID.');
  const res = await paymentsApi.getVoucher(id);
  const voucher = normalizePaymentVoucherPayload(res.data ?? {});
  const html = buildPrintableHtmlFromPaymentVoucher(voucher, id);
  const w = window.open('', '_blank');
  if (!w) throw new Error('Pop-up blocked. Allow pop-ups for this site.');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.focus(), 0);
}

export async function printPaymentVoucher(payment) {
  const id = getPaymentId(payment);
  if (id == null) {
    window.alert('Missing payment ID.');
    return;
  }
  try {
    const res = await paymentsApi.getVoucher(id);
    const voucher = normalizePaymentVoucherPayload(res.data ?? {});
    const html = buildPrintableHtmlFromPaymentVoucher(voucher, id);
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

export async function downloadPaymentVoucherPdf(payment) {
  const id = getPaymentId(payment);
  if (id == null) {
    window.alert('Missing payment ID.');
    return;
  }
  try {
    const res = await paymentsApi.getVoucher(id);
    const voucher = normalizePaymentVoucherPayload(res.data ?? {});
    renderPdfFromPaymentVoucher(voucher, id);
  } catch (err) {
    window.alert(voucherErrorMessage(err));
  }
}
