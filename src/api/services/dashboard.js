import apiClient from '../client';

/**
 * Dashboard API - GET /api/dashboard/
 * Returns: { users, patients, appointments, invoices, daily_revenue, monthly_revenue, recent_appointments }
 */
export const dashboardApi = {
  getData: () => apiClient.get('/dashboard/'),
};
