import { useState, useEffect, useCallback } from 'react';
import './PatientForm.css';

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function normalizeBloodGroup(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  const upper = s.toUpperCase();
  return BLOOD_GROUP_OPTIONS.includes(upper) ? upper : s;
}

const initialValues = {
  full_name: '',
  gender: '',
  date_of_birth: '',
  phone: '',
  email: '',
  address: '',
  blood_group: '',
  allergies: '',
  medical_history: '',
  emergency_contact: '',
  notes: '',
  status: '',
};

function toInputDate(value) {
  if (value == null || value === '') return '';
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function mapPatientToForm(patient) {
  if (!patient) return { ...initialValues };
  return {
    full_name: patient.full_name ?? '',
    gender: patient.gender ?? '',
    date_of_birth: toInputDate(patient.date_of_birth),
    phone: patient.phone ?? '',
    email: patient.email ?? '',
    address: patient.address ?? '',
    blood_group: normalizeBloodGroup(patient.blood_group),
    allergies: patient.allergies ?? '',
    medical_history: patient.medical_history ?? '',
    emergency_contact: patient.emergency_contact ?? '',
    notes: patient.notes ?? '',
    status: patient.status ?? '',
  };
}

function formatDisplayDate(value) {
  if (value == null || value === '') return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function buildFieldPayload(formData) {
  return {
    full_name: formData.full_name.trim() || null,
    gender: formData.gender || null,
    date_of_birth: formData.date_of_birth || null,
    phone: formData.phone.trim() || null,
    email: formData.email.trim() || null,
    address: formData.address.trim() || null,
    blood_group: formData.blood_group.trim() || null,
    allergies: formData.allergies.trim() || null,
    medical_history: formData.medical_history.trim() || null,
    emergency_contact: formData.emergency_contact.trim() || null,
    notes: formData.notes.trim() || null,
    status: formData.status || null,
  };
}

function appendPatientFields(fd, formData) {
  const p = buildFieldPayload(formData);
  Object.entries(p).forEach(([key, val]) => {
    if (val != null && val !== '') fd.append(key, val);
  });
}

export default function PatientForm({ onSubmit, onCancel, initialData = null, disabled = false }) {
  const [formData, setFormData] = useState(() => (initialData ? mapPatientToForm(initialData) : initialValues));
  const [error, setError] = useState('');
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  const patientId = initialData?.id ?? initialData?.patientId;
  const isAddMode = initialData == null;

  // Reset form + photo only when switching patients or add vs edit — not when `initialData`
  // is a new object reference for the same patient (that was clearing the file on pick).
  useEffect(() => {
    setFormData(initialData ? mapPatientToForm(initialData) : initialValues);
    setProfilePhotoFile(null);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: sync identity only
  }, [patientId, isAddMode]);

  useEffect(
    () => () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    },
    [filePreviewUrl]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
    setError('');
  };

  const handleTextareaChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handlePhotoChange = useCallback((e) => {
    const file = e.target.files?.[0] ?? null;
    setProfilePhotoFile(file);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setError('');
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const fields = buildFieldPayload(formData);
    if (!fields.full_name) {
      setError('Full name is required');
      return;
    }

    if (profilePhotoFile) {
      const fd = new FormData();
      appendPatientFields(fd, formData);
      fd.append('profile_photo', profilePhotoFile);
      onSubmit(fd);
      return;
    }

    onSubmit(fields);
  };

  const isEdit = Boolean(initialData);
  const registrationDate = initialData?.registration_date ?? initialData?.created_at;
  const lastVisit = initialData?.last_visit;
  const appointmentCount = initialData?.appointment_count;
  const existingPhotoUrl = initialData?.profile_photo ?? null;
  const photoSrc = filePreviewUrl || existingPhotoUrl || '';

  return (
    <div className="patient-form">
      <h3>{isEdit ? 'Edit Patient' : 'Add Patient'}</h3>

      {error && <div className="patient-form-error">{error}</div>}

      {isEdit && (
        <div className="patient-form-meta">
          <div className="patient-form-meta-row">
            <span className="patient-form-meta-label">Registration</span>
            <span>{formatDisplayDate(registrationDate)}</span>
          </div>
          <div className="patient-form-meta-row">
            <span className="patient-form-meta-label">Last visit</span>
            <span>{formatDisplayDate(lastVisit)}</span>
          </div>
          <div className="patient-form-meta-row">
            <span className="patient-form-meta-label">Appointments</span>
            <span>{appointmentCount != null ? String(appointmentCount) : '—'}</span>
          </div>
        </div>
      )}

      {/* File input stays outside <form> so choosing a file cannot trigger an implicit form submit / navigation in any browser. */}
      <div className="form-group patient-form-photo">
        <label htmlFor="profile_photo">Profile photo</label>
        {photoSrc ? (
          <div className="patient-form-photo-preview">
            <img src={photoSrc} alt="" />
          </div>
        ) : null}
        <input
          type="file"
          id="profile_photo"
          name="profile_photo"
          accept="image/*"
          onChange={handlePhotoChange}
          onClick={(e) => e.stopPropagation()}
          disabled={disabled}
        />
        {isEdit && existingPhotoUrl && !filePreviewUrl && (
          <p className="patient-form-hint">Choose a new image to replace the current photo.</p>
        )}
      </div>

      <form className="patient-form-fields" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="full_name">Full Name *</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name ?? ''}
            onChange={handleChange}
            placeholder="Enter full name"
            required
          />
        </div>

        <div className="form-grid-row form-grid-row--2">
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select id="gender" name="gender" value={formData.gender ?? ''} onChange={handleChange}>
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
          <label htmlFor="status">Status</label>
          <select id="status" name="status" value={formData.status ?? ''} onChange={handleChange}>
            <option value="">—</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            {formData.status && !['active', 'inactive', ''].includes(formData.status) && (
              <option value={formData.status}>{formData.status}</option>
            )}
          </select>
        </div>

        <div className="form-grid-row form-grid-row--2">
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone ?? ''}
              onChange={handleChange}
              placeholder="Phone number"
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email ?? ''}
              onChange={handleChange}
              placeholder="Email"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            rows={2}
            value={formData.address ?? ''}
            onChange={handleTextareaChange}
            placeholder="Street, city, postal code"
          />
        </div>

        <div className="form-group">
          <label htmlFor="blood_group">Blood group</label>
          <select
            id="blood_group"
            name="blood_group"
            value={formData.blood_group ?? ''}
            onChange={handleChange}
          >
            <option value="">—</option>
            {BLOOD_GROUP_OPTIONS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
            {formData.blood_group &&
              !BLOOD_GROUP_OPTIONS.includes(String(formData.blood_group).trim()) && (
                <option value={formData.blood_group}>{formData.blood_group}</option>
              )}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="allergies">Allergies</label>
          <textarea
            id="allergies"
            name="allergies"
            rows={2}
            value={formData.allergies ?? ''}
            onChange={handleTextareaChange}
            placeholder="Known allergies"
          />
        </div>

        <div className="form-group">
          <label htmlFor="medical_history">Medical history</label>
          <textarea
            id="medical_history"
            name="medical_history"
            rows={3}
            value={formData.medical_history ?? ''}
            onChange={handleTextareaChange}
            placeholder="Relevant medical history"
          />
        </div>

        <div className="form-group">
          <label htmlFor="emergency_contact">Emergency contact</label>
          <textarea
            id="emergency_contact"
            name="emergency_contact"
            rows={2}
            value={formData.emergency_contact ?? ''}
            onChange={handleTextareaChange}
            placeholder="Name and phone"
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={formData.notes ?? ''}
            onChange={handleTextareaChange}
            placeholder="Internal notes"
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={disabled}>
            {isEdit ? 'Update' : 'Add'} Patient
          </button>
          {onCancel && (
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
