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
  // restaurants
  listRestaurants: (q = '') => request(`/restaurants${q ? `?q=${encodeURIComponent(q)}` : ''}`, { auth: false }),
  getRestaurant: (id) => request(`/restaurants/${id}`, { auth: false }),
  createRestaurant: (data) => request('/restaurants', { method: 'POST', body: data }),
  addMenuItem: (id, item) => request(`/restaurants/${id}/menu`, { method: 'POST', body: item }),
  myRestaurants: () => request('/restaurants/owner/mine'),
  // orders
  placeOrder: (data) => request('/orders', { method: 'POST', body: data }),
  myOrders: () => request('/orders/mine'),
  getOrder: (id) => request(`/orders/${id}`),
  incomingOrders: () => request('/orders/restaurant/incoming'),
  deliveryFeed: () => request('/orders/delivery/feed'),
  setStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  acceptDelivery: (id) => request(`/orders/${id}/accept-delivery`, { method: 'PATCH' }),
};
