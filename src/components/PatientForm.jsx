import { useState } from 'react';
import './PatientForm.css';

const initialValues = {
  full_name: '',
  gender: '',
  date_of_birth: '',
  phone: '',
};

export default function PatientForm({ onSubmit, onCancel, initialData = null, disabled = false }) {
  const [formData, setFormData] = useState(initialData ?? initialValues);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      full_name: formData.full_name.trim() || null,
      gender: formData.gender || null,
      date_of_birth: formData.date_of_birth || null,
      phone: formData.phone.trim() || null,
    };

    if (!payload.full_name) {
      setError('Full name is required');
      return;
    }

    onSubmit(payload);
  };

  return (
    <form className="patient-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Patient' : 'Add Patient'}</h3>

      {error && <div className="patient-form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="full_name">Full Name *</label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          placeholder="Enter full name"
          required
        />
      </div>

      <div className="form-grid-row form-grid-row--2">
        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            name="gender"
            value={formData.gender ?? ''}
            onChange={handleChange}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="date_of_birth">Date of Birth</label>
          <input
            type="date"
            id="date_of_birth"
            name="date_of_birth"
            value={formData.date_of_birth ?? ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone</label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone ?? ''}
          onChange={handleChange}
          placeholder="Enter phone number"
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>{initialData ? 'Update' : 'Add'} Patient</button>
        {onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
