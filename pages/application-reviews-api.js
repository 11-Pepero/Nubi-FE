import { apiEnabled, apiRequest, getSession } from './api-client.js';

const labelsByCheck = {
  ramp: ['경사로', '주출입구 접근로'],
  restroom: ['장애인 화장실'],
  companion: ['동반인 무료', '동반 무료'],
  language: ['쉬운 말 안내'],
};
const reactionCodes = {
  '즐거워했어요': 'ENJOYED',
  '다시 가고 싶어해요': 'WANT_AGAIN',
  '조금 힘들어했어요': 'HAD_DIFFICULTY',
  '쉬는 시간이 부족했어요': 'SHORT_BREAKS',
  '이동 거리가 길었어요': 'LONG_DISTANCE',
};
const draftKey = id => `nubi:review-draft:${getSession()?.memberId}:${id}`;

export function getReviewDraft(id) {
  if (!apiEnabled) return undefined;
  return JSON.parse(sessionStorage.getItem(draftKey(id)) ?? 'null');
}

export function saveReviewDraft(id, review) {
  if (!apiEnabled) return mockActivity.saveApplicationReviewDraft(id, review);
  sessionStorage.setItem(draftKey(id), JSON.stringify(review));
}

export function createReviewPublisher(item) {
  let reviewId = item.reviewId;
  return async review => {
    if (!apiEnabled) return mockActivity.saveApplicationReview(item.applicationId, review);
    const tags = (await apiRequest('/support-tags')).flatMap(category => category.tags);
    const checks = Object.entries(review.checks).map(([key, value]) => {
      const tag = tags.find(tag => labelsByCheck[key]?.includes(tag.label));
      if (!tag) throw new Error('선택한 접근성 항목이 서버 지원 항목 사전에 없어요.');
      return { supportTagId: tag.id, answer: value.toUpperCase() };
    });
    const form = new FormData();
    for (const [index, url] of review.photos.entries()) {
      const file = await (await fetch(url)).blob();
      form.append('images', file, `review-${index + 1}.${file.type.split('/')[1]}`);
    }
    const body = {
      rating: review.rating, checks, mismatchNote: review.difference,
      reactions: review.reactions.map(label => reactionCodes[label]),
      content: review.comment, isPublic: review.isPublic,
    };
    const response = await apiRequest(reviewId ? `/reviews/${reviewId}` : `/applications/${item.applicationId}/review`, {
      method: reviewId ? 'PUT' : 'POST', body,
    });
    reviewId = response.reviewId;
    if (review.photos.length) await apiRequest(`/reviews/${reviewId}/images`, { method: 'POST', body: form });
    sessionStorage.removeItem(draftKey(item.applicationId));
  };
}
