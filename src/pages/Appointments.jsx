import { useState, useEffect } from 'react';
import { appointmentsApi } from '../api/services';
import AppointmentForm from '../components/AppointmentForm';
import './Appointments.css';

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await appointmentsApi.getAll({ limit: 50 });
      const data = res.data;
      const list = Array.isArray(data)
        ? data
        : data?.results ?? data?.data ?? data?.appointments ?? data?.items ?? [];
      setAppointments(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load appointments. Is the API running?');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleFormSubmit = async (payload) => {
    setSubmitting(true);
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
      const res = await appointmentsApi.create(apiPayload);
      setShowForm(false);
      const created = res?.data;
      if (created && (created.id != null || created.appointment_id != null)) {
        setAppointments((prev) => [created, ...prev]);
      }
      await fetchAppointments(true);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to add appointment.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString();
  };

  const formatTime = (t) => {
    if (!t) return '';
    return typeof t === 'string' ? t : String(t);
  };

  const getPatientName = (apt) =>
    apt.patient_name ??
    apt.patientName ??
    (apt.patient && (apt.patient.full_name ?? apt.patient.name ?? [apt.patient.first_name, apt.patient.last_name].filter(Boolean).join(' '))) ??
    '—';

  const getDentistName = (apt) =>
    apt.dentist_name ??
    apt.dentistName ??
    (apt.dentist && (apt.dentist.name ?? apt.dentist.full_name)) ??
    '—';

  return (
    <div className="appointments-page">
      <div className="page-header">
        <h1>Appointments</h1>
        <div className="page-header-actions">
          <button className="btn-add" onClick={() => setShowForm(true)}>
            Add Appointment
          </button>
          <button className="refresh-btn" onClick={() => fetchAppointments()} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {showForm && (
        <div className="appointment-form-modal">
          <AppointmentForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            disabled={submitting}
          />
        </div>
      )}

      {loading ? (
        <p>Loading appointments...</p>
      ) : (
        <div className="appointments-table-wrap">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Patient</th>
                <th>Dentist</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length === 0 ? (
                <tr>
                  <td colSpan={7}>No appointments found. Add an appointment using the form above.</td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr key={apt.id ?? apt.appointmentId}>
                    <td>{apt.id ?? apt.appointmentId ?? '—'}</td>
                    <td>{getPatientName(apt)}</td>
                    <td>{getDentistName(apt)}</td>
                    <td>{formatDate(apt.date ?? apt.appointment_date)}</td>
                    <td>{formatTime(apt.time ?? apt.appointment_time ?? apt.start_time) || '—'}</td>
                    <td>
                      <span className={`status-badge ${(apt.status ?? '').toLowerCase()}`}>
                        {apt.status ?? 'Scheduled'}
                      </span>
                    </td>
                    <td>{apt.notes ?? '—'}</td>
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
