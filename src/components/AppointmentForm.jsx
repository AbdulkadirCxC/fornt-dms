import { useState, useEffect } from 'react';
import { patientsApi, dentistsApi } from '../api/services';
import './AppointmentForm.css';

const initialValues = {
  patient: '',
  dentist: '',
  date: '',
  time: '',
  status: 'scheduled',
  notes: '',
};

export default function AppointmentForm({ onSubmit, onCancel, initialData = null, disabled = false }) {
  const [formData, setFormData] = useState(initialData ?? initialValues);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [patientsRes, dentistsRes] = await Promise.all([
          patientsApi.getAll({ limit: 100 }),
          dentistsApi.getAll({ limit: 100 }),
        ]);
        const patientsData = patientsRes.data;
        const dentistsData = dentistsRes.data;
        const patientsList = Array.isArray(patientsData)
          ? patientsData
          : patientsData?.results ?? patientsData?.data ?? patientsData?.patients ?? [];
        const dentistsList = Array.isArray(dentistsData)
          ? dentistsData
          : dentistsData?.results ?? dentistsData?.data ?? dentistsData?.dentists ?? [];
        setPatients(Array.isArray(patientsList) ? patientsList : []);
        setDentists(Array.isArray(dentistsList) ? dentistsList : []);
      } catch {
        setPatients([]);
        setDentists([]);
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      patient: formData.patient ? Number(formData.patient) : null,
      dentist: formData.dentist ? Number(formData.dentist) : null,
      date: formData.date || null,
      time: formData.time || null,
      status: formData.status || 'scheduled',
      notes: formData.notes?.trim() || null,
    };

    if (!payload.date) {
      setError('Date is required');
      return;
    }

    if (!payload.patient) {
      setError('Patient is required');
      return;
    }

    onSubmit(payload);
  };

  if (loading) {
    return <div className="appointment-form-loading">Loading patients and dentists...</div>;
  }

  return (
    <form className="appointment-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Appointment' : 'Add Appointment'}</h3>

      {error && <div className="appointment-form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="patient">Patient *</label>
        <select
          id="patient"
          name="patient"
          value={formData.patient}
          onChange={handleChange}
          required
        >
          <option value="">Select patient</option>
          {patients.map((p) => (
            <option key={p.id ?? p.patientId} value={p.id ?? p.patientId}>
              {(p.full_name ?? p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()) || `Patient #${p.id ?? p.patientId}`}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="dentist">Dentist</label>
        <select
          id="dentist"
          name="dentist"
          value={formData.dentist}
          onChange={handleChange}
        >
          <option value="">Select dentist</option>
          {dentists.map((d) => (
            <option key={d.id ?? d.dentistId} value={d.id ?? d.dentistId}>
              {d.name ?? `Dentist #${d.id ?? d.dentistId}`}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date ?? ''}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="time">Time</label>
          <input
            type="time"
            id="time"
            name="time"
            value={formData.time ?? ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          name="status"
          value={formData.status ?? 'scheduled'}
          onChange={handleChange}
        >
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes ?? ''}
          onChange={handleChange}
          placeholder="Appointment notes"
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          {initialData ? 'Update' : 'Add'} Appointment
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
