import { useState, useEffect } from 'react';
import { invoicesApi, paymentsApi } from '../api/services';
import InvoiceForm from '../components/InvoiceForm';
import PaymentForm from '../components/PaymentForm';
import {
  getInvoicePatientLabel,
  printInvoiceVoucher,
  downloadInvoiceVoucherPdf,
} from '../utils/invoiceVoucher';
import { openPaymentVoucherInNewTab } from '../utils/paymentVoucher';
import './Invoices.css';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voucherLoadingId, setVoucherLoadingId] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState(null);

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

  useEffect(() => {
    if (!paymentInvoice) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [paymentInvoice]);

  useEffect(() => {
    if (!paymentInvoice) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !paymentSubmitting) setPaymentInvoice(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [paymentInvoice, paymentSubmitting]);

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

  const handlePaymentSubmit = async (payload) => {
    if (paymentInvoice && isInvoicePaymentBlocked(paymentInvoice)) return;
    setPaymentSubmitting(true);
    setError(null);
    setPaymentNotice(null);
    try {
      const res = await paymentsApi.create(payload);
      const created = res?.data ?? {};
      const paymentId = created.id ?? created.payment_id ?? created.pk;
      setPaymentInvoice(null);
      await fetchInvoices(true);
      if (paymentId != null) {
        try {
          await openPaymentVoucherInNewTab({ id: paymentId });
        } catch {
          setPaymentNotice(
            'Payment saved. The voucher could not open in a new tab—allow pop-ups, or use Print on the Payments page.',
          );
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        err.response?.data?.message ??
        'Failed to record payment.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const formatAmount = (amount) => {
    if (amount == null || amount === '') return '—';
    const num = typeof amount === 'number' ? amount : parseFloat(amount);
    return isNaN(num) ? '—' : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  const getPaidAmount = (inv) => inv.paid_amount ?? inv.paidAmount ?? inv.total_paid;
  const getBalance = (inv) => inv.balance ?? inv.remaining_balance ?? inv.remainingBalance;

  /** No further payment when status is paid/cancelled or balance is 0 or less (incl. overpaid). */
  const isInvoicePaymentBlocked = (inv) => {
    if (!inv) return true;
    const st = (inv.status ?? '').toLowerCase().trim().replace(/\s+/g, '_');
    if (st === 'paid' || st === 'cancelled') return true;
    const bal = getBalance(inv);
    if (bal != null && bal !== '') {
      const n = parseFloat(bal);
      if (!isNaN(n) && n <= 0) return true;
    }
    return false;
  };

  /** Default amount: remaining balance if positive; else invoice total only when balance unknown. */
  const getDefaultPaymentAmount = (inv) => {
    const bal = getBalance(inv);
    if (bal != null && bal !== '') {
      const n = parseFloat(bal);
      if (!isNaN(n) && n > 0) return String(n);
      if (!isNaN(n) && n <= 0) return '';
    }
    const tot = inv.total_amount;
    if (tot != null && tot !== '') return String(tot);
    return '';
  };

  const runVoucherAction = async (inv, action) => {
    const id = inv.invoice_id ?? inv.id;
    setVoucherLoadingId(id);
    try {
      await action(inv);
    } finally {
      setVoucherLoadingId(null);
    }
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

      {paymentNotice && (
        <div className="invoice-payment-flash" role="status">
          {paymentNotice}
        </div>
      )}

      {paymentInvoice && (
        <div
          className="invoice-payment-drawer-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-payment-drawer-title"
        >
          <div
            className="invoice-payment-backdrop"
            aria-hidden="true"
            onClick={() => !paymentSubmitting && setPaymentInvoice(null)}
          />
          <div className="invoice-payment-panel">
            <div className="invoice-payment-panel-header">
              <h2 id="invoice-payment-drawer-title">Record payment</h2>
              <button
                type="button"
                className="invoice-payment-panel-close"
                aria-label="Close"
                disabled={paymentSubmitting}
                onClick={() => setPaymentInvoice(null)}
              >
                ×
              </button>
            </div>
            <div className="invoice-payment-panel-body">
              <PaymentForm
                key={paymentInvoice.invoice_id ?? paymentInvoice.id}
                fixedInvoiceId={paymentInvoice.invoice_id ?? paymentInvoice.id}
                fixedInvoiceHint={getInvoicePatientLabel(paymentInvoice)}
                fixedInvoiceBalance={formatAmount(getBalance(paymentInvoice))}
                initialData={{
                  amount: getDefaultPaymentAmount(paymentInvoice),
                  method: 'cash',
                  payment_date: new Date().toISOString().slice(0, 10),
                }}
                onSubmit={handlePaymentSubmit}
                onCancel={() => setPaymentInvoice(null)}
                disabled={paymentSubmitting || isInvoicePaymentBlocked(paymentInvoice)}
                paymentBlocked={isInvoicePaymentBlocked(paymentInvoice)}
                paymentBlockedHint="This invoice is paid or has no balance due. You cannot add another payment."
                hideTitle
              />
            </div>
          </div>
        </div>
      )}

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
                <th>Paid Amount</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8}>No invoices found. Add an invoice using the form above.</td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const rowId = inv.invoice_id ?? inv.id;
                  const voucherBusy = voucherLoadingId === rowId;
                  const payBusy = paymentSubmitting;
                  const payBlocked = isInvoicePaymentBlocked(inv);
                  return (
                    <tr key={rowId}>
                      <td>{rowId ?? '—'}</td>
                      <td>{getInvoicePatientLabel(inv)}</td>
                      <td>{formatAmount(inv.total_amount)}</td>
                      <td>{formatAmount(getPaidAmount(inv))}</td>
                      <td>{formatAmount(getBalance(inv))}</td>
                      <td>
                        <span className={`status-badge ${(inv.status ?? '').toLowerCase().replace(/ /g, '-')}`}>
                          {inv.status ?? '—'}
                        </span>
                      </td>
                      <td>{formatDate(inv.created_at)}</td>
                      <td>
                        <div className="invoice-voucher-actions">
                          <button
                            type="button"
                            className="btn-invoice-pay"
                            disabled={payBusy || payBlocked}
                            onClick={() => {
                              setPaymentNotice(null);
                              setPaymentInvoice(inv);
                            }}
                            title={
                              payBlocked
                                ? 'No payment due (paid, cancelled, or balance is zero)'
                                : 'Record payment for this invoice'
                            }
                          >
                            Pay
                          </button>
                          <button
                            type="button"
                            className="btn-voucher-print"
                            disabled={voucherBusy}
                            onClick={() => runVoucherAction(inv, printInvoiceVoucher)}
                            title="Print voucher"
                          >
                            {voucherBusy ? '…' : 'Print'}
                          </button>
                          <button
                            type="button"
                            className="btn-voucher-pdf"
                            disabled={voucherBusy}
                            onClick={() => runVoucherAction(inv, downloadInvoiceVoucherPdf)}
                            title="Download PDF"
                          >
                            {voucherBusy ? '…' : 'PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
