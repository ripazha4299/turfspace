const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// Multipart uploads bypass the JSON request() helper above -- the browser sets
// its own multipart Content-Type boundary, so we must not set it manually.
async function uploadRequest(path, formData, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Upload failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  googleAuth: (credential) => request('/auth/google', { method: 'POST', body: { credential } }),

  me: (token) => request('/users/me', { token }),
  updateMe: (payload, token) => request('/users/me', { method: 'PUT', body: payload, token }),
  myBookings: (token) => request('/users/me/bookings', { token }),
  publicProfile: (id, token) => request(`/users/${id}/public-profile`, { token }),

  activeCampaigns: (params) => request(`/campaigns/active?${new URLSearchParams(params)}`),
  myCampaigns: (token) => request('/campaigns/mine', { token }),
  createCampaign: (payload, token) => request('/campaigns', { method: 'POST', body: payload, token }),
  updateCampaign: (id, payload, token) => request(`/campaigns/${id}`, { method: 'PUT', body: payload, token }),

  conversations: (token) => request('/messages/conversations', { token }),
  unreadMessageCount: (token) => request('/messages/unread-count', { token }),
  messagesWith: (userId, token) => request(`/messages/with/${userId}`, { token }),
  sendMessage: (recipient_id, content, token) =>
    request('/messages', { method: 'POST', body: { recipient_id, content }, token }),

  searchTurfs: (params) => request(`/turfs?${new URLSearchParams(params)}`),
  getTurf: (id) => request(`/turfs/${id}`),
  getAvailability: (id, date) => request(`/turfs/${id}/availability?date=${date}`),
  createTurf: (payload, token) => request('/turfs', { method: 'POST', body: payload, token }),
  updateTurf: (id, payload, token) => request(`/turfs/${id}`, { method: 'PUT', body: payload, token }),
  myTurfs: (token) => request('/turfs/owner/mine', { token }),
  uploadSingleImage: (file, token) => {
    const fd = new FormData();
    fd.append('image', file);
    return uploadRequest('/uploads/single', fd, token);
  },
  uploadMultipleImages: (files, token) => {
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('images', f));
    return uploadRequest('/uploads/multiple', fd, token);
  },

  createBooking: (payload, token) => request('/bookings', { method: 'POST', body: payload, token }),
  payBooking: (id, token) => request(`/bookings/${id}/pay`, { method: 'POST', token }),
  leaveBooking: (id, token) => request(`/bookings/${id}/leave`, { method: 'POST', token }),
  openBookings: (params) => request(`/bookings/open?${new URLSearchParams(params)}`),
  joinBooking: (id, token) => request(`/bookings/${id}/join`, { method: 'POST', token }),
  getBooking: (id) => request(`/bookings/${id}`),
  cancelBooking: (id, token) => request(`/bookings/${id}/cancel`, { method: 'POST', token }),
  ownerCalendar: (token) => request('/bookings/owner/calendar', { token }),
  ownerBookingDetail: (id, token) => request(`/bookings/${id}/owner-detail`, { token }),
  updateMaxPlayers: (id, max_players, token) =>
    request(`/bookings/${id}/max-players`, { method: 'PUT', body: { max_players }, token }),
  addParticipant: (id, email, token) =>
    request(`/bookings/${id}/participants`, { method: 'POST', body: { email }, token }),
  removeParticipant: (id, userId, token) =>
    request(`/bookings/${id}/participants/${userId}`, { method: 'DELETE', token }),
  ownerStats: (token) => request('/bookings/owner/stats', { token }),
  flagNoShow: (id, discount_pct, token) =>
    request(`/bookings/${id}/no-show`, { method: 'POST', body: { discount_pct }, token }),
  noShowDeals: (params) => request(`/bookings/deals/no-show?${new URLSearchParams(params)}`),

  notifications: (token) => request('/notifications', { token }),
  markNotificationRead: (id, token) => request(`/notifications/${id}/read`, { method: 'POST', token }),
  markAllNotificationsRead: (token) => request('/notifications/read-all', { method: 'POST', token }),
};
