import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token to all requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gym_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-handle 401 Unauthorized (expired or invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || ''
      if (!url.includes('/login')) {
        localStorage.removeItem('gym_token')
        localStorage.removeItem('gym_user')
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/'
        }
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (credentials) => apiClient.post('/api/users/login', credentials),
  getMe: () => apiClient.get('/api/auth/me'),
}


export const usersApi = {
  getAll: () => apiClient.get('/users'),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
}

export const plansApi = {
  getAll: () => apiClient.get('/membership-plans'),
  getById: (id) => apiClient.get(`/membership-plans/${id}`),
  create: (data) => apiClient.post('/membership-plans', data),
  update: (id, data) => apiClient.put(`/membership-plans/${id}`, data),
  delete: (id) => apiClient.delete(`/membership-plans/${id}`),
}

export const membersApi = {
  getAll: () => apiClient.get('/members'),
  getDetailed: () => apiClient.get('/api/composite/members'),
  getById: (id) => apiClient.get(`/members/${id}`),
  create: (data) => apiClient.post('/members', data),
  update: (id, data) => apiClient.put(`/members/${id}`, data),
  delete: (id) => apiClient.delete(`/members/${id}`),
}

export const classesApi = {
  getAll: () => apiClient.get('/gym-classes'),
  getDetailed: () => apiClient.get('/api/composite/classes'),
  getById: (id) => apiClient.get(`/gym-classes/${id}`),
  create: (data) => apiClient.post('/gym-classes', data),
  update: (id, data) => apiClient.put(`/gym-classes/${id}`, data),
  delete: (id) => apiClient.delete(`/gym-classes/${id}`),
}

export const slotsApi = {
  getAll: () => apiClient.get('/class-slots'),
  getDetailed: () => apiClient.get('/api/composite/slots'),
  getById: (id) => apiClient.get(`/class-slots/${id}`),
  create: (data) => apiClient.post('/class-slots', data),
  update: (id, data) => apiClient.put(`/class-slots/${id}`, data),
  delete: (id) => apiClient.delete(`/class-slots/${id}`),
}

export const bookingsApi = {
  getAll: () => apiClient.get('/bookings'),
  getDetailed: () => apiClient.get('/api/composite/bookings'),
  getById: (id) => apiClient.get(`/bookings/${id}`),
  create: (data) => apiClient.post('/bookings', data),
  update: (id, data) => apiClient.put(`/bookings/${id}`, data),
  delete: (id) => apiClient.delete(`/bookings/${id}`),
}

export const invoicesApi = {
  getAll: () => apiClient.get('/invoices'),
  getDetailed: () => apiClient.get('/api/composite/invoices'),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
  update: (id, data) => apiClient.put(`/invoices/${id}`, data),
  delete: (id) => apiClient.delete(`/invoices/${id}`),
}

export const paymentsApi = {
  getAll: () => apiClient.get('/payments'),
  getDetailed: () => apiClient.get('/api/composite/payments'),
  getById: (id) => apiClient.get(`/payments/${id}`),
  create: (data) => apiClient.post('/payments', data),
  update: (id, data) => apiClient.put(`/payments/${id}`, data),
  delete: (id) => apiClient.delete(`/payments/${id}`),
}

export const attendanceApi = {
  getAll: () => apiClient.get('/attendance'),
  getDetailed: () => apiClient.get('/api/composite/attendance'),
  getById: (id) => apiClient.get(`/attendance/${id}`),
  create: (data) => apiClient.post('/attendance', data),
  update: (id, data) => apiClient.put(`/attendance/${id}`, data),
  delete: (id) => apiClient.delete(`/attendance/${id}`),
}

export const compositeApi = {
  getBookings: () => apiClient.get('/api/composite/bookings'),
  getInvoices: () => apiClient.get('/api/composite/invoices'),
  getPayments: () => apiClient.get('/api/composite/payments'),
  getAttendance: () => apiClient.get('/api/composite/attendance'),
  getClasses: () => apiClient.get('/api/composite/classes'),
  getMembers: () => apiClient.get('/api/composite/members'),
  getSlots: () => apiClient.get('/api/composite/slots'),
}

export default apiClient

