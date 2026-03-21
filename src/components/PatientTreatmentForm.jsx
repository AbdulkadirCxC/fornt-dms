import { useState, useEffect } from 'react';
import { patientsApi, treatmentsApi, dentistsApi } from '../api/services';
import './PatientTreatmentForm.css';

const initialValues = {
  patient: '',
  treatment: '',
  dentist: '',
  date: '',
  cost_override: '',
};

function getPatientLabel(p) {
  const name = p.full_name ?? p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return name || `Patient #${p.id ?? p.patientId}`;
}

export default function PatientTreatmentForm({ onSubmit, onCancel, initialData = null, disabled = false }) {
  const [formData, setFormData] = useState(initialData ?? initialValues);
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [patientsRes, treatmentsRes, dentistsRes] = await Promise.all([
          patientsApi.getAll({ limit: 100 }),
          treatmentsApi.getAll({ limit: 100 }),
          dentistsApi.getAll({ limit: 100 }),
        ]);
        const pl = Array.isArray(patientsRes.data)
          ? patientsRes.data
          : patientsRes.data?.results ?? patientsRes.data?.data ?? patientsRes.data?.patients ?? [];
        const tl = Array.isArray(treatmentsRes.data)
          ? treatmentsRes.data
          : treatmentsRes.data?.results ?? treatmentsRes.data?.data ?? treatmentsRes.data?.treatments ?? [];
        const dl = Array.isArray(dentistsRes.data)
          ? dentistsRes.data
          : dentistsRes.data?.results ?? dentistsRes.data?.data ?? dentistsRes.data?.dentists ?? [];
        setPatients(Array.isArray(pl) ? pl : []);
        setTreatments(Array.isArray(tl) ? tl : []);
        setDentists(Array.isArray(dl) ? dl : []);
      } catch {
        setPatients([]);
        setTreatments([]);
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

    const costVal = formData.cost_override?.trim();
    const payload = {
      patient: formData.patient ? Number(formData.patient) : null,
      treatment: formData.treatment ? Number(formData.treatment) : null,
      dentist: formData.dentist ? Number(formData.dentist) : null,
      date: formData.date || null,
      cost_override: costVal ? parseFloat(costVal) : null,
    };

    if (!payload.patient) {
      setError('Patient is required');
      return;
    }

    if (!payload.treatment) {
      setError('Treatment is required');
      return;
    }

    if (payload.cost_override != null && (isNaN(payload.cost_override) || payload.cost_override < 0)) {
      setError('Cost override must be a valid positive number');
      return;
    }

    onSubmit(payload);
  };

  if (loading) {
    return <div className="patient-treatment-form-loading">Loading options...</div>;
  }

  return (
    <form className="patient-treatment-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Patient Treatment' : 'Add Patient Treatment'}</h3>

      {error && <div className="patient-treatment-form-error">{error}</div>}

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
              {getPatientLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="treatment">Treatment *</label>
        <select
          id="treatment"
          name="treatment"
          value={formData.treatment}
          onChange={handleChange}
          required
        >
          <option value="">Select treatment</option>
          {treatments.map((t) => (
            <option key={t.id ?? t.treatmentId} value={t.id ?? t.treatmentId}>
              {t.name ?? `Treatment #${t.id ?? t.treatmentId}`}
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
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="cost_override">Cost Override</label>
          <input
            type="number"
            id="cost_override"
            name="cost_override"
            min="0"
            step="0.01"
            value={formData.cost_override ?? ''}
            onChange={handleChange}
            placeholder="Override treatment cost"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          {initialData ? 'Update' : 'Add'} Patient Treatment
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
