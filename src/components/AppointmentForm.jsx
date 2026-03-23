import { useState, useEffect, useMemo } from 'react';
import { patientsApi, dentistsApi } from '../api/services';
import SearchableSelect from './SearchableSelect';
import PatientForm from './PatientForm';
import DentistForm from './DentistForm';
import './AppointmentForm.css';

function patientLabel(p) {
  return (
    (p.full_name ?? p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()) ||
    `Patient #${p.id ?? p.patientId}`
  );
}

/** Newest / highest patient id first (matches last insert at top when ids auto-increment). */
function sortPatientsByIdDesc(list) {
  return [...list].sort((a, b) => {
    const idA = Number(a.id ?? a.patientId ?? 0);
    const idB = Number(b.id ?? b.patientId ?? 0);
    return idB - idA;
  });
}

const initialValues = {
  patient: '',
  dentist: '',
  date: '',
  time: '',
  status: 'scheduled',
  notes: '',
};

export default function AppointmentForm({
  onSubmit,
  onCancel,
  initialData = null,
  disabled = false,
  lockedPatientId = null,
  lockedPatientName = null,
}) {
  const [formData, setFormData] = useState(() => {
    const base = { ...initialValues, ...initialData };
    if (lockedPatientId != null) {
      base.patient = String(lockedPatientId);
    }
    return base;
  });
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [quickPatientOpen, setQuickPatientOpen] = useState(false);
  const [quickDentistOpen, setQuickDentistOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickCreateError, setQuickCreateError] = useState('');

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const patientsPromise =
          lockedPatientId != null
            ? Promise.resolve({ data: [] })
            : patientsApi.getAll({ limit: 100, ordering: '-id' });
        const [patientsRes, dentistsRes] = await Promise.all([
          patientsPromise,
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
        const rawPatients = Array.isArray(patientsList) ? patientsList : [];
        setPatients(sortPatientsByIdDesc(rawPatients));
        setDentists(Array.isArray(dentistsList) ? dentistsList : []);
      } catch {
        setPatients([]);
        setDentists([]);
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, [lockedPatientId]);

  const patientOptions = useMemo(
    () =>
      patients.map((p) => ({
        value: p.id ?? p.patientId,
        label: patientLabel(p),
      })),
    [patients]
  );

  const dentistOptions = useMemo(
    () =>
      dentists.map((d) => ({
        value: d.id ?? d.dentistId,
        label: d.name ?? `Dentist #${d.id ?? d.dentistId}`,
      })),
    [dentists]
  );

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

  const handleQuickCreatePatient = async (payload) => {
    setQuickCreateError('');
    setQuickSaving(true);
    try {
      const res = await patientsApi.create(payload);
      const created = res?.data ?? {};
      const createdId = created.id ?? created.patientId ?? created.patient_id;
      if (createdId == null) throw new Error('No patient ID in response');
      setPatients((prev) => sortPatientsByIdDesc([created, ...prev]));
      setFormData((prev) => ({ ...prev, patient: String(createdId) }));
      setQuickPatientOpen(false);
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        err.response?.data?.message ??
        'Failed to create patient.';
      setQuickCreateError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setQuickSaving(false);
    }
  };

  const handleQuickCreateDentist = async (payload) => {
    setQuickCreateError('');
    setQuickSaving(true);
    try {
      const res = await dentistsApi.create(payload);
      const created = res?.data ?? {};
      const createdId = created.id ?? created.dentistId ?? created.dentist_id;
      if (createdId == null) throw new Error('No dentist ID in response');
      setDentists((prev) => [created, ...prev]);
      setFormData((prev) => ({ ...prev, dentist: String(createdId) }));
      setQuickDentistOpen(false);
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        err.response?.data?.message ??
        'Failed to create dentist.';
      setQuickCreateError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setQuickSaving(false);
    }
  };

  if (loading) {
    return <div className="appointment-form-loading">Loading patients and dentists...</div>;
  }

  return (
    <>
      <form className="appointment-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Appointment' : 'Add Appointment'}</h3>

      {error && <div className="appointment-form-error">{error}</div>}

      <div className="form-grid-row form-grid-row--2">
        <div className="form-group">
          <label htmlFor="patient">Patient *</label>
          {lockedPatientId != null ? (
            <div className="appointment-form-patient-locked" id="patient">
              {lockedPatientName?.trim() ||
                `Patient #${lockedPatientId}`}
            </div>
          ) : (
            <SearchableSelect
              id="patient"
              name="patient"
              value={formData.patient}
              onChange={handleChange}
              options={patientOptions}
              dropdownActions={[
                {
                  label: '+ Quick create patient',
                  onClick: () => {
                    setQuickCreateError('');
                    setQuickPatientOpen(true);
                  },
                },
              ]}
              required
              disabled={disabled}
              emptyOptionLabel="Select patient"
              searchPlaceholder="Search patients…"
            />
          )}
        </div>

        <div className="form-group">
          <label htmlFor="dentist">Dentist</label>
          <SearchableSelect
            id="dentist"
            name="dentist"
            value={formData.dentist}
            onChange={handleChange}
            options={dentistOptions}
            dropdownActions={[
              {
                label: '+ Quick create dentist',
                onClick: () => {
                  setQuickCreateError('');
                  setQuickDentistOpen(true);
                },
              },
            ]}
            disabled={disabled}
            emptyOptionLabel="Select dentist"
            searchPlaceholder="Search dentists…"
          />
        </div>
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

      <div className="form-grid-row form-grid-row--2 form-grid-row--status-notes">
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

      {quickPatientOpen && (
        <div className="quick-create-modal-root" role="dialog" aria-modal="true" aria-labelledby="quick-create-patient-title">
          <div className="quick-create-modal-backdrop" onClick={() => !quickSaving && setQuickPatientOpen(false)} />
          <div className="quick-create-modal-panel">
            <div className="quick-create-modal-header">
              <h4 id="quick-create-patient-title">Quick Create Patient</h4>
              <button
                type="button"
                className="quick-create-modal-close"
                disabled={quickSaving}
                onClick={() => setQuickPatientOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {quickCreateError && <div className="quick-create-error">{quickCreateError}</div>}
            <PatientForm
              onSubmit={handleQuickCreatePatient}
              onCancel={() => setQuickPatientOpen(false)}
              disabled={disabled || quickSaving}
            />
          </div>
        </div>
      )}

      {quickDentistOpen && (
        <div className="quick-create-modal-root" role="dialog" aria-modal="true" aria-labelledby="quick-create-dentist-title">
          <div className="quick-create-modal-backdrop" onClick={() => !quickSaving && setQuickDentistOpen(false)} />
          <div className="quick-create-modal-panel">
            <div className="quick-create-modal-header">
              <h4 id="quick-create-dentist-title">Quick Create Dentist</h4>
              <button
                type="button"
                className="quick-create-modal-close"
                disabled={quickSaving}
                onClick={() => setQuickDentistOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {quickCreateError && <div className="quick-create-error">{quickCreateError}</div>}
            <DentistForm
              onSubmit={handleQuickCreateDentist}
              onCancel={() => setQuickDentistOpen(false)}
              disabled={disabled || quickSaving}
            />
          </div>
        </div>
      )}
    </>
  );
}
