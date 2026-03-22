import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';
import './Login.css';

const MIN_PASSWORD = 8;

function formatApiError(err) {
  const data = err.response?.data;
  if (!data) return 'Registration failed. Please try again.';
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((d) => (typeof d === 'string' ? d : d.msg ?? JSON.stringify(d))).join(' ');
  }
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  const parts = [];
  for (const [key, val] of Object.entries(data)) {
    if (key === 'detail') continue;
    const msg = Array.isArray(val) ? val.join(' ') : typeof val === 'string' ? val : JSON.stringify(val);
    parts.push(`${key}: ${msg}`);
  }
  return parts.length ? parts.join(' ') : JSON.stringify(data);
}

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const username = formData.username.trim();
    if (!username) {
      setError('Username is required.');
      return;
    }
    if (formData.password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    const emailTrim = formData.email.trim();
    const payload = {
      username,
      password: formData.password,
      password_confirm: formData.password_confirm,
    };
    if (emailTrim) payload.email = emailTrim;

    setLoading(true);
    try {
      await authApi.register(payload);
      navigate('/login', {
        replace: false,
        state: { registeredMessage: 'Account created. You can sign in now.' },
      });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">🦷</span>
          <h1>Create account</h1>
          <p>Register for Dental Management System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="login-optional">(optional)</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={`At least ${MIN_PASSWORD} characters`}
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password_confirm">Confirm password</label>
            <input
              type="password"
              id="password_confirm"
              name="password_confirm"
              value={formData.password_confirm}
              onChange={handleChange}
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>

          <p className="login-footer">
            Already have an account?{' '}
            <Link to="/login" className="login-link">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
