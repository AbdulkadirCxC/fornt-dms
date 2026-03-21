import { useState } from 'react';
import './DentistForm.css';

const initialValues = {
  name: '',
  specialization: '',
};

export default function DentistForm({ onSubmit, onCancel, initialData = null, disabled = false }) {
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
      name: formData.name.trim() || null,
      specialization: formData.specialization.trim() || null,
    };

    if (!payload.name) {
      setError('Name is required');
      return;
    }

    onSubmit(payload);
  };

  return (
    <form className="dentist-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Dentist' : 'Add Dentist'}</h3>

      {error && <div className="dentist-form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name ?? ''}
          onChange={handleChange}
          placeholder="Enter name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="specialization">Specialization</label>
        <input
          type="text"
          id="specialization"
          name="specialization"
          value={formData.specialization ?? ''}
          onChange={handleChange}
          placeholder="Enter specialization"
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>{initialData ? 'Update' : 'Add'} Dentist</button>
        {onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
