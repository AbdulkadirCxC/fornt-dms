import axios from 'axios';
import { apiConfig } from '../config';

const authAxios = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: apiConfig.headers,
});

/**
 * Auth API - POST /api/auth/token/
 * Body: { username, password }
 * Returns: { access, refresh } or { token, refresh_token } etc.
 */
export const authApi = {
  getToken: (credentials) => authAxios.post('/auth/token/', credentials),
  // POST /api/auth/token/refresh/ or /api/token/refresh/ - body: { refresh }
  refreshToken: (refresh) => authAxios.post('/auth/token/refresh/', { refresh }),
  /** POST /api/auth/register/ — body: { username, email?, password, password_confirm } */
  register: (payload) => authAxios.post('/auth/register/', payload),
};
