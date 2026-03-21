import apiClient from '../client';

/**
 * Appointments API - GET /api/appointments/
 * Schema: { patient, dentist, date, time, status, notes }
 */
export const appointmentsApi = {
  getAll: (params = {}) => apiClient.get('/appointments/', { params }),
  getById: (id) => apiClient.get(`/appointments/${id}/`),
  create: (data) => apiClient.post('/appointments/', data),
  update: (id, data) => apiClient.put(`/appointments/${id}/`, data),
  getSlots: (params = {}) => apiClient.get('/appointments/slots/', { params }),
};
