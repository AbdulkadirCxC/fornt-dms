import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

const TEAL = '#0d9488';
const TEAL_LIGHT = '#14b8a6';
const GRID = '#f1f5f9';
const AXIS = '#64748b';

const PIE_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#0ea5e9', '#f97316', '#a855f7', '#94a3b8'];

function formatStatusLabel(raw) {
  const s = String(raw ?? 'unknown').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sliceDate(d) {
  if (d == null || d === '') return '';
  const s = typeof d === 'string' ? d : String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** @param {object[]} appointments */
function appointmentsByDate(appointments) {
  const map = {};
  (appointments ?? []).forEach((a) => {
    const d = sliceDate(a.date ?? a.appointment_date);
    if (!d) return;
    map[d] = (map[d] || 0) + 1;
  });
  return Object.entries(map)
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([date, count]) => ({ date, count }));
}

/** @param {object[]} appointments */
function appointmentsByStatus(appointments) {
  const map = {};
  (appointments ?? []).forEach((a) => {
    const key = (a.status ?? a.appointment_status ?? 'unknown').toString().toLowerCase() || 'unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map).map(([status, value]) => ({
    name: formatStatusLabel(status),
    value,
  }));
}

const currencyFmt = (v) =>
  typeof v === 'number'
    ? `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : String(v);

export default function DashboardCharts({
  loading,
  users,
  patients,
  appointments,
  invoices,
  dailyRevenue,
  monthlyRevenue,
  recentAppointments,
}) {
  const metricsData = useMemo(
    () => [
      { name: 'Users', value: Number(users) || 0 },
      { name: 'Patients', value: Number(patients) || 0 },
      { name: 'Appts', value: Number(appointments) || 0 },
      { name: 'Invoices', value: Number(invoices) || 0 },
    ],
    [users, patients, appointments, invoices]
  );

  const revenueData = useMemo(
    () => [
      { name: 'Daily', amount: Number(dailyRevenue) || 0 },
      { name: 'Monthly', amount: Number(monthlyRevenue) || 0 },
    ],
    [dailyRevenue, monthlyRevenue]
  );

  const statusData = useMemo(() => appointmentsByStatus(recentAppointments), [recentAppointments]);

  const timelineData = useMemo(() => appointmentsByDate(recentAppointments), [recentAppointments]);

  if (loading) {
    return (
      <section className="dashboard-charts" aria-busy="true">
        <h2 className="dashboard-charts-title">Insights</h2>
        <p className="dashboard-charts-loading">Loading charts…</p>
      </section>
    );
  }

  return (
    <section className="dashboard-charts" aria-label="Dashboard charts">
      <h2 className="dashboard-charts-title">Insights</h2>
      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-card">
          <h3>Practice overview</h3>
          <div className="dashboard-chart-inner">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={metricsData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  cursor={{ fill: 'rgba(13, 148, 136, 0.06)' }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="value" fill={TEAL} name="Count" radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-chart-card">
          <h3>Revenue</h3>
          <div className="dashboard-chart-inner">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(v) => `$${Number(v).toLocaleString()}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(13, 148, 136, 0.06)' }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(value) => [currencyFmt(value), 'Amount']}
                />
                <Bar dataKey="amount" fill={TEAL_LIGHT} name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={72} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-chart-card">
          <h3>Recent appointments by status</h3>
          <div className="dashboard-chart-inner dashboard-chart-inner--pie">
            {statusData.length === 0 ? (
              <p className="dashboard-chart-empty">No recent appointments to chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(255,255,255,0.9)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dashboard-chart-card">
          <h3>Recent activity by date</h3>
          <div className="dashboard-chart-inner">
            {timelineData.length === 0 ? (
              <p className="dashboard-chart-empty">No dated appointments in the recent list.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timelineData} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="date" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis allowDecimals={false} tick={{ fill: AXIS, fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Line type="monotone" dataKey="count" name="Appointments" stroke={TEAL} strokeWidth={2} dot={{ r: 4, fill: TEAL }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
