import apiClient from '../client';

/**
 * Clinic queue — GET/POST /api/queue-tickets/, PATCH /queue-tickets/:id/
 * POST /api/queue-tickets/call-next/ — body: { dentist, queue_date? }
 */
export const queueTicketsApi = {
  getAll: (params = {}) => apiClient.get('/queue-tickets/', { params }),
  getById: (id) => apiClient.get(`/queue-tickets/${id}/`),
  create: (data) => apiClient.post('/queue-tickets/', data),
  patch: (id, data) => apiClient.patch(`/queue-tickets/${id}/`, data),
  /** Next waiting ticket → called */
  callNext: (data) => apiClient.post('/queue-tickets/call-next/', data),
};
