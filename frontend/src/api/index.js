import axios from 'axios';

// Create an axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enable request debugging in development
const isDebugMode = import.meta.env.VITE_DEBUG_API === 'true';

// Add request interceptor to inject auth token for authenticated requests
api.interceptors.request.use(
  (config) => {
    // Log request details in debug mode
    if (isDebugMode) {
      console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`, config.data || config.params);
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle common error patterns
api.interceptors.response.use(
  (response) => {
    // Log response in debug mode
    if (isDebugMode) {
      console.log(`API Response: ${response.config.method.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // Log error details in debug mode
    if (isDebugMode) {
      console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.response?.data || error.message);
    }
    
    // Handle 401 Unauthorized errors by logging out the user
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API functions
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  validateToken: () => api.get('/auth/validate'),
  logout: () => api.post('/auth/logout'),
};

// Items API functions
export const itemsAPI = {
  getAll: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  create: (itemData) => api.post('/items', itemData),
  update: (id, itemData) => api.put(`/items/${id}`, itemData),
  delete: (id) => api.delete(`/items/${id}`),
  getLowStock: () => api.get('/items/low-stock'),
};

// Warehouses API functions
export const warehousesAPI = {
  getAll: (params) => api.get('/warehouses', { params }),
  getById: (id) => api.get(`/warehouses/${id}`),
  create: (warehouseData) => api.post('/warehouses', warehouseData),
  update: (id, warehouseData) => api.put(`/warehouses/${id}`, warehouseData),
  delete: (id) => api.delete(`/warehouses/${id}`),
};

// Compartments API functions
export const compartmentsAPI = {
  getAll: (params) => api.get('/compartments', { params }),
  getById: (id) => api.get(`/compartments/${id}`),
  create: (compartmentData) => api.post('/compartments', compartmentData),
  update: (id, compartmentData) => api.put(`/compartments/${id}`, compartmentData),
  delete: (id) => api.delete(`/compartments/${id}`),
  getByWarehouse: (warehouseId) => api.get(`/warehouses/${warehouseId}/compartments`),
  getAvailable: () => api.get('/compartments/available'),
};

// Optimization API functions
export const optimizationAPI = {
  assignCompartments: (data) => api.post('/optimization/assign-compartments', data),
  applyAssignments: (data) => api.post('/optimization/apply-assignments', data),
  assignTempItems: (data) => api.post('/optimization/assign-temp-items', data),
  getRestockRecommendations: (data) => api.post('/optimization/restock', data),
};

export default api; 