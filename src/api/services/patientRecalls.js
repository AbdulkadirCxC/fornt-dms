import apiClient from '../client';

/**
 * Patient Recalls API - /api/patient-recalls/
 */
export const patientRecallsApi = {
  getAll: (params = {}) => apiClient.get('/patient-recalls/', { params }),
  getById: (id) => apiClient.get(`/patient-recalls/${id}/`),
  create: (data) => apiClient.post('/patient-recalls/', data),
  update: (id, data) => apiClient.patch(`/patient-recalls/${id}/`, data),
  delete: (id) => apiClient.delete(`/patient-recalls/${id}/`),
};

