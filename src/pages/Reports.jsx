import { useState, useEffect, useMemo } from 'react';
import { reportsApi } from '../api/services';
import SearchableSelect from '../components/SearchableSelect';
import './Reports.css';

const REPORT_TYPES = [
  { id: 'daily-revenue', label: 'Daily Revenue', columns: ['date', 'total_patients', 'total_treatments', 'total_revenue'] },
  { id: 'patient-treatment-history', label: 'Patient Treatment History', columns: ['patient_name', 'treatment', 'dentist', 'date', 'cost'] },
  { id: 'appointments', label: 'Appointment Report', columns: ['date', 'patient_name', 'dentist', 'time', 'status'] },
  { id: 'outstanding-payments', label: 'Outstanding Payments', columns: ['patient_name', 'invoice_id', 'total_amount', 'paid', 'balance'] },
  { id: 'dentist-performance', label: 'Dentist Performance', columns: ['dentist', 'total_patients', 'total_treatments', 'total_revenue'] },
  { id: 'most-common-treatments', label: 'Most Common Treatments', columns: ['treatment', 'times_performed', 'total_revenue'] },
  { id: 'payment-methods', label: 'Payment Methods', columns: ['method', 'transactions', 'total_amount'] },
];

const API_MAP = {
  'daily-revenue': reportsApi.dailyRevenue,
  'patient-treatment-history': reportsApi.patientTreatmentHistory,
  appointments: reportsApi.appointments,
  'outstanding-payments': reportsApi.outstandingPayments,
  'dentist-performance': reportsApi.dentistPerformance,
  'most-common-treatments': reportsApi.mostCommonTreatments,
  'payment-methods': reportsApi.paymentMethods,
};

function formatAmount(val) {
  if (val == null || val === '') return '—';
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? '—' : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function formatDate(val) {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  return d.toLocaleDateString();
}

export default function Reports() {
  const [reportType, setReportType] = useState('daily-revenue');
  const [dateFilter, setDateFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reportTypeOptions = useMemo(
    () => REPORT_TYPES.map((r) => ({ value: r.id, label: r.label })),
    [],
  );

  const currentReport = REPORT_TYPES.find((r) => r.id === reportType);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const api = API_MAP[reportType];
        const params = dateFilter ? { date: dateFilter } : {};
        const res = await api(params);
        const d = res.data;
        const list = Array.isArray(d) ? d : d?.results ?? d?.data ?? d?.items ?? [];
        setData(Array.isArray(list) ? list : []);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Failed to load report.');
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportType, dateFilter]);

  const handleReportChange = (e) => {
    const next = e.target.value;
    if (next) setReportType(next);
    setDateFilter('');
  };

  const getCellValue = (row, col) => {
    let val = row[col];
    if (val != null && val !== '') return val;
    if (col === 'patient_name' && row.patient) {
      const p = row.patient;
      return typeof p === 'object' ? (p.full_name ?? p.name) : p;
    }
    if (col === 'treatment' && row.treatment) {
      const t = row.treatment;
      return typeof t === 'object' ? (t.name ?? t) : t;
    }
    if (col === 'dentist' && row.dentist) {
      const d = row.dentist;
      return typeof d === 'object' ? (d.name ?? d) : d;
    }
    return val;
  };

  const renderCell = (row, col) => {
    const value = getCellValue(row, col);
    if (value == null || value === '') return '—';
    if (col.includes('revenue') || col.includes('amount') || col.includes('cost') || col === 'paid' || col === 'balance') {
      return formatAmount(value);
    }
    if (col === 'date') return formatDate(value);
    return String(value);
  };

  const toLabel = (col) =>
    col
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Reports</h1>
        <div className="page-header-actions">
          <div className="report-selector">
            <label htmlFor="report-type">Report Type</label>
            <SearchableSelect
              id="report-type"
              name="reportType"
              value={reportType}
              onChange={handleReportChange}
              options={reportTypeOptions}
              showEmptyOption={false}
              searchPlaceholder="Search report types…"
            />
          </div>
          {reportType === 'daily-revenue' && (
            <div className="date-filter">
              <label htmlFor="date-filter">Date</label>
              <input
                id="date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p>Loading report...</p>
      ) : (
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                {currentReport.columns.map((col) => (
                  <th key={col}>{toLabel(col)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={currentReport.columns.length}>No data found for this report.</td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id ?? row.invoice_id ?? i}>
                    {currentReport.columns.map((col) => (
                      <td key={col}>{renderCell(row, col)}</td>
                    ))}
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
