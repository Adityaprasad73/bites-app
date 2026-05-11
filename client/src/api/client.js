const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // auth
  register: (data) => request('/auth/register', { method: 'POST', body: data, auth: false }),
  login: (data) => request('/auth/login', { method: 'POST', body: data, auth: false }),
  me: () => request('/auth/me'),
  toggleOnline: () => request('/auth/toggle-online', { method: 'PATCH' }),
  updateProfile: (data) => request('/auth/profile', { method: 'PATCH', body: data }),

  // restaurants
  listRestaurants: (q = '') => request(`/restaurants${q ? `?q=${encodeURIComponent(q)}` : ''}`, { auth: false }),
  getRestaurant: (id) => request(`/restaurants/${id}`, { auth: false }),
  createRestaurant: (data) => request('/restaurants', { method: 'POST', body: data }),
  addMenuItem: (id, item) => request(`/restaurants/${id}/menu`, { method: 'POST', body: item }),
  myRestaurants: () => request('/restaurants/owner/mine'),
  toggleRestaurantOpen: (id) => request(`/restaurants/${id}/toggle-open`, { method: 'PATCH' }),

  // orders
  placeOrder: (data) => request('/orders', { method: 'POST', body: data }),
  myOrders: () => request('/orders/mine'),
  getOrder: (id) => request(`/orders/${id}`),
  incomingOrders: () => request('/orders/restaurant/incoming'),
  deliveryFeed: () => request('/orders/delivery/feed'),
  deliveryHistory: () => request('/orders/delivery/history'),
  setStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  acceptDelivery: (id) => request(`/orders/${id}/accept-delivery`, { method: 'PATCH' }),
  rateOrder: (id, data) => request(`/orders/${id}/rate`, { method: 'PATCH', body: data }),
  getRestaurantAnalytics: (id) => request(`/orders/restaurant/${id}/analytics`),

  // payment (Razorpay)
  createPaymentOrder: (amount) => request('/payment/create-order', { method: 'POST', body: { amount } }),
  verifyPayment: (data) => request('/payment/verify', { method: 'POST', body: data }),

  // admin
  adminStats: () => request('/admin/stats'),
  adminUsers: () => request('/admin/users'),
  adminUpdateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PATCH', body: data }),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminRestaurants: () => request('/admin/restaurants'),
  adminUpdateRestaurant: (id, data) => request(`/admin/restaurants/${id}`, { method: 'PATCH', body: data }),
  adminDeleteRestaurant: (id) => request(`/admin/restaurants/${id}`, { method: 'DELETE' }),
  adminOrders: (status = '') => request(`/admin/orders${status ? `?status=${status}` : ''}`),
};
