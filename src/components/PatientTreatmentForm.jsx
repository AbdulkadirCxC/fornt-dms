import { useState, useEffect, useMemo, useCallback } from 'react';
import { patientsApi, treatmentsApi, dentistsApi } from '../api/services';
import SearchableSelect from './SearchableSelect';
import './PatientTreatmentForm.css';

function newLine() {
  return {
    lineId:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    treatment: '',
    cost_override: '',
  };
}

function getPatientLabel(p) {
  const name = p.full_name ?? p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return name || `Patient #${p.id ?? p.patientId}`;
}

/** e.g. "Filling - $50.00" for the treatment dropdown (API: cost / price / amount). */
function getTreatmentSelectLabel(t) {
  const name = t.name ?? `Treatment #${t.id ?? t.treatmentId}`;
  const raw = t.cost ?? t.price ?? t.amount;
  if (raw == null || raw === '') return name;
  const num = typeof raw === 'number' ? raw : parseFloat(raw);
  if (isNaN(num)) return name;
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${name} - $${formatted}`;
}

export default function PatientTreatmentForm({ onSubmit, onCancel, disabled = false }) {
  const [patient, setPatient] = useState('');
  const [dentist, setDentist] = useState('');
  const [date, setDate] = useState('');
  const [lines, setLines] = useState(() => [newLine()]);
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [patientsRes, treatmentsRes, dentistsRes] = await Promise.all([
          patientsApi.getAll({ limit: 100, ordering: '-id' }),
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

  const patientOptions = useMemo(
    () =>
      patients.map((p) => ({
        value: p.id ?? p.patientId,
        label: getPatientLabel(p),
      })),
    [patients]
  );

  const treatmentOptions = useMemo(
    () =>
      treatments.map((t) => ({
        value: t.id ?? t.treatmentId,
        label: getTreatmentSelectLabel(t),
      })),
    [treatments]
  );

  const dentistOptions = useMemo(
    () =>
      dentists.map((d) => ({
        value: d.id ?? d.dentistId,
        label: d.name ?? `Dentist #${d.id ?? d.dentistId}`,
      })),
    [dentists]
  );

  const handlePatientChange = useCallback((e) => {
    setPatient(e.target.value);
    setError('');
  }, []);

  const handleDentistChange = useCallback((e) => {
    setDentist(e.target.value);
    setError('');
  }, []);

  const updateLine = useCallback((index, field, value) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
    setError('');
  }, []);

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, newLine()]);
  }, []);

  const removeLine = useCallback((index) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const patientId = patient ? Number(patient) : null;
    const dentistId = dentist ? Number(dentist) : null;

    if (!patientId) {
      setError('Patient is required');
      return;
    }

    const filledLines = lines.filter((line) => line.treatment);
    if (filledLines.length === 0) {
      setError('Add at least one treatment');
      return;
    }

    const treatmentsPayload = [];
    for (const line of filledLines) {
      const costVal = line.cost_override?.trim();
      const costNum = costVal ? parseFloat(costVal) : null;
      if (costNum != null && (isNaN(costNum) || costNum < 0)) {
        setError('Cost override must be a valid positive number');
        return;
      }
      const item = { treatment: Number(line.treatment) };
      if (costNum != null && !isNaN(costNum)) {
        item.cost_override = costNum;
      }
      treatmentsPayload.push(item);
    }

    const payload = {
      patient: patientId,
      dentist: dentistId,
      date: date || null,
      treatments: treatmentsPayload,
    };

    onSubmit(payload);
  };

  if (loading) {
    return <div className="patient-treatment-form-loading">Loading options...</div>;
  }

  return (
    <form className="patient-treatment-form" onSubmit={handleSubmit}>
      <h3>Add patient treatments</h3>
      <p className="patient-treatment-form-hint">
        One visit: choose patient, dentist, and date once, then add one row per treatment. Submitting
        creates all lines at once; you can open the combined visit document afterward to print or save
        as PDF.
      </p>

      {error && <div className="patient-treatment-form-error">{error}</div>}

      <div className="form-grid-row form-grid-row--3">
        <div className="form-group">
          <label htmlFor="patient">Patient *</label>
          <SearchableSelect
            id="patient"
            name="patient"
            value={patient}
            onChange={handlePatientChange}
            options={patientOptions}
            required
            disabled={disabled}
            emptyOptionLabel="Select patient"
            searchPlaceholder="Search patients…"
          />
        </div>

        <div className="form-group">
          <label htmlFor="dentist">Dentist</label>
          <SearchableSelect
            id="dentist"
            name="dentist"
            value={dentist}
            onChange={handleDentistChange}
            options={dentistOptions}
            disabled={disabled}
            emptyOptionLabel="Select dentist"
            searchPlaceholder="Search dentists…"
          />
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setError('');
            }}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="treatment-lines-section">
        <div className="treatment-lines-header">
          <span className="treatment-lines-title">Treatments *</span>
          <button
            type="button"
            className="btn-add-line"
            onClick={addLine}
            disabled={disabled}
          >
            + Add treatment
          </button>
        </div>

        <div className="treatment-lines">
          {lines.map((line, index) => (
            <div className="treatment-line" key={line.lineId}>
              <div className="treatment-line-fields">
                <div className="form-group treatment-line-select">
                  <label htmlFor={`treatment-${line.lineId}`}>Treatment</label>
                  <SearchableSelect
                    id={`treatment-${line.lineId}`}
                    name={`treatment-${index}`}
                    value={line.treatment}
                    onChange={(e) => updateLine(index, 'treatment', e.target.value)}
                    options={treatmentOptions}
                    disabled={disabled}
                    emptyOptionLabel="Select treatment"
                    searchPlaceholder="Search treatments…"
                  />
                </div>
                <div className="form-group treatment-line-cost">
                  <label htmlFor={`cost-${line.lineId}`}>Cost override</label>
                  <input
                    type="number"
                    id={`cost-${line.lineId}`}
                    min="0"
                    step="0.01"
                    value={line.cost_override}
                    onChange={(e) => updateLine(index, 'cost_override', e.target.value)}
                    placeholder="Optional"
                    disabled={disabled}
                  />
                </div>
              </div>
              {lines.length > 1 && (
                <button
                  type="button"
                  className="btn-remove-line"
                  onClick={() => removeLine(index)}
                  disabled={disabled}
                  title="Remove this line"
                  aria-label="Remove treatment line"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          Save all treatments
        </button>
        {onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={disabled}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
