import { apiEnabled, apiRequest, getSession } from './api-client.js';

export async function getApplications() {
  if (!apiEnabled) return mockActivity.getApplications();
  if (!getSession()) return [];
  const applications = [];
  for (let page = 0; ; page += 1) {
    const response = await apiRequest(`/applications?page=${page}&size=100`);
    applications.push(...response.content.map(item => ({
      ...item,
      organizerName: item.hostName,
      applicationUrl: item.applyUrl,
      canApplyDirectly: item.applyMethod === 'DIRECT',
    })));
    if (page + 1 >= response.totalPages) return applications;
  }
}

export function markApplicationReceived(id) {
  if (!apiEnabled) return mockActivity.markApplicationReceived(id);
  return apiRequest(`/applications/${id}/submitted`, { method: 'PATCH' });
}

export async function prepareApplication({ received, ...body }, direct) {
  if (!apiEnabled) return mockActivity.prepareApplication({ ...body, received });
  if (direct) {
    const { programId, ...details } = body;
    return apiRequest(`/programs/${programId}/applications`, { method: 'POST', body: details });
  }
  const prepared = await apiRequest('/applications/prepare', { method: 'POST', body });
  if (received) await markApplicationReceived(prepared.application.applicationId);
  return prepared;
}
