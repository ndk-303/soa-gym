import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const usersApi = {
  getAll: () => apiClient.get('/users/'),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (data) => apiClient.post('/users/', data),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
}

export const plansApi = {
  getAll: () => apiClient.get('/membership-plans/'),
  getById: (id) => apiClient.get(`/membership-plans/${id}`),
  create: (data) => apiClient.post('/membership-plans/', data),
  update: (id, data) => apiClient.put(`/membership-plans/${id}`, data),
  delete: (id) => apiClient.delete(`/membership-plans/${id}`),
}

export const membersApi = {
  getAll: () => apiClient.get('/members/'),
  getById: (id) => apiClient.get(`/members/${id}`),
  create: (data) => apiClient.post('/members/', data),
  update: (id, data) => apiClient.put(`/members/${id}`, data),
  delete: (id) => apiClient.delete(`/members/${id}`),
}

export const classesApi = {
  getAll: () => apiClient.get('/gym-classes/'),
  getById: (id) => apiClient.get(`/gym-classes/${id}`),
  create: (data) => apiClient.post('/gym-classes/', data),
  update: (id, data) => apiClient.put(`/gym-classes/${id}`, data),
  delete: (id) => apiClient.delete(`/gym-classes/${id}`),
}

export const slotsApi = {
  getAll: () => apiClient.get('/class-slots/'),
  getById: (id) => apiClient.get(`/class-slots/${id}`),
  create: (data) => apiClient.post('/class-slots/', data),
  update: (id, data) => apiClient.put(`/class-slots/${id}`, data),
  delete: (id) => apiClient.delete(`/class-slots/${id}`),
}

export const bookingsApi = {
  getAll: () => apiClient.get('/bookings/'),
  getById: (id) => apiClient.get(`/bookings/${id}`),
  create: (data) => apiClient.post('/bookings/', data),
  update: (id, data) => apiClient.put(`/bookings/${id}`, data),
  delete: (id) => apiClient.delete(`/bookings/${id}`),
}

export const invoicesApi = {
  getAll: () => apiClient.get('/invoices/'),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices/', data),
  update: (id, data) => apiClient.put(`/invoices/${id}`, data),
  delete: (id) => apiClient.delete(`/invoices/${id}`),
}

export const paymentsApi = {
  getAll: () => apiClient.get('/payments/'),
  getById: (id) => apiClient.get(`/payments/${id}`),
  create: (data) => apiClient.post('/payments/', data),
  update: (id, data) => apiClient.put(`/payments/${id}`, data),
  delete: (id) => apiClient.delete(`/payments/${id}`),
}

export const attendanceApi = {
  getAll: () => apiClient.get('/attendance/'),
  getById: (id) => apiClient.get(`/attendance/${id}`),
  create: (data) => apiClient.post('/attendance/', data),
  update: (id, data) => apiClient.put(`/attendance/${id}`, data),
  delete: (id) => apiClient.delete(`/attendance/${id}`),
}

export default apiClient
