import { useState, useEffect, useCallback, useRef } from 'react';
import { patientsApi, appointmentsApi, fetchAllPatientsForExport } from '../api/services';
import { buildPatientsCsv, downloadTextFile } from '../utils/patientExport';
import PatientForm from '../components/PatientForm';
import AppointmentForm from '../components/AppointmentForm';
import { parseExcelForPreview, EXCEL_PREVIEW_MAX_ROWS } from '../utils/excelPreview';
import './Patients.css';

function sortPatientsDesc(list) {
  return [...list].sort((a, b) => {
    const idA = Number(a.id ?? a.patientId ?? 0);
    const idB = Number(b.id ?? b.patientId ?? 0);
    return idB - idA;
  });
}

function formatDateCell(value) {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

function ExcelImportPreviewModal({ preview, onCancel, onUpload, uploading }) {
  const { headers, previewRows, fileName, totalDataRows, truncated } = preview;
  const colCount = Math.max(
    headers.length,
    previewRows.reduce((m, r) => Math.max(m, r.length), 0)
  );
  const displayHeaders = Array.from({ length: colCount }, (_, i) => {
    const h = headers[i];
    return h != null && String(h).trim() !== '' ? String(h) : `Column ${i + 1}`;
  });

  return (
    <div
      className="excel-preview-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="excel-preview-title"
      onClick={onCancel}
    >
      <div className="excel-preview-panel" onClick={(ev) => ev.stopPropagation()}>
        <div className="excel-preview-header">
          <h2 id="excel-preview-title">Preview import</h2>
          <p className="excel-preview-meta">
            <span className="excel-preview-filename">{fileName}</span>
            <span className="excel-preview-sep">·</span>
            <span>{totalDataRows} data row(s)</span>
            {truncated && (
              <span className="excel-preview-trunc">
                {' '}
                (showing first {EXCEL_PREVIEW_MAX_ROWS} rows in the table)
              </span>
            )}
          </p>
        </div>
        <div className="excel-preview-table-scroll">
          <table className="excel-preview-table">
            <thead>
              <tr>
                {displayHeaders.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => {
                const cells = [...row];
                while (cells.length < colCount) cells.push('');
                return (
                  <tr key={ri}>
                    {cells.slice(0, colCount).map((c, ci) => (
                      <td key={ci}>{c !== '' ? c : '—'}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="excel-preview-hint">
          Row 1 is the header row (column names must match the server). Include an <strong>id</strong> or{' '}
          <strong>patient_id</strong> column if you are updating existing patients. Confirm to upload, or
          cancel to choose another file.
        </p>
        <div className="excel-preview-actions">
          <button type="button" className="excel-preview-btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="excel-preview-btn-upload" disabled={uploading} onClick={onUpload}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  /** Trimmed query sent to API (debounced from input, or applied immediately on Search). */
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [appointmentForPatient, setAppointmentForPatient] = useState(null);
  const [submittingAppointment, setSubmittingAppointment] = useState(false);
  const excelInputRef = useRef(null);
  const [excelUploading, setExcelUploading] = useState(false);
  /** @type {null | { created: number; errors: { row: number; message: string }[] }} */
  const [excelResult, setExcelResult] = useState(null);
  /** @type {null | { file: File; fileName: string; headers: string[]; previewRows: string[][]; totalDataRows: number; truncated: boolean }} */
  const [excelPreview, setExcelPreview] = useState(null);
  const [exportingPatients, setExportingPatients] = useState(false);

  const fetchPatients = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const baseParams = { limit: 50, ordering: '-id' };
        const params = { ...baseParams };
        if (searchQuery) params.search = searchQuery;
        if (filterStatus) params.status = filterStatus;
        if (filterGender) params.gender = filterGender;
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
    },
    [searchQuery, filterStatus, filterGender]
  );

  useEffect(() => {
    const trimmed = searchInput.trim();
    const delay = trimmed === '' ? 0 : 350;
    const t = setTimeout(() => setSearchQuery(trimmed), delay);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleExcelFileChange = async (e) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Please choose an Excel file (.xlsx).');
      return;
    }
    setError(null);
    setExcelResult(null);
    try {
      const parsed = await parseExcelForPreview(file);
      setExcelPreview({
        file,
        fileName: file.name,
        ...parsed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read the Excel file.');
    }
  };

  const handleExportAllPatients = async () => {
    setExportingPatients(true);
    setError(null);
    try {
      const rows = await fetchAllPatientsForExport();
      const csv = buildPatientsCsv(rows);
      const day = new Date().toISOString().slice(0, 10);
      downloadTextFile(csv, `patients-export-${day}.csv`);
    } catch (err) {
      setError(err.response?.data?.detail ?? err.response?.data?.message ?? 'Failed to export patients.');
    } finally {
      setExportingPatients(false);
    }
  };

  const handleExcelPreviewCancel = () => {
    setExcelPreview(null);
  };

  const handleExcelConfirmUpload = async () => {
    if (!excelPreview?.file) return;
    setExcelUploading(true);
    setError(null);
    setExcelResult(null);
    try {
      const fd = new FormData();
      fd.append('file', excelPreview.file);
      const res = await patientsApi.uploadExcel(fd);
      const data = res?.data ?? {};
      const created = Number(data.created) || 0;
      const errors = Array.isArray(data.errors) ? data.errors : [];
      setExcelPreview(null);
      setExcelResult({ created, errors });
      await fetchPatients(true);
    } catch (err) {
      const d = err.response?.data;
      const msg =
        (typeof d === 'string' ? d : null) ??
        (typeof d?.detail === 'string' ? d.detail : null) ??
        (typeof d?.message === 'string' ? d.message : null) ??
        'Excel import failed.';
      setError(msg);
    } finally {
      setExcelUploading(false);
    }
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
              type="search"
              placeholder="Search name, phone, email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
            />
            <select
              className="patients-filter-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
              }}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="patients-filter-select"
              value={filterGender}
              onChange={(e) => {
                setFilterGender(e.target.value);
              }}
              aria-label="Filter by gender"
            >
              <option value="">All genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <button type="submit">Search</button>
          </form>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="patients-excel-input-hidden"
            aria-hidden
            tabIndex={-1}
            onChange={handleExcelFileChange}
          />
          <button
            type="button"
            className="btn-import-excel"
            disabled={excelUploading}
            aria-label="Import patients from Excel (.xlsx)"
            onClick={() => excelInputRef.current?.click()}
          >
            {excelUploading ? 'Uploading…' : 'Import Excel'}
          </button>
          <button
            type="button"
            className="btn-export-patients"
            disabled={exportingPatients}
            aria-label="Export all patients to CSV"
            onClick={handleExportAllPatients}
          >
            {exportingPatients ? 'Exporting…' : 'Export all'}
          </button>
          <button
            type="button"
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

      {excelPreview && (
        <ExcelImportPreviewModal
          preview={excelPreview}
          onCancel={handleExcelPreviewCancel}
          onUpload={handleExcelConfirmUpload}
          uploading={excelUploading}
        />
      )}

      {excelResult && (
        <div className="page-import-result" role="status">
          <div className="page-import-result-main">
            <p>
              <strong>{excelResult.created}</strong> patient{excelResult.created === 1 ? '' : 's'} imported
              {excelResult.errors.length > 0 ? ' (some rows had errors).' : '.'}
            </p>
            {excelResult.errors.length > 0 && (
              <ul className="page-import-errors">
                {excelResult.errors.map((rowErr, idx) => (
                  <li key={`${rowErr.row}-${idx}`}>
                    Row {rowErr.row}: {rowErr.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="button" className="btn-dismiss-import" onClick={() => setExcelResult(null)}>
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="patient-form-modal">
          <PatientForm
            key="patient-new"
            onSubmit={handleFormSubmit}
            onCancel={() => setShowForm(false)}
            disabled={submitting}
          />
        </div>
      )}

      {editingPatient && (
        <div className="patient-form-modal">
          <PatientForm
            key={editingPatient.id ?? editingPatient.patientId ?? 'edit'}
            initialData={editingPatient}
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
                <th>Photo</th>
                <th>Full Name</th>
                <th>Status</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Last visit</th>
                <th>Appts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={11}>No patients found. Add a patient using the form above.</td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id ?? p.patientId}>
                    <td>{p.id ?? p.patientId ?? '—'}</td>
                    <td>
                      {p.profile_photo ? (
                        <img className="patients-table-avatar" src={p.profile_photo} alt="" />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{p.full_name ?? '—'}</td>
                    <td>{p.status ?? '—'}</td>
                    <td>{p.gender ?? '—'}</td>
                    <td>{p.date_of_birth ?? '—'}</td>
                    <td>{p.phone ?? '—'}</td>
                    <td>{p.email ?? '—'}</td>
                    <td>{formatDateCell(p.last_visit)}</td>
                    <td>{p.appointment_count != null ? p.appointment_count : '—'}</td>
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
