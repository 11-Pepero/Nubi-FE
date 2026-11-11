const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit' });
const modes = [['recent', '최신순'], ['low', '별점 낮은 순'], ['photos', '사진 있는 후기']];
const photos = review => (review.photos ?? []).filter(url => typeof url === 'string' && /^(https?:\/\/|data:image\/(?:png|jpeg|webp);base64,)/i.test(url));

export function renderReceivedReviews(container, { event, escapeText, saveReply }) {
  if (event.reviewError) {
    container.textContent = event.reviewError;
    return;
  }
  let reviews = event.reviews ?? [];
  let mode = 'recent';
  const gallery = reviews.flatMap(photos);
  const date = value => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : '';
  const photoMarkup = (url, index) => `<img src="${escapeText(url)}" alt="후기 사진 ${index + 1}" loading="lazy">`;
  const update = () => {
    const ratings = reviews.map(review => Number(review.rating)).filter(rating => rating >= 1 && rating <= 5);
    const average = ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : '—';
    const stats = event.reviewStats;
    const metrics = [['참여 기관', `${stats?.organizationCount ?? event.applicationOrgCount ?? 0}곳`], ['참여 인원', `${stats?.participantCount ?? event.participantCount ?? 0}명`], ['평균 별점', stats?.averageRating?.toFixed(1) ?? average], ['받은 후기', `${stats?.reviewCount ?? reviews.length}개`], ['답글 기다림', `${stats?.awaitingReplyCount ?? reviews.filter(review => !review.reply).length}개`]];
    const visible = reviews.map((review, index) => ({ review, index }))
      .filter(({ review }) => mode !== 'photos' || photos(review).length)
      .sort((a, b) => {
        const newest = (Date.parse(b.review.createdAt) || 0) - (Date.parse(a.review.createdAt) || 0);
        return mode === 'low' ? (a.review.rating ?? 6) - (b.review.rating ?? 6) || newest : newest;
      });
    const checks = new Map();
    const reactions = new Map();
    for (const review of reviews) {
      for (const check of review.checks ?? []) {
        const result = checks.get(check.label) ?? { yes: 0, total: 0 };
        result.total++;
        if (check.met) result.yes++;
        checks.set(check.label, result);
      }
      for (const reaction of review.reactions ?? []) reactions.set(reaction, (reactions.get(reaction) ?? 0) + 1);
    }
    if (event.reviewChecks) {
      checks.clear();
      for (const check of event.reviewChecks) {
        checks.set(check.label, { yes: check.yesCount, total: check.yesCount + check.noCount + check.unknownCount });
      }
    }
    if (event.reviewReactions) {
      reactions.clear();
      for (const item of event.reviewReactions) reactions.set(item.label, item.count);
    }
    container.innerHTML = `
      <div class="event-summary event-applicant-summary">${metrics.map(([label, value]) => `<div><span>${label}</span><strong>${escapeText(value)}</strong></div>`).join('')}</div>
      <div class="event-reviews-layout">
        <div>
          <div class="event-applicant-filters event-review-filters" role="group" aria-label="후기 정렬">${modes.map(([key, label]) => `<button type="button" data-review-mode="${key}" aria-pressed="${mode === key}">${label}</button>`).join('')}</div>
          <div class="event-review-list">${visible.map(({ review, index }) => {
            const stars = Math.max(0, Math.min(5, Math.round(Number(review.rating) || 0)));
            return `<article class="event-panel event-review-card" data-review-id="${escapeText(review.reviewId)}" tabindex="-1">
              <header><strong>${escapeText(review.organization)}</strong>${stars ? `<span class="event-review-stars" aria-label="별점 ${stars}점">${'★'.repeat(stars)}<span>${'☆'.repeat(5 - stars)}</span></span>` : ''}<small>${date(review.createdAt)}</small></header>
              <p class="event-muted">${escapeText([review.participantCount != null && `이용자 ${review.participantCount}명`, review.companionCount != null && `동반 ${review.companionCount}명`].filter(Boolean).join(', '))}</p>
              <p>${escapeText(review.comment)}</p>
              ${photos(review).length ? `<div class="event-review-photos">${photos(review).map(photoMarkup).join('')}</div>` : ''}
              <div class="event-review-tags">${(review.checks ?? []).map(check => `<span data-met="${Boolean(check.met)}">${escapeText(check.label)} ${check.answer === 'UNKNOWN' ? '몰라요' : check.met ? '그랬어요' : '아니었어요'}</span>`).join('')}</div>
              ${review.reply ? `<div class="event-review-reply"><strong>우리 센터 답글</strong><p>${escapeText(review.reply)}</p></div>` : `<button class="text-button link" type="button" data-review-reply="${index}">답글 달기</button>`}
            </article>`;
          }).join('') || '<p class="empty">표시할 후기가 없어요.</p>'}</div>
        </div>
        <aside class="event-review-aside">
          <section class="event-panel"><h2>공고에 적힌 대로였나요?</h2>${[...checks].map(([label, result]) => `<div class="event-review-meter"><div><span>${escapeText(label)}</span><span>${result.yes} / ${result.total} 그랬어요</span></div><progress aria-label="${escapeText(label)}" value="${result.yes}" max="${result.total}"></progress></div>`).join('') || '<p class="empty">응답이 없어요.</p>'}</section>
          <section class="event-panel"><h2>이용자분들 반응</h2><div class="event-review-tags">${[...reactions].map(([label, total]) => `<span>${escapeText(label)} ${total}</span>`).join('') || '<p class="empty">등록된 반응이 없어요.</p>'}</div></section>
          ${event.reviewImprovements ? `<section class="event-panel event-review-improvements"><h2>✦ 다음 행사 개선점</h2><p>${escapeText(event.reviewImprovements)}</p></section>` : ''}
        </aside>
      </div>
      <dialog class="event-detail" aria-labelledby="event-review-dialog-title"><form method="dialog"><button class="icon-button" aria-label="닫기">×</button></form><h2 id="event-review-dialog-title"></h2><div data-review-dialog-content></div></dialog>`;
  };
  update();
  const openDialog = (title, content) => {
    const dialog = container.querySelector('dialog');
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('[data-review-dialog-content]').innerHTML = content;
    dialog.showModal();
    return dialog;
  };
  container.onclick = e => {
    const modeButton = e.target.closest('[data-review-mode]');
    if (modeButton) {
      mode = modeButton.dataset.reviewMode;
      update();
      container.querySelector(`[data-review-mode="${mode}"]`).focus();
    }
    const reply = e.target.closest('[data-review-reply]');
    if (!reply) return;
    const index = Number(reply.dataset.reviewReply);
    const dialog = openDialog('답글 달기', '<form data-reply-form><label>답글<textarea name="reply" required maxlength="500" rows="4"></textarea></label><button class="pill primary" type="submit">저장</button><p role="status"></p></form>');
    const form = dialog.querySelector('[data-reply-form]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const value = form.elements.reply.value.trim();
      const button = form.querySelector('[type="submit"]');
      if (!value || button.disabled) return;
      button.disabled = true;
      try {
        reviews = await saveReply(index, value);
        dialog.close();
        if (container.contains(dialog)) update();
      } catch (error) {
        form.querySelector('[role="status"]').textContent = error.message;
        button.disabled = false;
      }
    });
  };
  return () => openDialog('사진 모아보기', gallery.length ? `<div class="event-review-photos">${gallery.map(photoMarkup).join('')}</div>` : '<p class="empty">첨부된 후기 사진이 없어요.</p>');
}
