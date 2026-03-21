import { useState, useEffect } from 'react';
import { treatmentsApi } from '../api/services';
import TreatmentForm from '../components/TreatmentForm';
import './Treatments.css';

export default function Treatments() {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchTreatments = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = search ? { search, limit: 50 } : { limit: 50 };
      const res = await treatmentsApi.getAll(params);
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.treatments ?? data?.items ?? [];
      setTreatments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load treatments. Is the API running?');
      setTreatments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTreatments();
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await treatmentsApi.create(payload);
      setShowForm(false);
      const created = res?.data;
      if (created && (created.id != null || created.treatment_id != null)) {
        setTreatments((prev) => [created, ...prev]);
      }
      await fetchTreatments(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add treatment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCost = (cost) => {
    if (cost == null || cost === '') return '—';
    const num = typeof cost === 'number' ? cost : parseFloat(cost);
    return isNaN(num) ? '—' : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  return (
    <div className="treatments-page">
      <div className="page-header">
        <h1>Treatments</h1>
        <div className="page-header-actions">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <button className="btn-add" onClick={() => setShowForm(true)}>
            Add Treatment
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {showForm && (
        <div className="treatment-form-modal">
          <TreatmentForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            disabled={submitting}
          />
        </div>
      )}

      {loading ? (
        <p>Loading treatments...</p>
      ) : (
        <div className="treatments-table-wrap">
          <table className="treatments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {treatments.length === 0 ? (
                <tr>
                  <td colSpan={4}>No treatments found. Add a treatment using the form above.</td>
                </tr>
              ) : (
                treatments.map((t) => (
                  <tr key={t.id ?? t.treatmentId}>
                    <td>{t.id ?? t.treatmentId ?? '—'}</td>
                    <td>{t.name ?? '—'}</td>
                    <td>{t.description ?? '—'}</td>
                    <td>{formatCost(t.cost)}</td>
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
