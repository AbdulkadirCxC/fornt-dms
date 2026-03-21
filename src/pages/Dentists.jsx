import { useState, useEffect } from 'react';
import { dentistsApi } from '../api/services';
import DentistForm from '../components/DentistForm';
import './Dentists.css';

export default function Dentists() {
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDentists = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const params = search ? { search, limit: 50 } : { limit: 50 };
      const res = await dentistsApi.getAll(params);
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.dentists ?? data?.items ?? [];
      setDentists(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load dentists. Is the API running?');
      setDentists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDentists();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDentists();
  };

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await dentistsApi.create(payload);
      setShowForm(false);
      const created = res?.data;
      if (created && (created.id != null || created.dentist_id != null)) {
        setDentists((prev) => [created, ...prev]);
      }
      await fetchDentists(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add dentist.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dentists-page">
      <div className="page-header">
        <h1>Dentists</h1>
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
            Add Dentist
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {showForm && (
        <div className="dentist-form-modal">
          <DentistForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            disabled={submitting}
          />
        </div>
      )}

      {loading ? (
        <p>Loading dentists...</p>
      ) : (
        <div className="dentists-table-wrap">
          <table className="dentists-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Specialization</th>
              </tr>
            </thead>
            <tbody>
              {dentists.length === 0 ? (
                <tr>
                  <td colSpan={3}>No dentists found. Add a dentist using the form above.</td>
                </tr>
              ) : (
                dentists.map((d) => (
                  <tr key={d.id ?? d.dentistId}>
                    <td>{d.id ?? d.dentistId ?? '—'}</td>
                    <td>{d.name ?? '—'}</td>
                    <td>{d.specialization ?? '—'}</td>
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
