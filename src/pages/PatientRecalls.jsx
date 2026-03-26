import { useEffect, useMemo, useState } from 'react';
import { dentistsApi, patientRecallsApi, patientsApi, treatmentsApi } from '../api/services';
import SearchableSelect from '../components/SearchableSelect';
import './PatientRecalls.css';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'completed', label: 'Completed' },
];

const RECALL_TYPE_OPTIONS = [
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'checkup', label: 'Checkup' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'other', label: 'Other' },
];

const INITIAL_FORM = {
  patient: '',
  treatment: '',
  dentist: '',
  recall_type: 'cleaning',
  day_of_month: '',
  interval_months: '',
  start_date: '',
  status: 'active',
};

function normalizeList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of ['results', 'data', 'items', ...keys]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function toOption(value, label) {
  return { value: String(value), label };
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

export default function PatientRecalls() {
  const [recalls, setRecalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [patientOptions, setPatientOptions] = useState([]);
  const [treatmentOptions, setTreatmentOptions] = useState([]);
  const [dentistOptions, setDentistOptions] = useState([]);

  const isEditing = editingId != null;

  const recallTypeOptions = useMemo(() => RECALL_TYPE_OPTIONS, []);
  const statusOptions = useMemo(() => STATUS_OPTIONS, []);

  const fetchRecalls = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await patientRecallsApi.getAll({ ordering: '-id', limit: 200 });
      setRecalls(normalizeList(res.data, ['patient_recalls', 'recalls']));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load patient recalls.');
      setRecalls([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectData = async () => {
    try {
      const [patientsRes, treatmentsRes, dentistsRes] = await Promise.all([
        patientsApi.getAll({ limit: 500, ordering: '-id' }),
        treatmentsApi.getAll({ limit: 500, ordering: '-id' }),
        dentistsApi.getAll({ limit: 500, ordering: '-id' }),
      ]);
      const patients = normalizeList(patientsRes.data, ['patients']);
      const treatments = normalizeList(treatmentsRes.data, ['treatments']);
      const dentists = normalizeList(dentistsRes.data, ['dentists']);

      setPatientOptions(
        patients
          .map((p) => toOption(p.id ?? p.patient_id, p.full_name ?? p.name ?? `#${p.id}`))
          .filter((o) => o.value && o.label)
      );
      setTreatmentOptions(
        treatments
          .map((t) => toOption(t.id ?? t.treatment_id, t.name ?? `#${t.id}`))
          .filter((o) => o.value && o.label)
      );
      setDentistOptions(
        dentists
          .map((d) => toOption(d.id ?? d.dentist_id, d.name ?? d.full_name ?? `#${d.id}`))
          .filter((o) => o.value && o.label)
      );
    } catch {
      setPatientOptions([]);
      setTreatmentOptions([]);
      setDentistOptions([]);
    }
  };

  useEffect(() => {
    fetchRecalls();
    fetchSelectData();
  }, []);

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.patient || !formData.treatment || !formData.dentist || !formData.start_date) {
      setError('Patient, treatment, dentist, and start date are required.');
      return;
    }
    const dayOfMonth = Number(formData.day_of_month);
    const intervalMonths = Number(formData.interval_months);
    if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
      setError('Day of month must be between 1 and 31.');
      return;
    }
    if (!intervalMonths || intervalMonths < 1) {
      setError('Interval months must be at least 1.');
      return;
    }

    const payload = {
      patient: Number(formData.patient),
      treatment: Number(formData.treatment),
      dentist: Number(formData.dentist),
      recall_type: formData.recall_type,
      day_of_month: dayOfMonth,
      interval_months: intervalMonths,
      start_date: formData.start_date,
      status: formData.status,
    };

    setSaving(true);
    try {
      if (isEditing) {
        await patientRecallsApi.update(editingId, payload);
      } else {
        await patientRecallsApi.create(payload);
      }
      resetForm();
      await fetchRecalls(true);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to save recall.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    const id = row.id ?? row.recall_id ?? row.pk;
    if (!id) return;
    setEditingId(Number(id));
    setShowForm(true);
    setFormData({
      patient: String(row.patient ?? row.patient_id ?? row.patient_obj?.id ?? ''),
      treatment: String(row.treatment ?? row.treatment_id ?? row.treatment_obj?.id ?? ''),
      dentist: String(row.dentist ?? row.dentist_id ?? row.dentist_obj?.id ?? ''),
      recall_type: row.recall_type ?? 'cleaning',
      day_of_month: String(row.day_of_month ?? ''),
      interval_months: String(row.interval_months ?? ''),
      start_date: (row.start_date ?? '').slice(0, 10),
      status: row.status ?? 'active',
    });
  };

  const handleDelete = async (row) => {
    const id = row.id ?? row.recall_id ?? row.pk;
    if (!id) return;
    if (!window.confirm('Delete this recall?')) return;
    setError('');
    try {
      await patientRecallsApi.delete(id);
      await fetchRecalls(true);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to delete recall.');
    }
  };

  const labelFromOptions = (options, value) => options.find((o) => String(o.value) === String(value))?.label ?? '—';

  return (
    <div className="patient-recalls-page">
      <div className="page-header">
        <h1>Patient Recalls</h1>
        <button type="button" className="btn-add" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? 'Close' : 'Add Recall'}
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      {showForm && (
        <div className="recall-form-wrap">
          <form className="recall-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Patient</label>
                <SearchableSelect
                  name="patient"
                  value={formData.patient}
                  onChange={handleChange}
                  options={patientOptions}
                  emptyOptionLabel="Select patient"
                  searchPlaceholder="Search patient..."
                />
              </div>
              <div className="form-group">
                <label>Treatment</label>
                <SearchableSelect
                  name="treatment"
                  value={formData.treatment}
                  onChange={handleChange}
                  options={treatmentOptions}
                  emptyOptionLabel="Select treatment"
                  searchPlaceholder="Search treatment..."
                />
              </div>
              <div className="form-group">
                <label>Dentist</label>
                <SearchableSelect
                  name="dentist"
                  value={formData.dentist}
                  onChange={handleChange}
                  options={dentistOptions}
                  emptyOptionLabel="Select dentist"
                  searchPlaceholder="Search dentist..."
                />
              </div>
              <div className="form-group">
                <label>Recall Type</label>
                <SearchableSelect
                  name="recall_type"
                  value={formData.recall_type}
                  onChange={handleChange}
                  options={recallTypeOptions}
                  showEmptyOption={false}
                  searchPlaceholder="Search type..."
                />
              </div>
              <div className="form-group">
                <label>Day Of Month</label>
                <input name="day_of_month" type="number" min="1" max="31" value={formData.day_of_month} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Interval Months</label>
                <input name="interval_months" type="number" min="1" value={formData.interval_months} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input name="start_date" type="date" value={formData.start_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <SearchableSelect
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  options={statusOptions}
                  showEmptyOption={false}
                  searchPlaceholder="Search status..."
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Update Recall' : 'Create Recall'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading recalls...</p>
      ) : (
        <div className="recalls-table-wrap">
          <table className="recalls-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Treatment</th>
                <th>Dentist</th>
                <th>Type</th>
                <th>Day</th>
                <th>Interval</th>
                <th>Start</th>
                <th>Next Visit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recalls.length === 0 ? (
                <tr>
                  <td colSpan={11}>No recalls found.</td>
                </tr>
              ) : (
                recalls.map((r) => {
                  const id = r.id ?? r.recall_id ?? r.pk;
                  return (
                    <tr key={id ?? `${r.patient}-${r.start_date}`}>
                      <td>{id ?? '—'}</td>
                      <td>{r.patient_name ?? labelFromOptions(patientOptions, r.patient ?? r.patient_id)}</td>
                      <td>{r.treatment_name ?? labelFromOptions(treatmentOptions, r.treatment ?? r.treatment_id)}</td>
                      <td>{r.dentist_name ?? labelFromOptions(dentistOptions, r.dentist ?? r.dentist_id)}</td>
                      <td>{r.recall_type ?? '—'}</td>
                      <td>{r.day_of_month ?? '—'}</td>
                      <td>{r.interval_months ?? '—'}</td>
                      <td>{formatDate(r.start_date)}</td>
                      <td>{formatDate(r.next_visit)}</td>
                      <td>{r.status ?? '—'}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn-edit" onClick={() => handleEdit(r)}>
                            Edit
                          </button>
                          <button type="button" className="btn-delete" onClick={() => handleDelete(r)}>
                            Delete
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

