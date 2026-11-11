import { apiRequest } from './api-client.js';

export async function getEvents() {
  const events = [];
  for (let page = 0; ; page++) {
    const result = await apiRequest(`/events?page=${page}&size=100`);
    events.push(...result.content.map(event => ({
      ...event,
      status: event.status === 'ENDED' ? 'COMPLETED' : event.status === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      applicationsClosed: event.status === 'CLOSED',
    })));
    if (page + 1 >= result.totalPages) return events;
  }
}

export async function saveEvent(eventId, values) {
  if (values.applicationsClosed) return apiRequest(`/events/${eventId}/close`, { method: 'PATCH' });
  const location = values.venue.name;
  const venues = location ? await apiRequest(`/venues?keyword=${encodeURIComponent(location.slice(0, 50))}`) : null;
  const venue = venues?.content.find(item => item.name === location);
  if (location && !venue) throw new Error('서버에 등록된 장소 이름을 입력해 주세요.');
  const body = {
    title: values.title, startAt: values.startAt, endAt: values.endAt,
    capacity: values.capacity, venueId: venue?.venueId, description: values.notes,
    status: values.status === 'DRAFT' ? 'DRAFT' : 'OPEN',
  };
  return apiRequest(eventId == null ? '/events' : `/events/${eventId}`, {
    method: eventId == null ? 'POST' : 'PUT', body,
  });
}

function toApplicant(item) {
  const supports = item.supports ?? [];
  return {
    ...item,
    organization: item.organizationName,
    managerName: item.contact?.name ?? item.contactName,
    phone: item.contact?.phone ?? item.organizationPhone,
    appliedAt: item.submittedAt,
    status: item.status === 'SUBMITTED' ? 'NEW' : item.status,
    supportNeeds: supports.map(support => support.label),
    supportChecklist: supports.map(support => ({
      id: support.applicationSupportId, label: support.label, ready: support.prepStatus === 'READY',
    })),
    wheelchairCount: supports.find(support => support.code === 'WHEELCHAIR')?.quantity ?? 0,
    individualCareCount: item.careCount ?? item.cares?.length,
    individualCare: item.cares?.map(care => ({ name: care.alias, title: care.content })),
    replies: item.messages?.filter(message => message.fromHost).map(message => ({ message: message.body })),
    note: item.messages?.findLast(message => !message.fromHost)?.body,
  };
}

export async function getEventApplicants(eventId) {
  const entries = [];
  for (let page = 0; ; page++) {
    const { applications } = await apiRequest(`/events/${eventId}/applications?page=${page}&size=100`);
    entries.push(...applications.content.map(toApplicant));
    if (page + 1 >= applications.totalPages) return entries;
  }
}

export async function getEventApplicant(eventId, id) {
  return toApplicant(await apiRequest(`/events/${eventId}/applications/${id}`));
}

export async function saveEventApplicant(eventId, applicant, changes) {
  const path = `/events/${eventId}/applications/${applicant.applicationId}`;
  if (changes.status) return toApplicant(await apiRequest(`${path}/status`, { method: 'PATCH', body: { status: changes.status } }));
  if (changes.replies) return toApplicant(await apiRequest(`${path}/messages`, { method: 'POST', body: { body: changes.replies.at(-1).message } }));
  const support = changes.supportChecklist?.find((item, index) => item.ready !== applicant.supportChecklist[index]?.ready);
  if (!support) return applicant;
  return toApplicant(await apiRequest(`${path}/supports/${support.id}`, {
    method: 'PATCH', body: { prepStatus: support.ready ? 'READY' : 'PENDING' },
  }));
}
