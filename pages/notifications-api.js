import { apiEnabled, apiRequest, getSession } from './api-client.js';

export const notificationApi = apiEnabled ? {
  getNotifications: ({ page }) => apiRequest(`/notifications?page=${page}`),
  getUnreadCount: () => apiRequest('/notifications/unread-count'),
  readNotification: id => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  readAllNotifications: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
} : mockActivity;

export function subscribeToNotifications(onNotification) {
  if (!apiEnabled) return () => {};
  const origin = document.querySelector('meta[name="nubi-api-origin"]').content.trim().replace(/\/+$/, '');
  let source;
  let retry;
  let stopped = false;

  function connect() {
    const token = getSession()?.accessToken;
    if (stopped || !token) return;
    const url = new URL(origin + '/api/v1/notifications/stream', location.origin);
    url.searchParams.set('token', token);
    source = new EventSource(url);
    source.addEventListener('connect', onNotification);
    source.addEventListener('notification', onNotification);
    source.onerror = () => {
      source.close();
      retry = setTimeout(async () => {
        try {
          await notificationApi.getUnreadCount();
        } catch {
          // The next connection attempt can recover after a temporary outage.
        }
        connect();
      }, 5000);
    };
  }

  connect();
  return () => {
    stopped = true;
    clearTimeout(retry);
    source?.close();
  };
}
