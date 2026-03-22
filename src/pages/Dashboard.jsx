import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, appointmentsApi } from '../api/services';
import './Dashboard.css';

function formatDate(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString();
}

function formatTime(t) {
  if (!t) return '';
  return typeof t === 'string' ? t : String(t);
}

function getPatientName(apt) {
  return (
    apt.patient_name ??
    apt.patientName ??
    (apt.patient && typeof apt.patient === 'object'
      ? apt.patient.full_name ??
        apt.patient.name ??
        [apt.patient.first_name, apt.patient.last_name].filter(Boolean).join(' ')
      : null) ??
    '—'
  );
}

function getDentistName(apt) {
  return (
    apt.dentist_name ??
    apt.dentistName ??
    (apt.dentist && typeof apt.dentist === 'object'
      ? apt.dentist.name ?? apt.dentist.full_name
      : null) ??
    '—'
  );
}

function statusCanMarkComplete(status) {
  const s = (status ?? '').toLowerCase();
  return s !== 'completed' && s !== 'cancelled';
}

function formatCurrency(val) {
  if (val == null || val === '') return '0.00';
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

export default function Dashboard() {
  const [data, setData] = useState({
    users: 0,
    patients: 0,
    appointments: 0,
    invoices: 0,
    daily_revenue: 0,
    monthly_revenue: 0,
    recent_appointments: [],
    loading: true,
  });
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setError(null);
    try {
      const res = await dashboardApi.getData();
      const d = res.data;
      setData({
        users: d.users ?? 0,
        patients: d.patients ?? 0,
        appointments: d.appointments ?? 0,
        invoices: d.invoices ?? 0,
        daily_revenue: d.daily_revenue ?? 0,
        monthly_revenue: d.monthly_revenue ?? 0,
        recent_appointments: Array.isArray(d.recent_appointments) ? d.recent_appointments : [],
        loading: false,
      });
    } catch {
      setError('Unable to load dashboard. Ensure your backend is running.');
      setData((prev) => ({
        ...prev,
        users: 0,
        patients: 0,
        appointments: 0,
        invoices: 0,
        daily_revenue: 0,
        monthly_revenue: 0,
        recent_appointments: [],
        loading: false,
      }));
    }
  }, []);

  useEffect(() => {
    setData((prev) => ({ ...prev, loading: true }));
    fetchDashboard();
  }, [fetchDashboard]);

  const handleMarkComplete = async (appointmentId) => {
    if (appointmentId == null) return;
    setActionError(null);
    setUpdatingId(appointmentId);
    try {
      await appointmentsApi.updateStatus(appointmentId, { status: 'completed' });
      await fetchDashboard();
    } catch (err) {
      const msg =
        err.response?.data?.detail ??
        err.response?.data?.message ??
        err.response?.data?.error ??
        'Could not update appointment status.';
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p className="dashboard-subtitle">Dental Management System Overview</p>

      {error && (
        <div className="dashboard-error">
          {error}
          <small>Configure VITE_API_BASE_URL in .env to point to your backend.</small>
        </div>
      )}

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-icon">👤</span>
          <div>
            <div className="stat-value">{data.loading ? '...' : data.users}</div>
            <div className="stat-label">Users</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div>
            <div className="stat-value">{data.loading ? '...' : data.patients}</div>
            <div className="stat-label">Patients</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div>
            <div className="stat-value">{data.loading ? '...' : data.appointments}</div>
            <div className="stat-label">Appointments</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">🧾</span>
          <div>
            <div className="stat-value">{data.loading ? '...' : data.invoices}</div>
            <div className="stat-label">Invoices</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div>
            <div className="stat-value">{data.loading ? '...' : `$${formatCurrency(data.daily_revenue)}`}</div>
            <div className="stat-label">Daily Revenue</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div>
            <div className="stat-value">{data.loading ? '...' : `$${formatCurrency(data.monthly_revenue)}`}</div>
            <div className="stat-label">Monthly Revenue</div>
          </div>
        </div>
      </div>

      <section className="recent-section">
        <h2>Recent Appointments</h2>
        {actionError && <div className="dashboard-action-error">{actionError}</div>}
        {data.loading ? (
          <p>Loading...</p>
        ) : data.recent_appointments.length === 0 ? (
          <p className="empty-state">No appointments yet. Create one from the Appointments page.</p>
        ) : (
          <div className="recent-table-wrap">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_appointments.map((apt) => {
                  const id = apt.id ?? apt.appointmentId;
                  const status = apt.status ?? '';
                  const busy = updatingId === id;
                  const showComplete = statusCanMarkComplete(status);
                  return (
                    <tr key={id ?? `${getPatientName(apt)}-${apt.date}`}>
                      <td>{getPatientName(apt)}</td>
                      <td>{formatDate(apt.date ?? apt.appointment_date)}</td>
                      <td>{formatTime(apt.time ?? apt.appointment_time ?? apt.start_time) || '—'}</td>
                      <td>{getDentistName(apt)}</td>
                      <td>
                        <span className={`recent-status-badge ${(status || 'scheduled').toLowerCase()}`}>
                          {status || '—'}
                        </span>
                      </td>
                      <td>
                        {showComplete ? (
                          <button
                            type="button"
                            className="btn-mark-complete"
                            disabled={busy}
                            onClick={() => handleMarkComplete(id)}
                          >
                            {busy ? 'Updating…' : 'Mark complete'}
                          </button>
                        ) : (
                          <span className="recent-action-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
