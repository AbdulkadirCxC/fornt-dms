import { useState, useEffect, useMemo } from 'react';
import { invoicesApi } from '../api/services';
import SearchableSelect from './SearchableSelect';
import './PaymentForm.css';

function getInvoiceLabel(inv) {
  const id = inv.invoice_id ?? inv.id;
  const patient = inv.patient;
  const patientName =
    patient && typeof patient === 'object'
      ? patient.full_name ?? patient.name ?? `#${patient.id ?? patient.patient_id}`
      : inv.patient_name ?? (inv.patient_id != null ? `#${inv.patient_id}` : '—');
  const amount = inv.total_amount;
  const amountStr =
    amount != null && !isNaN(parseFloat(amount))
      ? parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })
      : '0.00';
  return `Invoice #${id} - ${patientName} - $${amountStr}`;
}

const initialValues = {
  invoice: '',
  amount: '',
  method: 'cash',
  payment_date: '',
};

function mergeInitialState(initialData, fixedInvoiceId) {
  const base = { ...initialValues, ...initialData };
  if (fixedInvoiceId != null) {
    base.invoice = String(fixedInvoiceId);
  }
  return base;
}

/**
 * @param {object} [props]
 * @param {string|number|null} [props.fixedInvoiceId] — If set, invoice is read-only (e.g. pay from invoice table).
 * @param {string} [props.fixedInvoiceHint] — Shown next to invoice number (e.g. patient name).
 * @param {string} [props.fixedInvoiceBalance] — Formatted balance due (from invoice list).
 * @param {boolean} [props.paymentBlocked] — True when no payment is allowed (e.g. paid / zero balance).
 * @param {string} [props.paymentBlockedHint] — Shown when payment is blocked.
 */
export default function PaymentForm({
  onSubmit,
  onCancel,
  initialData = null,
  disabled = false,
  fixedInvoiceId = null,
  fixedInvoiceHint = '',
  fixedInvoiceBalance = '',
  paymentBlocked = false,
  paymentBlockedHint = '',
  /** Hide the form heading (e.g. when the parent drawer supplies the title). */
  hideTitle = false,
}) {
  const [formData, setFormData] = useState(() => mergeInitialState(initialData, fixedInvoiceId));
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(fixedInvoiceId == null);

  useEffect(() => {
    if (fixedInvoiceId != null) {
      setLoading(false);
      return;
    }
    const loadInvoices = async () => {
      try {
        const res = await invoicesApi.getAll({ limit: 100 });
        const data = res.data;
        const list = Array.isArray(data)
          ? data
          : data?.results ?? data?.data ?? data?.invoices ?? [];
        setInvoices(Array.isArray(list) ? list : []);
      } catch {
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, [fixedInvoiceId]);

  const invoiceOptions = useMemo(
    () =>
      invoices.map((inv) => ({
        value: inv.invoice_id ?? inv.id,
        label: getInvoiceLabel(inv),
      })),
    [invoices]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const amountVal = formData.amount?.trim();
    const payload = {
      invoice: formData.invoice ? Number(formData.invoice) : null,
      amount: amountVal ? parseFloat(amountVal) : null,
      method: formData.method || null,
      payment_date: formData.payment_date || null,
    };

    if (payload.amount != null && (isNaN(payload.amount) || payload.amount < 0)) {
      setError('Amount must be a valid positive number');
      return;
    }

    onSubmit(payload);
  };

  if (loading) {
    return <div className="payment-form-loading">Loading invoices...</div>;
  }

  const title =
    fixedInvoiceId != null
      ? 'Record payment'
      : initialData
        ? 'Edit Payment'
        : 'Add Payment';

  return (
    <form
      className={`payment-form${hideTitle ? ' payment-form--drawer' : ''}`}
      onSubmit={handleSubmit}
    >
      {!hideTitle && <h3>{title}</h3>}

      {error && <div className="payment-form-error">{error}</div>}

      {paymentBlocked && paymentBlockedHint ? (
        <div className="payment-form-blocked-hint" role="status">
          {paymentBlockedHint}
        </div>
      ) : null}

      {fixedInvoiceId != null ? (
        <div className="form-grid-row form-grid-row--2">
          <div className="form-group">
            <span className="payment-form-label">Invoice</span>
            <div className="payment-form-fixed-invoice" id="invoice">
              <strong>#{fixedInvoiceId}</strong>
              {fixedInvoiceHint ? <span className="payment-form-fixed-hint">{fixedInvoiceHint}</span> : null}
            </div>
            <p className="payment-form-balance-line">
              <span className="payment-form-label">Balance due</span>
              <span className="payment-form-balance-value">${fixedInvoiceBalance || '—'}</span>
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              type="number"
              id="amount"
              name="amount"
              min="0"
              step="0.01"
              value={formData.amount ?? ''}
              onChange={handleChange}
              placeholder="0.00"
              disabled={disabled}
            />
          </div>
        </div>
      ) : (
        <div className="form-grid-row form-grid-row--2">
          <div className="form-group">
            <label htmlFor="invoice">Invoice</label>
            <SearchableSelect
              id="invoice"
              name="invoice"
              value={formData.invoice}
              onChange={handleChange}
              options={invoiceOptions}
              disabled={disabled}
              emptyOptionLabel="Select invoice"
              searchPlaceholder="Search invoices…"
            />
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              type="number"
              id="amount"
              name="amount"
              min="0"
              step="0.01"
              value={formData.amount ?? ''}
              onChange={handleChange}
              placeholder="0.00"
              disabled={disabled}
            />
          </div>
        </div>
      )}

      <div className="form-grid-row form-grid-row--2">
        <div className="form-group">
          <label htmlFor="method">Payment Method</label>
          <select
            id="method"
            name="method"
            value={formData.method ?? 'cash'}
            onChange={handleChange}
            disabled={disabled}
          >
            <option value="mobile">EVC Plus</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="check">Check</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="payment_date">Payment Date</label>
          <input
            type="date"
            id="payment_date"
            name="payment_date"
            value={formData.payment_date ?? ''}
            onChange={handleChange}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          {initialData && fixedInvoiceId == null ? 'Update' : 'Add'} Payment
        </button>
        {onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
