import { useState } from 'react';
import './TreatmentForm.css';

const initialValues = {
  name: '',
  description: '',
  cost: '',
};

export default function TreatmentForm({ onSubmit, onCancel, initialData = null, disabled = false }) {
  const [formData, setFormData] = useState(initialData ?? initialValues);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const costVal = formData.cost?.trim();
    const payload = {
      name: formData.name.trim() || null,
      description: formData.description.trim() || null,
      cost: costVal ? parseFloat(costVal) : null,
    };

    if (!payload.name) {
      setError('Name is required');
      return;
    }

    if (payload.cost !== null && (isNaN(payload.cost) || payload.cost < 0)) {
      setError('Cost must be a valid positive number');
      return;
    }

    onSubmit(payload);
  };

  return (
    <form className="treatment-form" onSubmit={handleSubmit}>
      <h3>{initialData ? 'Edit Treatment' : 'Add Treatment'}</h3>

      {error && <div className="treatment-form-error">{error}</div>}

      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name ?? ''}
          onChange={handleChange}
          placeholder="Enter treatment name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description ?? ''}
          onChange={handleChange}
          placeholder="Enter description"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="cost">Cost</label>
        <input
          type="number"
          id="cost"
          name="cost"
          min="0"
          step="0.01"
          value={formData.cost ?? ''}
          onChange={handleChange}
          placeholder="0.00"
        />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={disabled}>
          {initialData ? 'Update' : 'Add'} Treatment
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
