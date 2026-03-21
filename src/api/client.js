import axios from 'axios';
import { apiConfig } from './config';
import { tokenStorage } from './tokenStorage';
import { authApi } from './services/auth';

const apiClient = axios.create({
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  headers: apiConfig.headers,
});

// Request interceptor - add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track refresh in progress to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (token ? prom.resolve(token) : prom.reject(error)));
  failedQueue = [];
};

const isTokenExpiredError = (error) => {
  const data = error.response?.data;
  if (error.response?.status !== 401) return false;
  const code = data?.code ?? data?.error;
  const detail = typeof data?.detail === 'string' ? data.detail : '';
  const messages = data?.messages ?? [];
  return (
    code === 'token_not_valid' ||
    detail?.toLowerCase().includes('token') ||
    messages.some((m) => (m.message ?? '').toLowerCase().includes('expired'))
  );
};

// Response interceptor - refresh token on expiry, retry request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!isTokenExpiredError(error)) {
      if (error.response?.status === 401) {
        tokenStorage.clear();
      }
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      tokenStorage.clear();
      return Promise.reject(error);
    }

    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
      tokenStorage.clear();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const res = await authApi.refreshToken(refreshToken);
      const access = res.data?.access ?? res.data?.token;
      if (access) {
        tokenStorage.setTokens(access, refreshToken);
        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      }
      throw new Error('No access token in refresh response');
    } catch (refreshError) {
      processQueue(refreshError, null);
      tokenStorage.clear();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
