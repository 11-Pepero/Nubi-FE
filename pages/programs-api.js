import { apiEnabled, apiRequest } from './api-client.js';

const categories = { CULTURE: '문화·예술', SPORTS: '체육', EDUCATION: '교육', HEALTH: '건강', BENEFIT: '혜택' };
const districts = { CHEOIN: '처인구', GIHEUNG: '기흥구', SUJI: '수지구' };

function toProgram(program) {
  return {
    ...program,
    organizerName: program.hostName,
    category: categories[program.category] ?? program.category,
    district: districts[program.venue?.district] ?? program.venue?.district,
    applyUntil: program.deadlineAt,
    canApplyDirectly: program.applyMethod === 'DIRECT',
    gallery: program.images?.map(image => ({ url: image.url, alt: program.title })),
  };
}

async function allPages(path, query = new URLSearchParams(), options) {
  const items = [];
  query.set('size', '100');
  for (let page = 0; ; page += 1) {
    query.set('page', page);
    const response = await apiRequest(`${path}?${query}`, options);
    items.push(...response.content);
    if (page + 1 >= response.totalPages) return items;
  }
}

export async function getPrograms() {
  if (!apiEnabled) return mockActivity.getPrograms();
  return (await allPages('/programs', new URLSearchParams(), { auth: false })).map(toProgram);
}

export async function getProgram(id, groupId) {
  if (!apiEnabled) return mockActivity.getProgram(id);
  const query = groupId ? `?groupId=${encodeURIComponent(groupId)}` : '';
  return toProgram(await apiRequest(`/programs/${encodeURIComponent(id)}${query}`));
}

export async function getEligiblePrograms(groupId, { careIds }) {
  if (!apiEnabled) return mockActivity.getEligiblePrograms(groupId, { careIds });
  const query = new URLSearchParams({ groupId });
  careIds.forEach(id => query.append('careIds', id));
  const entries = await allPages('/programs/eligible', query);
  return { items: entries.map(entry => ({
    ...entry,
    result: entry.result === 'CHECK' ? 'NEEDS_REVIEW' : entry.result,
    program: toProgram(entry.program),
  })) };
}
