import { programSchedule } from '../program-format.js';

const checks = [
  ['ramp', '경사로로 들어갈 수 있었어요', '경사로'],
  ['restroom', '장애인 화장실이 가까웠어요', '화장실'],
  ['companion', '동반인은 무료였어요', '동반인 무료'],
  ['language', '쉬운 말로 안내해 줬어요', '쉬운 말 안내'],
];
const answers = [['yes', '그랬어요'], ['no', '아니었어요'], ['unknown', '몰라요']];
const reactions = ['즐거워했어요', '다시 가고 싶어해요', '조금 힘들어했어요', '쉬는 시간이 부족했어요', '이동 거리가 길었어요'];
const ratingLabels = ['', '아쉬웠어요', '조금 아쉬웠어요', '보통이에요', '좋았어요', '아주 좋았어요'];

export function renderApplicationReview(container, { item, program, organization, escapeText, saveDraft, publish }) {
  const saved = item.reviewDraft ?? item.review ?? {};
  const draft = typeof saved === 'string' ? { comment: saved } : saved;
  const title = item.programTitle ?? program?.title ?? '프로그램';
  const startAt = item.startAt ?? program?.startAt;
  const people = [item.participantCount == null ? '' : `이용자 ${item.participantCount}명`, item.companionCount ? `동반 ${item.companionCount}명` : ''].filter(Boolean).join(', ');
  const metadata = [item.organizerName ?? program?.organizerName, startAt && programSchedule({ startAt }), item.groupName, people].filter(Boolean).join(' · ');
  container.innerHTML = `
    <form class="review-page">
      <header class="review-header">
        <a class="icon-button" href="#applications/${encodeURIComponent(item.applicationId)}" aria-label="신청 현황으로 돌아가기">‹</a>
        <div><p>${escapeText(metadata)}</p><h1 id="review-title" tabindex="-1">${escapeText(title)} 후기</h1></div>
        <div class="actions"><button class="pill" type="button" data-draft>임시 저장</button><button class="pill primary" type="submit">후기 올리기</button></div>
        <p class="review-status" role="status"></p>
      </header>
      <div class="review-layout">
        <div class="review-column">
          <section class="review-card"><h2>어땠나요?</h2>
            <div class="review-rating">
              <div class="review-stars" role="radiogroup" aria-label="별점">
                ${ratingLabels.slice(1).map((label, index) => `<label><input type="radio" name="rating" value="${index + 1}" aria-label="${index + 1}점" ${draft.rating === index + 1 ? 'checked' : ''} required><span aria-hidden="true">☆</span></label>`).join('')}
              </div><strong data-rating-label></strong>
            </div>
          </section>
          <section class="review-card"><h2>공고에 적힌 대로였나요?</h2><p class="review-muted">여기 남긴 답은 다음 기관의 참여 판정에 쓰여요.</p>
            <div class="review-checks">${checks.map(([key, label]) => `<fieldset class="review-check"><legend class="review-visually-hidden">${label}</legend><span aria-hidden="true">${label}</span><div class="review-options">
              ${answers.map(([value, answer]) => `<label data-answer="${value}"><input type="radio" name="${key}" value="${value}" ${draft.checks?.[key] === value ? 'checked' : ''}><span>${answer}</span></label>`).join('')}
            </div></fieldset>`).join('')}</div>
            <label class="review-difference" hidden>어떤 점이 달랐나요? <input name="difference" maxlength="200" value="${escapeText(draft.difference)}" placeholder="공고와 달랐던 점을 적어 주세요"></label>
          </section>
          <section class="review-card"><h2>이용자분들 반응</h2><div class="review-reactions">
            ${reactions.map(label => `<label><input type="checkbox" name="reaction" value="${label}" ${draft.reactions?.includes(label) ? 'checked' : ''}><span class="pill">${label}</span></label>`).join('')}
          </div></section>
          <section class="review-card"><h2><label for="review-comment">다른 기관에 알려 주고 싶은 점</label></h2>
            <textarea id="review-comment" name="comment" rows="4" maxlength="500" required>${escapeText(draft.comment)}</textarea>
            <div class="review-photos"><label class="review-photo-add"><input type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="사진 추가"><span aria-hidden="true">＋</span></label><div data-photos></div></div>
          </section>
        </div>
        <aside class="review-column" aria-label="후기 미리보기">
          <section class="review-card"><p class="review-muted">다른 기관에 이렇게 보여요</p>
            <div class="review-preview"><div class="review-preview-heading"><strong>${escapeText(organization ?? '우리 기관')}</strong><span data-preview-rating></span></div>
              <p class="review-muted">${escapeText(people ? people + '이 함께 다녀왔어요' : '프로그램에 다녀왔어요')}</p>
              <p data-preview-comment></p><div class="review-preview-tags" data-preview-tags></div>
            </div>
          </section>
          <section class="review-card review-impact"><h2>✦ 후기가 반영되는 곳</h2><p>남겨 주신 접근성 정보는 다른 기관이 프로그램 참여를 판단할 때 참고할 수 있어요.</p></section>
          <label class="review-card review-sharing"><span><strong>다른 기관에도 공개</strong><small>끄면 주최 기관만 봐요</small></span><input type="checkbox" name="isPublic" role="switch" ${draft.isPublic === false ? '' : 'checked'}></label>
        </aside>
      </div>
    </form>`;
  const form = container.firstElementChild;
  const status = form.querySelector('.review-status');
  const fileInput = form.querySelector('input[type="file"]');
  const photos = [...(draft.photos ?? [])].filter(url => /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(url));
  const draftButton = form.querySelector('[data-draft]');
  const publishButton = form.querySelector('[type="submit"]');
  let busy = false;

  function readReview() {
    const data = new FormData(form);
    const checksByKey = Object.fromEntries(checks.map(([key]) => [key, data.get(key)]).filter(([, value]) => value));
    return {
      rating: Number(data.get('rating')), checks: checksByKey,
      difference: Object.values(checksByKey).includes('no') ? data.get('difference').trim() : '',
      reactions: data.getAll('reaction'), comment: data.get('comment').trim(),
      isPublic: data.has('isPublic'), photos: [...photos],
    };
  }
  function updatePreview() {
    const review = readReview();
    form.querySelectorAll('.review-stars label').forEach((label, index) => {
      label.querySelector('span').textContent = index < review.rating ? '★' : '☆';
      label.classList.toggle('is-filled', index < review.rating);
    });
    form.querySelector('[data-rating-label]').textContent = ratingLabels[review.rating] || '별점을 선택해 주세요';
    form.querySelector('.review-difference').hidden = !Object.values(review.checks).includes('no');
    form.querySelector('[data-preview-rating]').textContent = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    form.querySelector('[data-preview-comment]').textContent = review.comment || '후기를 작성하면 여기에 표시돼요.';
    form.querySelector('[data-preview-tags]').innerHTML = checks.filter(([key]) => ['yes', 'no'].includes(review.checks[key]))
      .map(([key, , label]) => `<span data-answer="${review.checks[key]}">${label} ${review.checks[key] === 'yes' ? '그랬어요' : '아니었어요'}</span>`).join('');
  }
  function renderPhotos() {
    form.querySelector('[data-photos]').innerHTML = photos.map((url, index) =>
      `<div><img src="${escapeText(url)}" alt="첨부 사진 ${index + 1}"><button type="button" data-remove-photo="${index}" aria-label="사진 ${index + 1} 삭제">×</button></div>`).join('');
    fileInput.disabled = busy || photos.length >= 3;
  }
  function setBusy(value) {
    busy = value;
    draftButton.disabled = publishButton.disabled = value;
    fileInput.disabled = value || photos.length >= 3;
  }
  form.addEventListener('input', updatePreview);
  form.querySelector('[data-photos]').addEventListener('click', event => {
    const button = event.target.closest('[data-remove-photo]');
    if (!button || busy) return;
    photos.splice(Number(button.dataset.removePhoto), 1);
    renderPhotos();
  });
  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files];
    if (!files.length || busy) return;
    if (files.length + photos.length > 3 || files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      status.textContent = '사진은 JPG, PNG, WebP로 최대 3장, 장당 5MB까지 첨부할 수 있어요.';
      fileInput.value = '';
      return;
    }
    setBusy(true);
    status.textContent = '';
    try {
      photos.push(...await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }))));
      renderPhotos();
    } catch {
      status.textContent = '사진을 불러오지 못했어요.';
    } finally {
      fileInput.value = '';
      setBusy(false);
    }
  });
  async function save(operation, isDraft) {
    if (busy) return;
    const review = readReview();
    if (!isDraft && !review.comment) {
      status.textContent = '후기 내용을 입력해 주세요.';
      form.elements.comment.focus();
      return;
    }
    setBusy(true);
    status.textContent = '';
    try {
      await operation(review);
      if (isDraft) status.textContent = '임시 저장했어요.';
    } catch (error) {
      status.textContent = error.message;
    } finally {
      setBusy(false);
    }
  }
  draftButton.addEventListener('click', () => save(saveDraft, true));
  form.addEventListener('submit', event => {
    event.preventDefault();
    save(publish, false);
  });
  updatePreview();
  renderPhotos();
}
