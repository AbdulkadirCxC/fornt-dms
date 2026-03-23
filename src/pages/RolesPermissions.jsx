import { useEffect, useMemo, useState } from 'react';
import { rolesApi } from '../api/services';
import './RolesPermissions.css';

function normalizeList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const k of ['results', 'data', 'items', ...keys]) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
}

function getRoleId(role) {
  return role.id ?? role.role_id ?? role.pk;
}

function getPermissionId(permission) {
  return permission.id ?? permission.permission_id ?? permission.pk;
}

function permissionLabel(permission) {
  return permission.name ?? permission.codename ?? `Permission #${getPermissionId(permission) ?? '—'}`;
}

function roleLabel(role) {
  return role.name ?? role.title ?? `Role #${getRoleId(role) ?? '—'}`;
}

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingRole, setSavingRole] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [permissionQuery, setPermissionQuery] = useState('');
  const [roleQuery, setRoleQuery] = useState('');

  const [roleForm, setRoleForm] = useState({
    id: null,
    name: '',
    permissions: [],
  });

  const [userIdInput, setUserIdInput] = useState('');
  const [userRoles, setUserRoles] = useState([]);
  const [assignmentRoleIds, setAssignmentRoleIds] = useState([]);

  const permissionMap = useMemo(() => {
    const m = new Map();
    permissions.forEach((p) => {
      const id = getPermissionId(p);
      if (id != null) m.set(Number(id), p);
    });
    return m;
  }, [permissions]);

  const roleMap = useMemo(() => {
    const m = new Map();
    roles.forEach((r) => {
      const id = getRoleId(r);
      if (id != null) m.set(Number(id), r);
    });
    return m;
  }, [roles]);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        rolesApi.getRoles({ limit: 200 }),
        rolesApi.getPermissions({ limit: 500 }),
      ]);
      setRoles(normalizeList(rolesRes.data, ['roles']));
      setPermissions(normalizeList(permissionsRes.data, ['permissions']));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load roles and permissions.');
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetRoleForm = () => {
    setRoleForm({ id: null, name: '', permissions: [] });
  };

  const submitRole = async (e) => {
    e.preventDefault();
    setError('');
    const name = roleForm.name.trim();
    if (!name) {
      setError('Role name is required.');
      return;
    }
    setSavingRole(true);
    try {
      const payload = {
        name,
        permissions: roleForm.permissions.map((p) => Number(p)),
      };
      if (roleForm.id != null) {
        await rolesApi.updateRole(roleForm.id, payload);
      } else {
        await rolesApi.createRole(payload);
      }
      resetRoleForm();
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to save role.');
    } finally {
      setSavingRole(false);
    }
  };

  const allPermissionIds = useMemo(
    () =>
      permissions
        .map((p) => Number(getPermissionId(p)))
        .filter((id) => !isNaN(id)),
    [permissions]
  );

  const allRoleIds = useMemo(
    () =>
      roles
        .map((r) => Number(getRoleId(r)))
        .filter((id) => !isNaN(id)),
    [roles]
  );

  const filteredPermissions = useMemo(() => {
    const q = permissionQuery.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((p) => {
      const name = String(permissionLabel(p) ?? '').toLowerCase();
      const codename = String(p?.codename ?? '').toLowerCase();
      return name.includes(q) || codename.includes(q);
    });
  }, [permissions, permissionQuery]);

  const filteredRoles = useMemo(() => {
    const q = roleQuery.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => String(roleLabel(r)).toLowerCase().includes(q));
  }, [roles, roleQuery]);

  const editRole = (role) => {
    const permissionsList = normalizeList(role?.permissions, ['permissions']);
    const permissionIds = permissionsList.length
      ? permissionsList.map((p) => Number(getPermissionId(p))).filter((v) => !isNaN(v))
      : Array.isArray(role?.permissions)
        ? role.permissions.map((p) => Number(typeof p === 'object' ? getPermissionId(p) : p)).filter((v) => !isNaN(v))
        : [];
    setRoleForm({
      id: getRoleId(role),
      name: role.name ?? '',
      permissions: permissionIds,
    });
  };

  const removeRole = async (role) => {
    const id = getRoleId(role);
    if (id == null) return;
    const ok = window.confirm(`Delete role "${roleLabel(role)}"?`);
    if (!ok) return;
    setError('');
    try {
      await rolesApi.deleteRole(id);
      if (roleForm.id === id) resetRoleForm();
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to delete role.');
    }
  };

  const loadUserRoles = async () => {
    setError('');
    const userId = Number(userIdInput);
    if (!userId) {
      setError('Enter a valid user ID.');
      return;
    }
    setSavingAssignment(true);
    try {
      const res = await rolesApi.getUserRoles(userId);
      const assigned = normalizeList(res.data, ['roles']);
      setUserRoles(assigned);
      const ids = assigned
        .map((r) => Number(typeof r === 'object' ? getRoleId(r) : r))
        .filter((v) => !isNaN(v));
      setAssignmentRoleIds(ids);
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to load user roles.');
      setUserRoles([]);
      setAssignmentRoleIds([]);
    } finally {
      setSavingAssignment(false);
    }
  };

  const saveUserRoles = async () => {
    setError('');
    const userId = Number(userIdInput);
    if (!userId) {
      setError('Enter a valid user ID.');
      return;
    }
    setSavingAssignment(true);
    try {
      await rolesApi.assignUserRoles(userId, { roles: assignmentRoleIds.map((id) => Number(id)) });
      await loadUserRoles();
    } catch (err) {
      setError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to assign user roles.');
      setSavingAssignment(false);
    }
  };

  return (
    <div className="roles-page">
      <div className="page-header">
        <h1>Roles & Permissions</h1>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p>Loading roles and permissions...</p>
      ) : (
        <>
          <section className="roles-grid">
            <div className="roles-card">
              <h3>{roleForm.id != null ? 'Edit Role' : 'Create Role'}</h3>
              <form className="role-form" onSubmit={submitRole}>
                <div className="form-group">
                  <label htmlFor="role-name">Role name</label>
                  <input
                    id="role-name"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Receptionist"
                  />
                </div>
                <div className="form-group">
                  <label>Permissions</label>
                  <p className="helper-text">
                    {roleForm.permissions.length} selected of {allPermissionIds.length}
                  </p>
                  <div className="bulk-actions">
                    <button
                      type="button"
                      className="btn-bulk"
                      onClick={() => setRoleForm((prev) => ({ ...prev, permissions: allPermissionIds }))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="btn-bulk btn-bulk-clear"
                      onClick={() => setRoleForm((prev) => ({ ...prev, permissions: [] }))}
                    >
                      Clear all
                    </button>
                  </div>
                  <input
                    type="text"
                    value={permissionQuery}
                    onChange={(e) => setPermissionQuery(e.target.value)}
                    placeholder="Search permissions..."
                    className="list-search-input"
                  />
                  <div className="checkbox-grid">
                    {filteredPermissions.map((p) => {
                      const pid = Number(getPermissionId(p));
                      const checked = roleForm.permissions.includes(pid);
                      return (
                        <label key={pid} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setRoleForm((prev) => ({
                                ...prev,
                                permissions: e.target.checked
                                  ? [...prev.permissions, pid]
                                  : prev.permissions.filter((id) => id !== pid),
                              }));
                            }}
                          />
                          <span>{permissionLabel(p)}</span>
                        </label>
                      );
                    })}
                    {filteredPermissions.length === 0 && <p className="list-empty">No permissions match your search.</p>}
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" disabled={savingRole}>
                    {savingRole ? 'Saving…' : roleForm.id != null ? 'Update Role' : 'Create Role'}
                  </button>
                  {roleForm.id != null && (
                    <button type="button" className="btn-cancel" onClick={resetRoleForm}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="roles-card">
              <h3>Assign Roles To User</h3>
              <div className="assign-row">
                <input
                  type="number"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  placeholder="User ID"
                  min="1"
                />
                <button type="button" onClick={loadUserRoles} disabled={savingAssignment}>
                  {savingAssignment ? 'Loading…' : 'Load'}
                </button>
                <button type="button" onClick={saveUserRoles} disabled={savingAssignment || !userIdInput}>
                  {savingAssignment ? 'Saving…' : 'Assign'}
                </button>
              </div>

              <div className="checkbox-grid">
                <div className="bulk-actions">
                  <button
                    type="button"
                    className="btn-bulk"
                    onClick={() => setAssignmentRoleIds(allRoleIds)}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="btn-bulk btn-bulk-clear"
                    onClick={() => setAssignmentRoleIds([])}
                  >
                    Clear all
                  </button>
                </div>
                <input
                  type="text"
                  value={roleQuery}
                  onChange={(e) => setRoleQuery(e.target.value)}
                  placeholder="Search roles..."
                  className="list-search-input"
                />
                <p className="helper-text helper-text--tight">
                  {assignmentRoleIds.length} selected of {allRoleIds.length}
                </p>
                {filteredRoles.map((r) => {
                  const rid = Number(getRoleId(r));
                  const checked = assignmentRoleIds.includes(rid);
                  return (
                    <label key={rid} className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setAssignmentRoleIds((prev) =>
                            e.target.checked ? [...prev, rid] : prev.filter((id) => id !== rid)
                          );
                        }}
                      />
                      <span>{roleLabel(r)}</span>
                    </label>
                  );
                })}
                {filteredRoles.length === 0 && <p className="list-empty">No roles match your search.</p>}
              </div>

              {userRoles.length > 0 && (
                <p className="assign-meta">
                  Current user roles:{' '}
                  {userRoles
                    .map((r) => {
                      const id = Number(typeof r === 'object' ? getRoleId(r) : r);
                      return roleLabel(roleMap.get(id) ?? r);
                    })
                    .join(', ')}
                </p>
              )}
            </div>
          </section>

          <section className="roles-table-wrap">
            <h3>Roles</h3>
            <table className="roles-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No roles found.</td>
                  </tr>
                ) : (
                  roles.map((role) => {
                    const id = getRoleId(role);
                    const perms = normalizeList(role?.permissions, ['permissions']);
                    const permNames =
                      perms.length > 0
                        ? perms.map((p) => permissionLabel(p)).join(', ')
                        : Array.isArray(role.permissions)
                          ? role.permissions
                              .map((pid) => {
                                const p = permissionMap.get(Number(typeof pid === 'object' ? getPermissionId(pid) : pid));
                                return p ? permissionLabel(p) : `#${typeof pid === 'object' ? getPermissionId(pid) : pid}`;
                              })
                              .join(', ')
                          : '—';
                    return (
                      <tr key={id ?? role.name}>
                        <td>{id ?? '—'}</td>
                        <td>{roleLabel(role)}</td>
                        <td>
                          <div className="permissions-cell-scroll">{permNames || '—'}</div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="btn-edit" onClick={() => editRole(role)}>
                              Edit
                            </button>
                            <button type="button" className="btn-delete" onClick={() => removeRole(role)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>

          <section className="roles-table-wrap permissions-table-wrap">
            <h3>Permissions</h3>
            <table className="roles-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Codename</th>
                </tr>
              </thead>
              <tbody>
                {permissions.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No permissions found.</td>
                  </tr>
                ) : (
                  permissions.map((p) => (
                    <tr key={getPermissionId(p) ?? p.name}>
                      <td>{getPermissionId(p) ?? '—'}</td>
                      <td>{p.name ?? '—'}</td>
                      <td>{p.codename ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

