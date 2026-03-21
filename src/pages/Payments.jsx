import { useState, useEffect } from 'react';
import { paymentsApi } from '../api/services';
import PaymentForm from '../components/PaymentForm';
import './Payments.css';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = search ? { search, limit: 50 } : { limit: 50 };
      const res = await paymentsApi.getAll(params);
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.payments ?? data?.items ?? [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load payments. Is the API running?');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await paymentsApi.create(payload);
      setShowForm(false);
      const created = res?.data;
      if (created && (created.id != null || created.payment_id != null)) {
        setPayments((prev) => [created, ...prev]);
      }
      await fetchPayments(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount == null || amount === '') return '—';
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return isNaN(num) ? '—' : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString();
  };

  const getInvoiceLabel = (payment) => {
    const obj = payment.invoice;
    if (obj && typeof obj === 'object') {
      const id = obj.invoice_id ?? obj.id;
      return id != null ? `Invoice #${id}` : '—';
    }
    return payment.invoice != null ? `Invoice #${payment.invoice}` : payment.invoice_id != null ? `Invoice #${payment.invoice_id}` : '—';
  };

  return (
    <div className="payments-page">
      <div className="page-header">
        <h1>Payments</h1>
        <div className="page-header-actions">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <button className="btn-add" onClick={() => setShowForm(true)}>
            Add Payment
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {showForm && (
        <div className="payment-form-modal">
          <PaymentForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            disabled={submitting}
          />
        </div>
      )}

      {loading ? (
        <p>Loading payments...</p>
      ) : (
        <div className="payments-table-wrap">
          <table className="payments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5}>No payments found. Add a payment using the form above.</td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id ?? p.payment_id}>
                    <td>{p.id ?? p.payment_id ?? '—'}</td>
                    <td>{getInvoiceLabel(p)}</td>
                    <td>{formatAmount(p.amount)}</td>
                    <td>{p.method ?? '—'}</td>
                    <td>{formatDate(p.payment_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
