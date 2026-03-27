import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/services';
import { tokenStorage } from '../api/tokenStorage';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const successMessage = location.state?.registeredMessage;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.getToken(formData);
      const data = res.data;
      const access = data?.access ?? data?.token ?? data?.access_token ?? data?.key;
      const refresh = data?.refresh ?? data?.refresh_token;
      if (access) {
        tokenStorage.setTokens(access, refresh);
        navigate('/', { replace: true });
      } else {
        setError('Invalid response: no token received');
      }
    } catch (err) {
      const msg = err.response?.data?.detail
        ?? err.response?.data?.message
        ?? err.response?.data?.error
        ?? 'Login failed. Check username and password.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page-bg" aria-hidden="true" />
      <div className="login-card">
        <header className="login-header">
          <div className="login-logo-ring">
            <span className="login-logo" aria-hidden="true">
              🦷
            </span>
          </div>
          <p className="login-eyebrow">Dental Management System</p>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in with your clinic account to continue.</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="login-success" role="status">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              autoComplete="username"
              required
              autoFocus
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="login-btn-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>

          <p className="login-footnote">Secure connection · Staff access only</p>
        </form>
      </div>
    </div>
  );
}
