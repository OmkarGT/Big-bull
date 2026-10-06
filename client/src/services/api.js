import axios from 'axios';

/**
 * Every backend call in the app goes through this single axios instance.
 * The base URL comes from VITE_API_URL so nothing is hardcoded in components.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach the JWT to every outgoing request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Pull a readable message out of an axios error. */
function extractMessage(error) {
  return (
    error?.response?.data?.message ||
    (error?.code === 'ECONNABORTED'
      ? 'The server took too long to respond.'
      : null) ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

/** Throw a plain Error carrying the backend's message. */
function rethrow(error) {
  if (error?.response?.status === 401) {
    localStorage.removeItem('bb_token');
  }
  throw new Error(extractMessage(error));
}

export const authApi = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data).catch(rethrow),
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data).catch(rethrow),
  logout: () => api.post('/auth/logout').then((r) => r.data).catch(rethrow),
  me: () => api.get('/auth/me').then((r) => r.data).catch(rethrow),
};

export const userApi = {
  getProfile: () => api.get('/users/profile').then((r) => r.data).catch(rethrow),
  updateProfile: (payload) => api.put('/users/profile', payload).then((r) => r.data).catch(rethrow),
  resetCapital: (capital) =>
    api.post('/users/reset-capital', { capital }).then((r) => r.data).catch(rethrow),
};

export const stockApi = {
  list: () => api.get('/stocks').then((r) => r.data).catch(rethrow),
  get: (id) => api.get(`/stocks/${id}`).then((r) => r.data).catch(rethrow),
  history: (id, limit = 60) =>
    api.get(`/stocks/${id}/history`, { params: { limit } }).then((r) => r.data).catch(rethrow),
};

export const tradeApi = {
  portfolio: () => api.get('/portfolio').then((r) => r.data).catch(rethrow),
  trades: (limit = 50) => api.get('/trades', { params: { limit } }).then((r) => r.data).catch(rethrow),
  buy: (stockId, quantity) =>
    api.post('/trades/buy', { stockId, quantity }).then((r) => r.data).catch(rethrow),
  sell: (stockId, quantity) =>
    api.post('/trades/sell', { stockId, quantity }).then((r) => r.data).catch(rethrow),
};
