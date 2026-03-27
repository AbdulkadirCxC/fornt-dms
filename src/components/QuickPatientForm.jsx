import { useState, useEffect } from 'react';
import './QuickPatientForm.css';

/**
 * Compact patient create — sends fields the main Patient form can edit later.
 * @param {(payload: object) => void | Promise<void>} onSubmit
 */
export default function QuickPatientForm({
  idPrefix = 'qp',
  error = '',
  submitting = false,
  disabled = false,
  onSubmit,
  onCancel,
  introText = 'Quick registration — full profile can be edited later under Patients.',
  submitLabel = 'Create patient',
  showCancel = true,
  /** Use false when placed inside another &lt;form&gt; (e.g. queue ticket). */
  useFormElement = true,
  showIntro = true,
  resetKey = 0,
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setFullName('');
    setPhone('');
    setGender('');
    setEmail('');
    setDateOfBirth('');
    setAddress('');
    setLocalError('');
  }, [resetKey]);

  const buildPayload = () => {
    const payload = {
      full_name: fullName.trim(),
      gender: gender || null,
      date_of_birth: dateOfBirth || null,
      address: address.trim() || null,
    };
    if (!payload.full_name) return null;
    if (phone.trim()) payload.phone = phone.trim();
    if (email.trim()) payload.email = email.trim();
    return payload;
  };

  const validate = () => {
    if (!fullName.trim()) {
      setLocalError('Enter the patient’s full name.');
      return false;
    }
    if (!gender) {
      setLocalError('Select a gender.');
      return false;
    }
    if (!dateOfBirth) {
      setLocalError('Date of birth is required.');
      return false;
    }
    if (!address.trim()) {
      setLocalError('Address is required.');
      return false;
    }
    return true;
  };

  const runSubmit = async () => {
    if (!validate()) return;
    const payload = buildPayload();
    if (!payload) {
      setLocalError('Enter the patient’s full name.');
      return;
    }
    setLocalError('');
    await onSubmit(payload);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runSubmit();
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!submitting && !disabled) runSubmit();
  };

  const displayError = error || localError;

  const fields = (
    <>
      {showIntro && <p className="quick-patient-intro">{introText}</p>}
      {displayError && (
        <div className="quick-patient-error" role="alert">
          {displayError}
        </div>
      )}
      <div className="quick-patient-grid">
        <div className="quick-patient-field">
          <label htmlFor={`${idPrefix}-name`}>Full name *</label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setLocalError('');
            }}
            placeholder="e.g. Jane Doe"
            disabled={disabled || submitting}
          />
        </div>
        <div className="quick-patient-field">
          <label htmlFor={`${idPrefix}-phone`}>Phone</label>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            disabled={disabled || submitting}
          />
        </div>
        <div className="quick-patient-field">
          <label htmlFor={`${idPrefix}-gender`}>Gender *</label>
          <select
            id={`${idPrefix}-gender`}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            disabled={disabled || submitting}
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="quick-patient-field">
          <label htmlFor={`${idPrefix}-email`}>Email</label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Optional"
            disabled={disabled || submitting}
          />
        </div>
        <div className="quick-patient-field">
          <label htmlFor={`${idPrefix}-dob`}>Date of birth *</label>
          <input
            id={`${idPrefix}-dob`}
            type="date"
            autoComplete="bday"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            disabled={disabled || submitting}
          />
        </div>
        <div className="quick-patient-field quick-patient-field--full">
          <label htmlFor={`${idPrefix}-address`}>Address *</label>
          <textarea
            id={`${idPrefix}-address`}
            rows={2}
            autoComplete="street-address"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setLocalError('');
            }}
            placeholder="Street, city, postal code"
            disabled={disabled || submitting}
          />
        </div>
      </div>
      <div className="quick-patient-actions">
        {showCancel && onCancel && (
          <button
            type="button"
            className="quick-patient-btn-secondary"
            disabled={disabled || submitting}
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
        {useFormElement ? (
          <button type="submit" className="quick-patient-btn-primary" disabled={disabled || submitting}>
            {submitting ? 'Creating…' : submitLabel}
          </button>
        ) : (
          <button
            type="button"
            className="quick-patient-btn-primary"
            disabled={disabled || submitting}
            onClick={() => runSubmit()}
          >
            {submitting ? 'Creating…' : submitLabel}
          </button>
        )}
      </div>
    </>
  );

  if (useFormElement) {
    return (
      <form className="quick-patient-form" onSubmit={handleSubmit}>
        {fields}
      </form>
    );
  }

  return (
    <div className="quick-patient-form quick-patient-form--embedded" onKeyDown={handleKeyDown} role="group">
      {fields}
    </div>
  );
}
