import { useState, useEffect } from 'react';
import { patientsApi } from '../api/services';
import './InvoiceForm.css';

const initialValues = {
  patient: '',
  total_amount: '',
  status: 'pending',
};

function getPatientLabel(p) {
  const name = p.full_name ?? p.name ?? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
  return name || `Patient #${p.id ?? p.patientId}`;
}

export default function InvoiceForm({ onSubmit, onCancel, initialData = null, disabled = false }) {
  const [formData, setFormData] = useState(initialData ?? initialValues);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await patientsApi.getAll({ limit: 100 });
        const data = res.data;
        const list = Array.isArray(data)
          ? data
          : data?.results ?? data?.data ?? data?.patients ?? [];
        setPatients(Array.isArray(list) ? list : []);
      } catch {
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    loadPatients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const amountVal = formData.total_amount?.trim();
    const payload = {
      patient_id: formData.patient ? Number(formData.patient) : null,
      total_amount: amountVal ? parseFloat(amountVal) : null,
      status: formData.status || null,
    };

    if (payload.total_amount != null && (isNaN(payload.total_amount) || payload.total_amount < 0)) {
      setError('Total amount must be a valid positive number');
      return;
    }

    onSubmit(payload);
  };

  if (loading) {
    return <div className="invoice-form-loading">Loading patients...</div>;
  }

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Invoice' : 'Add Invoice'}</h3>

      {error && <div className="invoice-form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="patient">Patient</label>
        <select
          id="patient"
          name="patient"
          value={formData.patient}
          onChange={handleChange}
        >
          <option value="">Select patient</option>
          {patients.map((p) => (
            <option key={p.id ?? p.patientId} value={p.id ?? p.patientId}>
              {getPatientLabel(p)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="total_amount">Total Amount</label>
        <input
          type="number"
          id="total_amount"
          name="total_amount"
          min="0"
          step="0.01"
          value={formData.total_amount ?? ''}
          onChange={handleChange}
          placeholder="0.00"
        />
      </div>

      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          name="status"
          value={formData.status ?? 'pending'}
          onChange={handleChange}
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          {initialData ? 'Update' : 'Add'} Invoice
        </button>
        {onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
