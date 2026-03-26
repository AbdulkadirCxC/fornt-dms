import { useEffect, useState } from 'react';
import { authApi, usersApi } from '../api/services';
import './Register.css';

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

function getUserType(user) {
  if (!user?.is_active) return 'Inactive';
  if (user?.is_superuser) return 'Super Admin';
  if (user?.is_staff) return 'Staff';
  return 'User';
}

function getUserImageUrl(user) {
  return user?.image ?? user?.avatar ?? user?.profile_image ?? user?.photo ?? '';
}

export default function Register() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    email: '',
    is_active: true,
    is_staff: false,
    is_superuser: false,
  });
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleAddForm = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setShowForm((v) => !v);
  };

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoadingUsers(true);
    setError('');
    try {
      const res = await usersApi.getAll({ limit: 100, ordering: '-id' });
      const d = res.data;
      const list = Array.isArray(d) ? d : d?.results ?? d?.data ?? d?.users ?? d?.items ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load users.');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const beginEdit = (u) => {
    const id = u.id ?? u.user_id ?? null;
    if (!id) {
      setError('Invalid user ID for edit.');
      return;
    }
    setError('');
    setEditingUser(id);
    setEditData({
      username: u.username ?? '',
      email: u.email ?? '',
      is_active: Boolean(u.is_active),
      is_staff: Boolean(u.is_staff),
      is_superuser: Boolean(u.is_superuser),
    });
    setEditImageFile(null);
    setEditImagePreview(getUserImageUrl(u));
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditing(false);
    setEditData({
      username: '',
      email: '',
      is_active: true,
      is_staff: false,
      is_superuser: false,
    });
    setEditImageFile(null);
    setEditImagePreview('');
  };

  const handleEditChange = (e) => {
    const { name, value, checked, type } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
    const payload = new FormData();
    payload.append('username', username);
    payload.append('password', formData.password);
    payload.append('password_confirm', formData.password_confirm);
    if (emailTrim) payload.append('email', emailTrim);
    if (addImageFile) payload.append('image', addImageFile);

    setLoading(true);
    try {
      await authApi.register(payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
      });
      setAddImageFile(null);
      setAddImagePreview('');
      setShowForm(false);
      await fetchUsers(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    const username = editData.username.trim();
    if (!username) {
      setError('Username is required.');
      return;
    }
    setError('');
    setEditing(true);
    try {
      const payload = new FormData();
      payload.append('username', username);
      payload.append('email', editData.email.trim() || '');
      payload.append('is_active', String(editData.is_active));
      payload.append('is_staff', String(editData.is_staff));
      payload.append('is_superuser', String(editData.is_superuser));
      if (editImageFile) payload.append('image', editImageFile);
      await usersApi.update(editingUser, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      cancelEdit();
      await fetchUsers(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setEditing(false);
    }
  };

  const handleAddImageChange = (e) => {
    e.preventDefault();
    const file = e.target.files?.[0] ?? null;
    setAddImageFile(file);
    setAddImagePreview(file ? URL.createObjectURL(file) : '');
  };

  const handleEditImageChange = (e) => {
    e.preventDefault();
    const file = e.target.files?.[0] ?? null;
    setEditImageFile(file);
    setEditImagePreview(file ? URL.createObjectURL(file) : editImagePreview);
  };

  const handleDelete = async (u) => {
    const id = u.id ?? u.user_id ?? null;
    if (!id) return;
    const username = u.username || `#${id}`;
    if (!window.confirm(`Delete user "${username}"?`)) return;
    setError('');
    setActionLoadingId(id);
    try {
      await usersApi.remove(id);
      if (editingUser === id) cancelEdit();
      await fetchUsers(true);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="register-page">
      <div className="page-header">
        <h1>Users</h1>
        <button type="button" className="btn-add" onClick={toggleAddForm}>
          {showForm ? 'Close' : 'Add User'}
        </button>
      </div>

      {error && <div className="register-error">{error}</div>}

      {showForm && (
        <div className="register-card">
          <div className="register-header">
            <h2>Add User</h2>
            <p>Create a new system user account</p>
          </div>
          <form className="register-form" onSubmit={handleSubmit}>
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
            <label htmlFor="image">User image</label>
            <input type="file" id="image" name="image" accept="image/*" onChange={handleAddImageChange} />
            {addImagePreview && (
              <div className="user-image-preview-wrap">
                <img src={addImagePreview} alt="New user preview" className="user-image-preview" />
              </div>
            )}
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

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? 'Creating user...' : 'Add User'}
          </button>
        </form>
        </div>
      )}

      {editingUser && (
        <div className="register-card">
          <div className="register-header">
            <h2>Edit User</h2>
            <p>Update user profile and permissions</p>
          </div>
          <form className="register-form" onSubmit={handleEditSubmit}>
            <div className="form-group">
              <label htmlFor="edit_username">Username</label>
              <input
                type="text"
                id="edit_username"
                name="username"
                value={editData.username}
                onChange={handleEditChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit_email">Email</label>
              <input
                type="email"
                id="edit_email"
                name="email"
                value={editData.email}
                onChange={handleEditChange}
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit_image">User image</label>
              <input type="file" id="edit_image" name="image" accept="image/*" onChange={handleEditImageChange} />
              {editImagePreview && (
                <div className="user-image-preview-wrap">
                  <img src={editImagePreview} alt="Edit user preview" className="user-image-preview" />
                </div>
              )}
            </div>
            <div className="register-check-grid">
              <label>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={editData.is_active}
                  onChange={handleEditChange}
                />
                Active
              </label>
              <label>
                <input
                  type="checkbox"
                  name="is_staff"
                  checked={editData.is_staff}
                  onChange={handleEditChange}
                />
                Staff
              </label>
              <label>
                <input
                  type="checkbox"
                  name="is_superuser"
                  checked={editData.is_superuser}
                  onChange={handleEditChange}
                />
                Admin
              </label>
            </div>
            <div className="register-edit-actions">
              <button type="button" className="btn-cancel-user" onClick={cancelEdit} disabled={editing}>
                Cancel
              </button>
              <button type="submit" className="register-btn" disabled={editing}>
                {editing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loadingUsers ? (
        <p>Loading users...</p>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Image</th>
                <th>Username</th>
                <th>Email</th>
                <th>User Type</th>
                <th>Active</th>
                <th>Staff</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={9}>No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id ?? u.user_id ?? u.username}>
                    <td>{u.id ?? u.user_id ?? '—'}</td>
                    <td>
                      {getUserImageUrl(u) ? (
                        <img src={getUserImageUrl(u)} alt={`${u.username ?? 'User'} avatar`} className="user-avatar-cell" />
                      ) : (
                        <span className="user-avatar-empty">—</span>
                      )}
                    </td>
                    <td>{u.username ?? '—'}</td>
                    <td>{u.email ?? '—'}</td>
                    <td>
                      <span className={`user-type-badge ${getUserType(u).toLowerCase().replace(/\s+/g, '-')}`}>
                        {getUserType(u)}
                      </span>
                    </td>
                    <td>{u.is_active ? 'Yes' : 'No'}</td>
                    <td>{u.is_staff ? 'Yes' : 'No'}</td>
                    <td>{u.is_superuser ? 'Yes' : 'No'}</td>
                    <td>
                      <div className="user-row-actions">
                        <button
                          type="button"
                          className="btn-user-edit"
                          onClick={() => beginEdit(u)}
                          disabled={actionLoadingId === (u.id ?? u.user_id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-user-delete"
                          onClick={() => handleDelete(u)}
                          disabled={actionLoadingId === (u.id ?? u.user_id)}
                        >
                          {actionLoadingId === (u.id ?? u.user_id) ? 'Deleting...' : 'Delete'}
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
