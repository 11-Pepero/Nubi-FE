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
      id: support.applicationSupportId, label: support.label, note: support.hostNote, ready: support.prepStatus === 'READY',
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
    method: 'PATCH', body: { prepStatus: support.ready ? 'READY' : 'PENDING', hostNote: support.note },
  }));
}

export async function getEventNeeds(eventId) {
  const { items, cares, arrivals } = await apiRequest(`/events/${eventId}/needs`);
  return {
    preparationTasks: items.map(item => ({
      id: item.supportTagId,
      label: `${item.label} · ${item.totalQuantity}`,
      note: item.hostNotes.join(' · '),
      ready: item.prepStatus === 'READY',
      groups: item.breakdown.map(row => `${row.organizationName} ${row.quantity}`),
      breakdown: item.breakdown,
    })),
    supportOverview: {
      cares: cares.map(item => ({ name: item.alias, organization: item.organizationName, title: item.content })),
      arrivals: arrivals.map(item => ({ ...item, organization: item.organizationName })),
    },
  };
}

export async function saveEventNeed(eventId, task, ready) {
  const prepStatus = ready ? 'READY' : 'PENDING';
  const updates = task.breakdown.filter(row => row.prepStatus !== prepStatus);
  const results = await Promise.allSettled(updates.map(async row => {
    const path = `/events/${eventId}/applications/${row.applicationId}`;
    const applicant = await apiRequest(path);
    const support = applicant.supports.find(item => item.applicationSupportId === row.applicationSupportId);
    if (!support) throw new Error('지원 항목을 찾을 수 없어요.');
    await apiRequest(`${path}/supports/${row.applicationSupportId}`, {
      method: 'PATCH', body: { prepStatus, hostNote: support.hostNote },
    });
  }));
  return {
    ...await getEventNeeds(eventId),
    preparationError: results.find(result => result.status === 'rejected')?.reason.message,
  };
}

const reactionLabels = {
  ENJOYED: '즐거워했어요',
  WANT_AGAIN: '다시 가고 싶어요',
  HAD_DIFFICULTY: '조금 힘들어했어요',
  SHORT_BREAKS: '쉬는 시간이 부족했어요',
  LONG_DISTANCE: '이동 거리가 길었어요',
};

export async function getEventReviews(eventId) {
  const reviews = [];
  for (let page = 0; ; page++) {
    const result = await apiRequest(`/events/${eventId}/reviews?page=${page}&size=100`);
    reviews.push(...result.reviews.content.map(review => ({
      ...review,
      organization: review.organizationName,
      comment: review.content,
      photos: review.imageUrls,
      reply: review.reply?.content,
      checks: review.checks.map(check => ({ ...check, met: check.answer === 'YES' })),
      reactions: review.reactions.map(reaction => reactionLabels[reaction] ?? reaction),
    })));
    if (page + 1 >= result.reviews.totalPages) {
      return {
        reviews,
        reviewStats: result.stats,
        reviewChecks: result.checks,
        reviewReactions: result.reactions.map(item => ({ ...item, label: reactionLabels[item.reaction] ?? item.reaction })),
      };
    }
  }
}

export function postEventReviewReply(reviewId, content) {
  return apiRequest(`/reviews/${reviewId}/reply`, { method: 'POST', body: { content } });
}

export function getEventEditorData(eventId) {
  return apiRequest(`/programs/${eventId}`);
}

export async function saveEventPhotos(eventId, photos, savedImages) {
  const path = `/events/${eventId}/images`;
  for (const [url, imageId] of savedImages) {
    if (photos.includes(url)) continue;
    await apiRequest(`${path}/${imageId}`, { method: 'DELETE' });
    savedImages.delete(url);
  }
  for (const url of photos) {
    if (savedImages.has(url)) continue;
    const file = await (await fetch(url)).blob();
    const form = new FormData();
    form.append('images', file, `event.${file.type.split('/')[1]}`);
    const images = await apiRequest(path, { method: 'POST', body: form });
    const knownIds = new Set(savedImages.values());
    const added = images.find(image => !knownIds.has(image.imageId));
    if (!added) throw new Error('저장한 사진을 확인하지 못했어요.');
    savedImages.set(url, added.imageId);
  }
  if (photos.length) {
    await apiRequest(`${path}/order`, {
      method: 'PATCH', body: { imageIds: photos.map(url => savedImages.get(url)) },
    });
  }
}
