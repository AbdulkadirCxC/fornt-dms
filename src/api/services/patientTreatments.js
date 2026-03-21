import apiClient from '../client';

/**
 * Patient Treatments API - GET /api/patient-treatments/
 * Schema: { patient, treatment, dentist, date, cost_override }
 */
export const patientTreatmentsApi = {
  getAll: (params = {}) => apiClient.get('/patient-treatments/', { params }),
  getById: (id) => apiClient.get(`/patient-treatments/${id}/`),
  create: (data) => apiClient.post('/patient-treatments/', data),
  update: (id, data) => apiClient.put(`/patient-treatments/${id}/`, data),
  delete: (id) => apiClient.delete(`/patient-treatments/${id}/`),
};
