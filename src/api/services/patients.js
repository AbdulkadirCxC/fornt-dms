import apiClient from '../client';

/**
 * Patients API - GET /api/patients/
 * Schema: { full_name, gender, date_of_birth, phone }
 */
export const patientsApi = {
  getAll: (params = {}) => apiClient.get('/patients/', { params }),
  getById: (id) => apiClient.get(`/patients/${id}/`),
  create: (data) => apiClient.post('/patients/', data),
  update: (id, data) => apiClient.put(`/patients/${id}/`, data),
  delete: (id) => apiClient.delete(`/patients/${id}/`),
};
