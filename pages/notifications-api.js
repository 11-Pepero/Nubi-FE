import { apiEnabled, apiRequest } from './api-client.js';

export const notificationApi = apiEnabled ? {
  getNotifications: ({ page }) => apiRequest(`/notifications?page=${page}`),
  getUnreadCount: () => apiRequest('/notifications/unread-count'),
  readNotification: id => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
} : mockActivity;
