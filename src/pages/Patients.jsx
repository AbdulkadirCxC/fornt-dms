import { useState, useEffect } from 'react';
import { patientsApi, appointmentsApi } from '../api/services';
import PatientForm from '../components/PatientForm';
import AppointmentForm from '../components/AppointmentForm';
import './Patients.css';

function sortPatientsDesc(list) {
  return [...list].sort((a, b) => {
    const idA = Number(a.id ?? a.patientId ?? 0);
    const idB = Number(b.id ?? b.patientId ?? 0);
    return idB - idA;
  });
}

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [appointmentForPatient, setAppointmentForPatient] = useState(null);
  const [submittingAppointment, setSubmittingAppointment] = useState(false);

  const fetchPatients = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const baseParams = { limit: 50, ordering: '-id' };
      const params = search ? { ...baseParams, search } : baseParams;
      const res = await patientsApi.getAll(params);
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.patients ?? data?.items ?? [];
      const raw = Array.isArray(list) ? list : [];
      setPatients(sortPatientsDesc(raw));
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

  const handleUpdatePatient = async (payload) => {
    const patientId = editingPatient?.id ?? editingPatient?.patientId;
    if (!patientId) return;
    setSubmitting(true);
    setError(null);
    try {
      await patientsApi.update(patientId, payload);
      setEditingPatient(null);
      await fetchPatients(true);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to update patient.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePatient = async (patient) => {
    const patientId = patient?.id ?? patient?.patientId;
    if (!patientId) return;
    const ok = window.confirm(`Delete patient "${patient.full_name ?? 'Unknown'}"?`);
    if (!ok) return;
    setDeletingId(patientId);
    setError(null);
    try {
      await patientsApi.delete(patientId);
      if ((editingPatient?.id ?? editingPatient?.patientId) === patientId) {
        setEditingPatient(null);
      }
      await fetchPatients(true);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to delete patient.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAppointmentSubmit = async (payload) => {
    setSubmittingAppointment(true);
    setError(null);
    try {
      const apiPayload = {
        patient: payload.patient,
        dentist: payload.dentist,
        date: payload.date,
        time: payload.time,
        status: payload.status,
        notes: payload.notes,
      };
      await appointmentsApi.create(apiPayload);
      setAppointmentForPatient(null);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to add appointment.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmittingAppointment(false);
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
            onClick={() => {
              setAppointmentForPatient(null);
              setEditingPatient(null);
              setShowForm(true);
            }}
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

      {editingPatient && (
        <div className="patient-form-modal">
          <PatientForm
            initialData={{
              full_name: editingPatient.full_name ?? '',
              gender: editingPatient.gender ?? '',
              date_of_birth: editingPatient.date_of_birth ?? '',
              phone: editingPatient.phone ?? '',
            }}
            onSubmit={handleUpdatePatient}
            onCancel={() => setEditingPatient(null)}
            disabled={submitting}
          />
        </div>
      )}

      {appointmentForPatient && (
        <div className="patient-form-modal">
          <AppointmentForm
            key={appointmentForPatient.id}
            onSubmit={handleAppointmentSubmit}
            onCancel={() => setAppointmentForPatient(null)}
            disabled={submittingAppointment}
            lockedPatientId={appointmentForPatient.id}
            lockedPatientName={appointmentForPatient.full_name}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6}>No patients found. Add a patient using the form above.</td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id ?? p.patientId}>
                    <td>{p.id ?? p.patientId ?? '—'}</td>
                    <td>{p.full_name ?? '—'}</td>
                    <td>{p.gender ?? '—'}</td>
                    <td>{p.date_of_birth ?? '—'}</td>
                    <td>{p.phone ?? '—'}</td>
                    <td>
                      <div className="patient-row-actions">
                        <button
                          type="button"
                          className="btn-patient-appt"
                          onClick={() => {
                            setShowForm(false);
                            setEditingPatient(null);
                            setAppointmentForPatient({
                              id: p.id ?? p.patientId,
                              full_name: p.full_name,
                            });
                          }}
                        >
                          Appointment
                        </button>
                        <button
                          type="button"
                          className="btn-patient-edit"
                          onClick={() => {
                            setShowForm(false);
                            setAppointmentForPatient(null);
                            setEditingPatient(p);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-patient-delete"
                          disabled={deletingId === (p.id ?? p.patientId)}
                          onClick={() => handleDeletePatient(p)}
                        >
                          {deletingId === (p.id ?? p.patientId) ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
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
