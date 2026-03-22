import { useState, useEffect } from 'react';
import { patientTreatmentsApi } from '../api/services';
import PatientTreatmentForm from '../components/PatientTreatmentForm';
import {
  openVisitDocumentWithAuth,
  ensureVisitDocumentJsonUrl,
  openVisitDocumentForIds,
} from '../utils/openVisitDocument';
import './PatientTreatments.css';

export default function PatientTreatments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visitSuccess, setVisitSuccess] = useState(null);
  const [openingDocument, setOpeningDocument] = useState(false);
  const [printingRowId, setPrintingRowId] = useState(null);

  const fetchItems = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = search ? { search, limit: 50 } : { limit: 50 };
      const res = await patientTreatmentsApi.getAll(params);
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.patient_treatments ?? data?.items ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load patient treatments. Is the API running?');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems();
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setError(null);
    setVisitSuccess(null);
    try {
      const res = await patientTreatmentsApi.createBatch(payload);
      const data = res.data ?? {};
      const created = Array.isArray(data.patient_treatments) ? data.patient_treatments : [];
      const docUrl = data.visit_document_url ?? null;
      setShowForm(false);
      await fetchItems(true);
      if (docUrl) {
        setVisitSuccess({
          url: ensureVisitDocumentJsonUrl(docUrl),
          count: created.length,
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        err.response?.data?.message ??
        'Failed to save patient treatments.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenVisitDocument = async () => {
    if (!visitSuccess?.url) return;
    setOpeningDocument(true);
    try {
      await openVisitDocumentWithAuth(visitSuccess.url);
    } catch {
      window.open(visitSuccess.url, '_blank', 'noopener,noreferrer');
    } finally {
      setOpeningDocument(false);
    }
  };

  const handlePrintVisitForRow = async (rowId) => {
    if (rowId == null) return;
    setPrintingRowId(rowId);
    setError(null);
    try {
      await openVisitDocumentForIds(rowId);
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        err.response?.data?.message ??
        err.message ??
        'Could not open visit document.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPrintingRowId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString();
  };

  const formatCost = (cost) => {
    if (cost == null || cost === '') return '—';
    const num = typeof cost === 'number' ? cost : parseFloat(cost);
    return isNaN(num) ? '—' : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  const getLabel = (item, key) => {
    const obj = item[key];
    const nameKey = `${key}_name`;
    const nameKeyAlt = `${key}Name`;
    if (obj && typeof obj === 'object') {
      return obj.full_name ?? obj.name ?? obj.title ?? (obj.id != null ? `#${obj.id}` : '—');
    }
    return item[nameKey] ?? item[nameKeyAlt] ?? (obj != null ? `#${obj}` : '—');
  };

  return (
    <div className="patient-treatments-page">
      <div className="page-header">
        <h1>Patient Treatments</h1>
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
          <button
            className="btn-add"
            onClick={() => {
              setVisitSuccess(null);
              setShowForm(true);
            }}
          >
            Add patient treatments
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {visitSuccess && (
        <div className="page-success visit-success-banner" role="status">
          <div className="visit-success-text">
            <p className="visit-success-title">
              {visitSuccess.count
                ? `Saved ${visitSuccess.count} treatment${visitSuccess.count === 1 ? '' : 's'} for this visit.`
                : 'Treatments saved for this visit.'}
            </p>
            <p className="visit-success-hint">
              Open the visit document to see one invoice listing all treatments in a table. Then use{' '}
              <strong>Print</strong> (<strong>Ctrl+P</strong> or <strong>⌘P</strong>) or choose{' '}
              <strong>Save as PDF</strong> in your browser’s print dialog.               To print again later, use <strong>Print visit</strong> on a row in the table (opens the same
              printable page; use <strong>Ctrl+P</strong> there). After a new save, this banner opens the
              invoice for every treatment ID from that visit in one go.
            </p>
          </div>
          <div className="visit-success-actions">
            <button
              type="button"
              className="btn-visit-doc"
              onClick={handleOpenVisitDocument}
              disabled={openingDocument}
            >
              {openingDocument ? 'Opening…' : 'Open visit document'}
            </button>
            <a
              className="visit-doc-link"
              href={visitSuccess.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in new tab
            </a>
            <button
              type="button"
              className="btn-dismiss-success"
              onClick={() => setVisitSuccess(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="patient-treatment-form-modal">
          <PatientTreatmentForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            disabled={submitting}
          />
        </div>
      )}

      {loading ? (
        <p>Loading patient treatments...</p>
      ) : (
        <div className="patient-treatments-table-wrap">
          <table className="patient-treatments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Treatment</th>
                <th>Dentist</th>
                <th>Date</th>
                <th>Cost Override</th>
                <th>Effective cost</th>
                <th>Invoice</th>
                <th>Print visit</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9}>No patient treatments found. Add one using the form above.</td>
                </tr>
              ) : (
                items.map((item) => {
                  const rowId = item.id ?? item.patient_treatment_id;
                  const busy = printingRowId === rowId;
                  return (
                    <tr key={rowId}>
                      <td>{rowId ?? '—'}</td>
                      <td>{getLabel(item, 'patient')}</td>
                      <td>{getLabel(item, 'treatment')}</td>
                      <td>{getLabel(item, 'dentist')}</td>
                      <td>{formatDate(item.date ?? item.treatment_date)}</td>
                      <td>{formatCost(item.cost_override)}</td>
                      <td>{formatCost(item.effective_cost)}</td>
                      <td>{item.invoice_id ?? item.invoiceId ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-print-visit-row"
                          onClick={() => handlePrintVisitForRow(rowId)}
                          disabled={rowId == null || busy}
                          title="Open printable visit invoice for this treatment (use Ctrl+P in the new tab)"
                        >
                          {printingRowId === rowId ? 'Opening…' : 'Print visit'}
                        </button>
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
