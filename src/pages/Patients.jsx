import { useState, useEffect } from 'react';
import { patientsApi } from '../api/services';
import PatientForm from '../components/PatientForm';
import './Patients.css';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = search ? { search, limit: 50 } : { limit: 50 };
      const res = await patientsApi.getAll(params);
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.patients ?? data?.items ?? [];
      setPatients(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load patients. Is the API running?');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPatients();
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await patientsApi.create(payload);
      setShowForm(false);
      const created = res?.data;
      if (created && (created.id != null || created.patient_id != null)) {
        setPatients((prev) => [created, ...prev]);
      }
      await fetchPatients(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add patient.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="patients-page">
      <div className="page-header">
        <h1>Patients</h1>
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
          <button
            className="btn-add"
            onClick={() => setShowForm(true)}
          >
            Add Patient
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {showForm && (
        <div className="patient-form-modal">
          <PatientForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            disabled={submitting}
          />
        </div>
      )}

      {loading ? (
        <p>Loading patients...</p>
      ) : (
        <div className="patients-table-wrap">
          <table className="patients-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={5}>No patients found. Add a patient using the form above.</td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id ?? p.patientId}>
                    <td>{p.id ?? p.patientId ?? '—'}</td>
                    <td>{p.full_name ?? '—'}</td>
                    <td>{p.gender ?? '—'}</td>
                    <td>{p.date_of_birth ?? '—'}</td>
                    <td>{p.phone ?? '—'}</td>
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
