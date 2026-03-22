/** Printable visit invoice from GET /api/patient-treatments/visit-document?ids=… (JSON). Matches voucher styling in invoiceVoucher.js. */

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

/** Normalize visit-document JSON (snake_case + optional camelCase). */
export function normalizeVisitDocumentPayload(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const items = Array.isArray(raw.line_items) ? raw.line_items : [];
  const line_items = items.map((row) => {
    const price = parseAmountNumber(row.price);
    const qtyRaw = row.qty != null ? row.qty : row.quantity != null ? row.quantity : 1;
    const qty = Math.max(1, parseAmountNumber(qtyRaw) || 1);
    let total = row.total != null ? parseAmountNumber(row.total) : row.line_total != null ? parseAmountNumber(row.line_total) : price * qty;
    if (isNaN(total)) total = price * qty;
    return {
      name: row.name ?? row.item_name ?? '—',
      price,
      qty,
      total,
    };
  });
  const subtotal = line_items.reduce((s, r) => s + r.total, 0);
  let grand = raw.grand_total != null ? parseAmountNumber(raw.grand_total) : raw.grandTotal != null ? parseAmountNumber(raw.grandTotal) : 0;
  if (!grand && line_items.length) grand = subtotal;

  return {
    patient_name: raw.patient_name ?? raw.patientName,
    tel: raw.tel ?? raw.phone ?? raw.telephone,
    date: raw.date,
    doctor: raw.doctor ?? raw.doctor_name,
    line_items,
    subtotal,
    tax: 0,
    grand_total: grand || subtotal,
  };
}

const LOGO_SVG = `
<svg class="invoice-logo-svg" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="80" height="80" rx="12" fill="url(#vg)"/>
  <path fill="#ffffff" d="M40 18c-6 0-10 4-12 10-1 3-2 7-2 11 0 8 2 15 5 22 2 4 5 7 9 7s7-3 9-7c3-7 5-14 5-22 0-4-1-8-2-11-2-6-6-10-12-10zm-8 45c-2 0-4-2-5-5-2-6-3-12-3-18 0-3 0-6 1-8 1-4 3-6 5-6 3 0 5 4 6 10l2 14c0 8-2 13-6 13zm16 0c-4 0-6-5-6-13l2-14c1-6 3-10 6-10 2 0 4 2 5 6 1 2 1 5 1 8 0 6-1 12-3 18-1 3-3 5-5 5z"/>
</svg>
`;

const INVOICE_PRINT_STYLES = `
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
`;

/**
 * @param {ReturnType<typeof normalizeVisitDocumentPayload>} v
 */
export function buildPrintableHtmlFromVisitDocumentJson(v) {
  const refLabel = escapeHtml('Visit');
  const patient = escapeHtml(v.patient_name ?? '—');
  const tel = escapeHtml(v.tel ?? '—');
  const doctor = escapeHtml(v.doctor ?? '—');
  const dateShort = formatInvoiceDateShort(v.date);
  const lineItems = Array.isArray(v.line_items) ? v.line_items : [];
  const rowsHtml =
    lineItems.length > 0
      ? lineItems
          .map((row) => {
            const name = escapeHtml(row.name ?? '—');
            const price = formatMoney(row.price);
            const qty = escapeHtml(String(row.qty ?? 1));
            const total = formatMoney(row.total);
            return `<tr><td>${name}</td><td>$${price}</td><td>${qty}</td><td>$${total}</td></tr>`;
          })
          .join('')
      : '<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:20px;">No line items</td></tr>';

  const subtotal = v.subtotal != null ? parseAmountNumber(v.subtotal) : lineItems.reduce((s, r) => s + parseAmountNumber(r.total), 0);
  const tax = parseAmountNumber(v.tax ?? 0);
  const grand = v.grand_total != null ? parseAmountNumber(v.grand_total) : subtotal + tax;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Visit invoice</title>
<style>${INVOICE_PRINT_STYLES}</style></head><body>
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
        <p><strong>INVOICE NO :</strong> #${refLabel}</p>
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
        ${rowsHtml}
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
