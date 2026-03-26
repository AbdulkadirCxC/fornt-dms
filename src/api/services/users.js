import apiClient from '../client';

/**
 * Users API.
 * Primary endpoint: GET /api/users/
 */
export const usersApi = {
  getAll: (params = {}) => apiClient.get('/users/', { params }),
  update: (id, payload, config = {}) => apiClient.patch(`/users/${id}/`, payload, config),
  remove: (id) => apiClient.delete(`/users/${id}/`),
};

