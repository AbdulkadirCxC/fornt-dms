import apiClient from '../client';

/**
 * Users API.
 * Primary endpoint: GET /api/users/
 */
export const usersApi = {
  getAll: (params = {}) => apiClient.get('/users/', { params }),
  update: (id, payload) => apiClient.patch(`/users/${id}/`, payload),
  remove: (id) => apiClient.delete(`/users/${id}/`),
};

