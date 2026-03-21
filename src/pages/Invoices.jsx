import { useState, useEffect } from 'react';
import { invoicesApi } from '../api/services';
import InvoiceForm from '../components/InvoiceForm';
import './Invoices.css';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = search ? { search, limit: 50 } : { limit: 50 };
      const res = await invoicesApi.getAll(params);
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.invoices ?? data?.items ?? [];
      setInvoices(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load invoices. Is the API running?');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await invoicesApi.create(payload);
      setShowForm(false);
      const created = res?.data;
      if (created && (created.invoice_id != null || created.id != null)) {
        setInvoices((prev) => [created, ...prev]);
      }
      await fetchInvoices(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount == null || amount === '') return '—';
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return isNaN(num) ? '—' : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  const getPatientLabel = (inv) => {
    const obj = inv.patient;
    if (obj && typeof obj === 'object') {
      return obj.full_name ?? obj.name ?? (obj.id != null ? `#${obj.id}` : '—');
    }
    return inv.patient_name ?? inv.patientName ?? (inv.patient_id != null ? `#${inv.patient_id}` : (inv.patient != null ? `#${inv.patient}` : '—'));
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="invoices-page">
      <div className="page-header">
        <h1>Invoices</h1>
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
            Add Invoice
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {showForm && (
        <div className="invoice-form-modal">
          <InvoiceForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            disabled={submitting}
          />
        </div>
      )}

      {loading ? (
        <p>Loading invoices...</p>
      ) : (
        <div className="invoices-table-wrap">
          <table className="invoices-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Patient</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5}>No invoices found. Add an invoice using the form above.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.invoice_id ?? inv.id}>
                    <td>{inv.invoice_id ?? inv.id ?? '—'}</td>
                    <td>{getPatientLabel(inv)}</td>
                    <td>{formatAmount(inv.total_amount)}</td>
                    <td>
                      <span className={`status-badge ${(inv.status ?? '').toLowerCase().replace(/ /g, '-')}`}>
                        {inv.status ?? '—'}
                      </span>
                    </td>
                    <td>{formatDate(inv.created_at)}</td>
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
