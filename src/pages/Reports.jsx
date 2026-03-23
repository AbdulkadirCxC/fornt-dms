import { useState, useEffect, useMemo } from 'react';
import { reportsApi, patientsApi } from '../api/services';
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
  { id: 'customer-statement', label: 'Customer Statement', columns: ['date', 'type', 'invoice', 'description', 'payment', 'amount', 'balance'] },
  { id: 'logs', label: 'Logs Report', columns: ['created_at', 'user', 'action', 'method', 'path', 'resource', 'object_id', 'ip_address'] },
];

const API_MAP = {
  'daily-revenue': reportsApi.dailyRevenue,
  'patient-treatment-history': reportsApi.patientTreatmentHistory,
  appointments: reportsApi.appointments,
  'outstanding-payments': reportsApi.outstandingPayments,
  'dentist-performance': reportsApi.dentistPerformance,
  'most-common-treatments': reportsApi.mostCommonTreatments,
  'payment-methods': reportsApi.paymentMethods,
  'customer-statement': reportsApi.customerStatement,
  logs: reportsApi.logs,
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

function formatDateTime(val) {
  if (!val) return '—';
  const d = typeof val === 'string' ? new Date(val) : val;
  if (Number.isNaN(d?.getTime?.())) return String(val);
  return d.toLocaleString();
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function Reports() {
  const [reportType, setReportType] = useState('daily-revenue');
  const [dateFilter, setDateFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statementMeta, setStatementMeta] = useState(null);
  const [patientOptions, setPatientOptions] = useState([]);
  const [reloadTick, setReloadTick] = useState(0);

  const reportTypeOptions = useMemo(
    () => REPORT_TYPES.map((r) => ({ value: r.id, label: r.label })),
    [],
  );

  const currentReport = REPORT_TYPES.find((r) => r.id === reportType);
  const isCustomerStatement = reportType === 'customer-statement';

  useEffect(() => {
    const fetchReport = async () => {
      if (isCustomerStatement && !patientFilter) {
        setLoading(false);
        setError(null);
        setData([]);
        setStatementMeta(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const api = API_MAP[reportType];
        const params =
          reportType === 'daily-revenue'
            ? (dateFilter ? { date: dateFilter } : {})
            : isCustomerStatement
              ? {
                  patient: patientFilter,
                  ...(startDateFilter ? { start_date: startDateFilter } : {}),
                  ...(endDateFilter ? { end_date: endDateFilter } : {}),
                }
              : {};
        const res = await api(params);
        const d = res.data;
        if (isCustomerStatement) {
          const transactions = Array.isArray(d?.transactions) ? d.transactions : [];
          setData(transactions);
          setStatementMeta({
            patient: d?.patient ?? null,
            statementDate: d?.statement_date ?? '',
            summary: d?.summary ?? {},
          });
        } else {
          const list = Array.isArray(d) ? d : d?.results ?? d?.data ?? d?.items ?? [];
          setData(Array.isArray(list) ? list : []);
          setStatementMeta(null);
        }
      } catch (err) {
        setError(err.response?.data?.message ?? 'Failed to load report.');
        setData([]);
        setStatementMeta(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportType, dateFilter, patientFilter, startDateFilter, endDateFilter, isCustomerStatement, reloadTick]);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await patientsApi.getAll({ limit: 200 });
        const d = res.data;
        const list = Array.isArray(d) ? d : d?.results ?? d?.data ?? d?.patients ?? [];
        const opts = (Array.isArray(list) ? list : []).map((p) => ({
          value: p.id ?? p.patient_id,
          label: `${p.full_name ?? p.name ?? `#${p.id}`}${p.phone ? ` - ${p.phone}` : ''}`,
        }));
        setPatientOptions(opts.filter((o) => o.value != null));
      } catch {
        setPatientOptions([]);
      }
    };
    fetchPatients();
  }, []);

  const handleReportChange = (e) => {
    const next = e.target.value;
    if (next) setReportType(next);
    setDateFilter('');
    setPatientFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setStatementMeta(null);
  };

  const handleReload = () => {
    setReloadTick((v) => v + 1);
  };

  const handlePrintStatement = () => {
    if (!isCustomerStatement || !statementMeta?.patient) return;

    const p = statementMeta.patient ?? {};
    const rowsHtml = (Array.isArray(data) ? data : [])
      .map((row) => {
        const invoice = row?.invoice != null && row.invoice !== '' ? `#${escapeHtml(row.invoice)}` : '—';
        return `<tr>
          <td>${escapeHtml(formatDate(row?.date))}</td>
          <td>${escapeHtml(row?.type ?? '—')}</td>
          <td>${invoice}</td>
          <td>${escapeHtml(row?.description ?? '—')}</td>
          <td class="num">${escapeHtml(formatAmount(row?.payment))}</td>
          <td class="num">${escapeHtml(formatAmount(row?.amount))}</td>
          <td class="num">${escapeHtml(formatAmount(row?.balance))}</td>
        </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
      <title>Customer Statement</title>
      <style>
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
        body{font-family:Segoe UI,system-ui,sans-serif;padding:20px;color:#0f172a}
        .head{display:flex;justify-content:space-between;gap:20px;margin-bottom:14px}
        .brand{display:flex;align-items:center;gap:10px;margin-bottom:8px}
        .logo{width:34px;height:34px;border-radius:8px;background:#0f766e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700}
        .brand-text strong{display:block;color:#0f766e;font-size:15px;line-height:1.1}
        .brand-text span{font-size:11px;color:#64748b}
        .head h2{margin:0 0 8px;color:#0f766e}
        .meta p,.sum p{margin:4px 0;font-size:13px}
        .sum{min-width:240px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}
        th{background:#0f766e;color:#fff;text-transform:uppercase;letter-spacing:.04em}
        .num{text-align:right;font-variant-numeric:tabular-nums}
      </style></head><body>
      <div class="head">
        <div class="meta">
          <div class="brand">
            <div class="logo">🦷</div>
            <div class="brand-text">
              <strong>DMS Clinic</strong>
              <span>Dental Management System</span>
            </div>
          </div>
          <h2>Customer Statement</h2>
          <p><strong>Patient:</strong> ${escapeHtml(p.full_name ?? '—')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(p.phone ?? '—')}</p>
          <p><strong>Date of birth:</strong> ${escapeHtml(formatDate(p.date_of_birth))}</p>
          <p><strong>Statement date:</strong> ${escapeHtml(formatDate(statementMeta.statementDate))}</p>
        </div>
        <div class="sum">
          <p><strong>Total charges:</strong> ${escapeHtml(formatAmount(statementMeta.summary?.total_charges))}</p>
          <p><strong>Total payments:</strong> ${escapeHtml(formatAmount(statementMeta.summary?.total_payments))}</p>
          <p><strong>Balance due:</strong> ${escapeHtml(formatAmount(statementMeta.summary?.balance_due))}</p>
        </div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Invoice</th><th>Description</th><th class="num">Payment</th><th class="num">Amount</th><th class="num">Balance</th></tr></thead>
        <tbody>${rowsHtml || '<tr><td colspan="7">No transactions</td></tr>'}</tbody>
      </table>
    </body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      window.alert('Please allow pop-ups to print statement.');
      return;
    }
    w.document.write(html);
    w.document.close();
    w.addEventListener('load', () => {
      setTimeout(() => {
        w.focus();
        w.print();
      }, 100);
    });
  };

  const getCellValue = (row, col) => {
    let val = row[col];
    if (val != null && val !== '') return val;
    if (col === 'timestamp' || col === 'created_at') {
      return row.timestamp ?? row.created_at ?? row.createdAt ?? row.date_time ?? row.datetime ?? row.date;
    }
    if (col === 'user') {
      const user = row.user ?? row.username ?? row.actor ?? row.performed_by;
      if (typeof user === 'object') return user.username ?? user.full_name ?? user.name ?? user.email ?? '—';
      return user;
    }
    if (col === 'action') return row.action ?? row.event ?? row.operation ?? row.activity;
    if (col === 'module' || col === 'resource') return row.module ?? row.resource ?? row.model ?? row.entity;
    if (col === 'details') return row.details ?? row.detail ?? row.description ?? row.message;
    if (col === 'ip_address') return row.ip_address ?? row.ip ?? row.ipAddress;
    if (col === 'path') return row.path ?? row.endpoint ?? row.url;
    if (col === 'method') return row.method ?? row.http_method;
    if (col === 'object_id') return row.object_id ?? row.target_id ?? row.entity_id;
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
    if (col.includes('revenue') || col.includes('amount') || col.includes('cost') || col === 'paid' || col === 'balance' || col === 'payment') {
      return formatAmount(value);
    }
    if (col === 'date') return formatDate(value);
    if (col === 'timestamp' || col === 'created_at') return formatDateTime(value);
    if (col === 'type') return String(value);
    if (col === 'invoice' || col === 'invoice_id' || col === 'payment_id') return `#${value}`;
    return String(value);
  };

  const toLabel = (col) => {
    if (isCustomerStatement) {
      if (col === 'invoice' || col === 'invoice_id') return 'Invoice';
      return col.toUpperCase().replace(/_/g, ' ');
    }
    return col
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

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
          {isCustomerStatement && (
            <>
              <div className="report-selector report-selector--patient">
                <label htmlFor="statement-patient">Patient</label>
                <SearchableSelect
                  id="statement-patient"
                  name="patient"
                  value={patientFilter}
                  onChange={(e) => setPatientFilter(e.target.value)}
                  options={patientOptions}
                  emptyOptionLabel="Select patient"
                  searchPlaceholder="Search patients…"
                />
              </div>
              <div className="date-filter">
                <label htmlFor="statement-start">Start Date</label>
                <input
                  id="statement-start"
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
              </div>
              <div className="date-filter">
                <label htmlFor="statement-end">End Date</label>
                <input
                  id="statement-end"
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="report-reload">
            <label>&nbsp;</label>
            <div className="report-action-buttons">
              <button
                type="button"
                className="btn-report-reload"
                onClick={handleReload}
                disabled={loading || (isCustomerStatement && !patientFilter)}
                title="Reload report data"
              >
                {loading ? 'Reloading…' : 'Reload'}
              </button>
              {isCustomerStatement && (
                <button
                  type="button"
                  className="btn-report-print"
                  onClick={handlePrintStatement}
                  disabled={loading || !statementMeta?.patient}
                  title="Print customer statement"
                >
                  Print
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}
      {isCustomerStatement && !patientFilter && !error && (
        <div className="page-note">Select a patient to view the customer statement.</div>
      )}

      {isCustomerStatement && statementMeta?.patient && (
        <div className="statement-summary-card">
          <div className="statement-summary-patient">
            <h3>{statementMeta.patient.full_name ?? '—'}</h3>
            <p>Phone: {statementMeta.patient.phone ?? '—'}</p>
            <p>Date of birth: {formatDate(statementMeta.patient.date_of_birth)}</p>
            <p>Statement date: {formatDate(statementMeta.statementDate)}</p>
          </div>
          <div className="statement-summary-totals">
            <p><span>Total charges</span><strong>{formatAmount(statementMeta.summary?.total_charges)}</strong></p>
            <p><span>Total payments</span><strong>{formatAmount(statementMeta.summary?.total_payments)}</strong></p>
            <p><span>Balance due</span><strong>{formatAmount(statementMeta.summary?.balance_due)}</strong></p>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading report...</p>
      ) : (
        <div className="reports-table-wrap">
          <table className={`reports-table ${isCustomerStatement ? 'customer-statement-ledger' : ''}`}>
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
