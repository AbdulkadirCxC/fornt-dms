import { useState, useEffect } from 'react';
import { invoicesApi } from '../api/services';
import './PaymentForm.css';

const initialValues = {
  invoice: '',
  amount: '',
  method: 'cash',
  payment_date: '',
};

export default function PaymentForm({ onSubmit, onCancel, initialData = null, disabled = false }) {
  const [formData, setFormData] = useState(initialData ?? initialValues);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

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

  const getInvoiceLabel = (inv) => {
    const id = inv.invoice_id ?? inv.id;
    const patient = inv.patient;
    const patientName = patient && typeof patient === 'object'
      ? (patient.full_name ?? patient.name ?? `#${patient.id ?? patient.patient_id}`)
      : (inv.patient_name ?? (inv.patient_id != null ? `#${inv.patient_id}` : '—'));
    const amount = inv.total_amount;
    const amountStr = amount != null && !isNaN(parseFloat(amount))
      ? parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })
      : '0.00';
    return `Invoice #${id} - ${patientName} - $${amountStr}`;
  };

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Payment' : 'Add Payment'}</h3>

      {error && <div className="payment-form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="invoice">Invoice</label>
        <select
          id="invoice"
          name="invoice"
          value={formData.invoice}
          onChange={handleChange}
        >
          <option value="">Select invoice</option>
          {invoices.map((inv) => (
            <option key={inv.invoice_id ?? inv.id} value={inv.invoice_id ?? inv.id}>
              {getInvoiceLabel(inv)}
            </option>
          ))}
        </select>
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
        />
      </div>

      <div className="form-group">
        <label htmlFor="method">Payment Method</label>
        <select
          id="method"
          name="method"
          value={formData.method ?? 'cash'}
          onChange={handleChange}
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
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          {initialData ? 'Update' : 'Add'} Payment
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
