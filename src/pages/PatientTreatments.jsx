import { useState, useEffect } from 'react';
import { patientTreatmentsApi } from '../api/services';
import PatientTreatmentForm from '../components/PatientTreatmentForm';
import './PatientTreatments.css';

export default function PatientTreatments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    try {
      const res = await patientTreatmentsApi.create(payload);
      setShowForm(false);
      const created = res?.data;
      if (created && (created.id != null || created.patient_treatment_id != null)) {
        setItems((prev) => [created, ...prev]);
      }
      await fetchItems(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add patient treatment.');
    } finally {
      setSubmitting(false);
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
          <button className="btn-add" onClick={() => setShowForm(true)}>
            Add Patient Treatment
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

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
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6}>No patient treatments found. Add one using the form above.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id ?? item.patient_treatment_id}>
                    <td>{item.id ?? item.patient_treatment_id ?? '—'}</td>
                    <td>{getLabel(item, 'patient')}</td>
                    <td>{getLabel(item, 'treatment')}</td>
                    <td>{getLabel(item, 'dentist')}</td>
                    <td>{formatDate(item.date ?? item.treatment_date)}</td>
                    <td>{formatCost(item.cost_override)}</td>
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
