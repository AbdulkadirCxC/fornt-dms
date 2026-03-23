import apiClient from '../client';

/**
 * Roles & permissions endpoints.
 * - /api/roles/
 * - /api/permissions/
 * - /api/users/{id}/roles/
 */
export const rolesApi = {
  getRoles: (params = {}) => apiClient.get('/roles/', { params }),
  getRoleById: (id) => apiClient.get(`/roles/${id}/`),
  createRole: (data) => apiClient.post('/roles/', data),
  updateRole: (id, data) => apiClient.patch(`/roles/${id}/`, data),
  deleteRole: (id) => apiClient.delete(`/roles/${id}/`),
  getPermissions: (params = {}) => apiClient.get('/permissions/', { params }),
  getUserRoles: (userId) => apiClient.get(`/users/${userId}/roles/`),
  assignUserRoles: (userId, data) => apiClient.post(`/users/${userId}/roles/`, data),
};

