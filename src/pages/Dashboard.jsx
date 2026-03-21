import { useState, useEffect } from 'react';
import { dashboardApi } from '../api/services';
import './Dashboard.css';

function formatDate(d) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString();
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

  useEffect(() => {
    const fetchData = async () => {
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
      } catch (err) {
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
    };
    fetchData();
  }, []);

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
        {data.loading ? (
          <p>Loading...</p>
        ) : data.recent_appointments.length === 0 ? (
          <p className="empty-state">No appointments yet. Create one from the Appointments page.</p>
        ) : (
          <ul className="recent-list">
            {data.recent_appointments.map((apt) => (
              <li key={apt.id}>
                <strong>{apt.patient_name ?? apt.patientName ?? 'Patient'}</strong>
                {' — '}
                {formatDate(apt.date)}
                {apt.time && ` at ${apt.time}`}
                {apt.dentist_name && ` • ${apt.dentist_name}`}
                {apt.status && (
                  <span className={`recent-status ${(apt.status ?? '').toLowerCase().replace(/\s/g, '-')}`}>
                    {' '}({apt.status})
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
