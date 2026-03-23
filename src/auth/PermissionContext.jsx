import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { rolesApi, usersApi } from '../api/services';
import { AUTH_STATE_EVENT, tokenStorage } from '../api/tokenStorage';

const PermissionContext = createContext({
  loading: false,
  permissions: new Set(),
  isSuperuser: false,
  hasAnyPermission: () => true,
});

function normalizeList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of ['results', 'data', 'items', ...keys]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function normalizeCode(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractTokenPermissions(payload) {
  if (!payload) return [];
  const raw = payload.permissions ?? payload.perms ?? payload.scope ?? [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') return raw.split(/\s+/g).filter(Boolean);
  return [];
}

function extractUserId(payload) {
  const raw = payload?.user_id ?? payload?.id ?? payload?.sub;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [authRevision, setAuthRevision] = useState(0);

  useEffect(() => {
    const handleAuthStateChanged = () => setAuthRevision((v) => v + 1);
    const handleWindowFocus = () => setAuthRevision((v) => v + 1);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setAuthRevision((v) => v + 1);
      }
    };
    window.addEventListener(AUTH_STATE_EVENT, handleAuthStateChanged);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, handleAuthStateChanged);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const access = tokenStorage.getAccess();
    if (!access) {
      setPermissions(new Set());
      setIsSuperuser(false);
      setLoading(false);
      return;
    }

    const payload = decodeJwtPayload(access);
    const userId = extractUserId(payload);
    const tokenPermissions = extractTokenPermissions(payload);
    const initialSet = new Set(tokenPermissions.map(normalizeCode).filter(Boolean));
    const superFlag = Boolean(
      payload?.is_superuser ??
      payload?.isSuperuser ??
      payload?.superuser ??
      payload?.is_admin ??
      payload?.isAdmin
    );
    setIsSuperuser(superFlag);

    let cancelled = false;
    const loadPermissions = async () => {
      setLoading(true);
      try {
        const roleRes = userId ? await rolesApi.getUserRoles(userId) : null;
        const assignedRoles = normalizeList(roleRes?.data, ['roles']);
        const codenameSet = new Set(initialSet);
        const permissionIds = new Set();
        if (!superFlag && userId) {
          const usersRes = await usersApi.getAll({ limit: 500 });
          const users = normalizeList(usersRes.data, ['users']);
          const currentUser = users.find((u) => Number(u?.id ?? u?.user_id ?? u?.pk) === Number(userId));
          if (currentUser && !cancelled) {
            setIsSuperuser(Boolean(currentUser.is_superuser ?? currentUser.isSuperuser));
          }
        }

        assignedRoles.forEach((role) => {
          const perms = normalizeList(role?.permissions, ['permissions']);
          if (!Array.isArray(perms)) return;
          perms.forEach((p) => {
            if (typeof p === 'object') {
              if (p.codename) codenameSet.add(normalizeCode(p.codename));
              if (p.name) codenameSet.add(normalizeCode(p.name));
              const id = Number(p.id ?? p.permission_id ?? p.pk);
              if (!Number.isNaN(id)) permissionIds.add(id);
            } else {
              const id = Number(p);
              if (!Number.isNaN(id)) permissionIds.add(id);
            }
          });
        });

        if (permissionIds.size > 0) {
          const allPermsRes = await rolesApi.getPermissions({ limit: 1000 });
          const allPermissions = normalizeList(allPermsRes.data, ['permissions']);
          allPermissions.forEach((p) => {
            const id = Number(p?.id ?? p?.permission_id ?? p?.pk);
            if (!Number.isNaN(id) && permissionIds.has(id)) {
              if (p.codename) codenameSet.add(normalizeCode(p.codename));
              if (p.name) codenameSet.add(normalizeCode(p.name));
            }
          });
        }

        if (!cancelled) setPermissions(codenameSet);
      } catch {
        if (!cancelled) setPermissions(initialSet);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPermissions();
    return () => {
      cancelled = true;
    };
  }, [authRevision]);

  const value = useMemo(() => {
    const hasAnyPermission = (required = []) => {
      if (isSuperuser) return true;
      if (!required || required.length === 0) return true;
      for (const code of required) {
        if (permissions.has(normalizeCode(code))) return true;
      }
      return false;
    };
    return { loading, permissions, isSuperuser, hasAnyPermission };
  }, [loading, permissions, isSuperuser]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionContext);
}

