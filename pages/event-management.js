import { programDeadline, programSchedule } from '../program-format.js';

const tones = [['standard', '일반'], ['easy', '쉬운 말'], ['message', '문자용']];
const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const maxPhotos = 10;

export function renderEventList(container, { events, escapeText, initialTab }) {
  const now = new Date();
  const isPast = event => event.status === 'COMPLETED' || (event.endAt ?? event.startAt) && new Date(event.endAt ?? event.startAt) < now;
  const drafts = events.filter(event => event.status === 'DRAFT');
  const published = events.filter(event => event.status !== 'DRAFT');
  const active = published.filter(event => !isPast(event));
  const past = published.filter(isPast).sort((a, b) => (b.startAt ?? '').localeCompare(a.startAt ?? ''));
  const tabs = [['active', '진행 중', active], ['past', '지난 행사', past], ['drafts', '임시 저장', drafts]];
  const sum = (items, key) => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
  const monthEvents = active.filter(event => {
    const date = new Date(event.startAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const stats = [
    ['진행 중인 행사', active.length, '개'],
    ['새 신청', sum(active, 'newApplicationCount'), '건'],
    ['이번 달 참여 예정', sum(monthEvents, 'participantCount'), '명'],
    ['받은 후기', sum(published, 'reviewCount'), '개'],
  ];
  const latest = past[0];
  container.innerHTML = `
    <section class="event-dashboard">
      <header class="event-editor-header"><h1 id="event-list-title" tabindex="-1">행사 관리</h1><a class="pill primary" href="#events/new">새 행사 올리기</a></header>
      <div class="event-summary">${stats.map(([label, value, unit]) => `<div><span>${label}</span><strong>${value.toLocaleString('ko-KR')}${unit}</strong></div>`).join('')}</div>
      <div class="event-tabs" role="group" aria-label="행사 상태">${tabs.map(([key, label, items]) => `<button type="button" data-event-tab="${key}" aria-pressed="${key === 'active'}">${label} <span>${items.length}</span></button>`).join('')}</div>
      <div class="event-rows"></div>
      ${latest ? `<section class="event-recent"><h2>최근 끝난 행사</h2><div>
        <strong>${escapeText(latest.title)}</strong><span>${escapeText(eventDate(latest))} · ${escapeText(latest.applicationOrgCount ?? 0)}개 기관 · ${escapeText(latest.participantCount ?? 0)}명 참여</span>
        <span class="event-review-count">${latest.rating == null ? '' : `<b aria-label="평점">☆</b> ${escapeText(latest.rating)} · `}후기 ${escapeText(latest.reviewCount ?? 0)}</span>
        <a class="text-button link" href="#events/${encodeURIComponent(latest.eventId)}/reviews">후기 보기</a>
      </div></section>` : ''}
    </section>`;
  const dashboard = container.firstElementChild;
  const rows = dashboard.querySelector('.event-rows');
  const recent = dashboard.querySelector('.event-recent');

  function update(key) {
    const [, label, items] = tabs.find(([tab]) => tab === key);
    for (const button of dashboard.querySelectorAll('[data-event-tab]')) button.setAttribute('aria-pressed', String(button.dataset.eventTab === key));
    rows.innerHTML = items.map(item => eventRow(item, key, escapeText)).join('') || `<p class="empty">${label} 상태의 행사가 없어요.</p>`;
    if (recent) recent.hidden = key !== 'active';
  }
  dashboard.addEventListener('click', e => {
    const tab = e.target.closest('[data-event-tab]');
    if (tab) update(tab.dataset.eventTab);
  });
  update(tabs.some(([key]) => key === initialTab) ? initialTab : 'active');
}

const eventPlaceholder = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m4 18 5-5 3 3 4-5 4 5"/></svg>';
const eventDate = item => item.startAt ? programSchedule(item) : '일정 미정';

function eventRow(item, tab, escapeText) {
  const count = Math.max(0, Number(item.participantCount) || 0);
  const capacity = Number(item.capacity);
  const deadline = programDeadline({ applyUntil: item.startAt }).label;
  const photo = item.thumbnailUrl ?? item.photos?.[0];
  return `<article class="event-row">
    <div class="event-row-photo">${typeof photo === 'string' && isEventPhoto(photo) ? `<img src="${escapeText(photo)}" alt="">` : eventPlaceholder}</div>
    <div class="event-row-main"><div><h2>${escapeText(item.title || '제목 없는 행사')}</h2><span class="event-row-badge" data-status="${tab}">${tab === 'active' ? '공개 중' : tab === 'past' ? '종료' : '임시 저장'}</span>${tab === 'active' && item.startAt ? `<span class="event-muted">${deadline}</span>` : ''}</div>
      <p class="event-muted">${escapeText(eventDate(item))} · ${escapeText(item.venue?.name || '장소 미정')}</p>
      ${tab === 'active' && capacity > 0 ? `<div class="event-progress"><progress value="${count}" max="${capacity}" aria-label="정원 대비 참여 인원"></progress><span>${count} / ${capacity}명</span></div>` : ''}
    </div>
    ${tab === 'drafts' ? '' : `<dl class="event-row-stats">
      <div><dt>신청 기관</dt><dd>${escapeText(item.applicationOrgCount ?? 0)}곳</dd></div>
      <div><dt>참여 인원</dt><dd>${count}명</dd></div>
      <div><dt>${tab === 'past' ? '받은 후기' : '새 신청'}</dt><dd>${escapeText(tab === 'past' ? item.reviewCount ?? 0 : item.newApplicationCount ?? 0)}건</dd></div>
    </dl>`}
    <div class="event-row-actions"><a class="${tab === 'drafts' ? 'pill' : 'text-button'}" href="#events/${encodeURIComponent(item.eventId)}">${tab === 'drafts' ? '이어서 작성' : '수정'}</a>
      ${tab === 'active' ? `<a class="pill primary" href="#events/${encodeURIComponent(item.eventId)}/applications">신청 보기</a>` : ''}
      ${tab === 'past' ? `<a class="pill" href="#events/${encodeURIComponent(item.eventId)}/reviews">후기 보기</a>` : ''}
    </div>
  </article>`;
}

function isEventPhoto(url) {
  return /^(https?:\/\/|\/(?!\/)|data:image\/(?:jpeg|png|webp|heic|heif);base64,)/i.test(url);
}

export function renderEventEditor(container, { event, options, initialPlace, escapeText, save }) {
  const existingPhotos = event?.photos ?? [];
  const photos = existingPhotos.filter(url => typeof url === 'string' && isEventPhoto(url));
  const features = options?.features ?? [];
  const selectedFeatures = event?.accessibilityTags ?? [];
  const time = value => value?.slice(11, 16) ?? '';
  container.innerHTML = `
    <form class="event-editor">
      <header class="event-editor-header">
        <h1 id="event-title" tabindex="-1">${event?.status === 'PUBLISHED' ? '행사 수정' : '새 행사 올리기'}</h1>
        <div class="actions"><a class="pill" href="#events/list">행사 목록</a>${event?.status === 'PUBLISHED' ? '' : '<button type="button" class="pill" data-save-draft>임시 저장</button>'}<button type="submit" class="pill primary">${event?.status === 'PUBLISHED' ? '변경 저장' : '공개하기'}</button></div>
        <p class="event-feedback" role="status"></p>
      </header>
      <div class="event-editor-layout">
        <div class="event-editor-column">
          <section class="event-panel">
            <h2>기본 정보</h2>
            <label>행사 이름<input name="title" required maxlength="80" placeholder="행사 이름을 입력해 주세요" value="${escapeText(event?.title)}"></label>
            <div class="event-basics">
              <label>날짜<input type="date" name="date" required value="${escapeText(event?.startAt?.slice(0, 10))}"></label>
              <div class="event-time"><label>시작 시간<input type="time" name="start" required value="${escapeText(time(event?.startAt))}"></label><label>종료 시간<input type="time" name="end" value="${escapeText(time(event?.endAt))}"></label></div>
              <label>받는 인원<input type="number" name="capacity" min="1" max="100000" required placeholder="40명" value="${escapeText(event?.capacity)}"></label>
            </div>
          </section>
          <section class="event-panel">
            <header class="event-panel-heading"><h2>사진 <small data-photo-count></small></h2><small>끌어서 순서를 바꿔요. 첫 사진이 대표예요.</small></header>
            <div class="event-photos">
              <label class="event-photo-add"><input type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif" multiple aria-label="사진 추가"><span aria-hidden="true">＋</span><small>사진 추가</small></label>
              <div class="event-photo-list" data-photos></div>
            </div>
            <p class="event-muted">JPG, PNG, WebP, HEIC · 한 장에 10MB까지 · 얼굴이 보이는 사진은 동의를 받은 것만 올려 주세요.</p>
          </section>
          <section class="event-panel">
            <h2>장소와 편의시설</h2>
            <label>장소<input name="venue" required maxlength="100" placeholder="행사 장소를 입력해 주세요" value="${escapeText(event?.venue?.name ?? initialPlace)}"></label>
            <div class="event-facilities">
              <p>✦ 장소에서 제공하는 편의시설을 선택해 주세요</p>
              <div class="event-chips">${features.filter(feature => feature.type === 'facility').map(feature => renderFeature(feature, selectedFeatures, escapeText)).join('')}</div>
              <small>참가자가 방문 전에 확인할 수 있도록 실제 제공되는 항목을 선택해 주세요.</small>
            </div>
          </section>
          <section class="event-panel"><h2>누구나 올 수 있게</h2>
            <div class="event-chips">${features.filter(feature => feature.type === 'support').map(feature => renderFeature(feature, selectedFeatures, escapeText)).join('')}</div>
            <label>추가 안내<textarea name="notes" rows="3" maxlength="400" placeholder="참가자에게 미리 알려 주고 싶은 내용을 적어 주세요.">${escapeText(event?.notes)}</textarea></label>
          </section>
        </div>
        <aside class="event-editor-column" aria-label="행사 미리보기">
          <section class="event-panel event-preview">
            <header class="event-panel-heading"><small>미리보기 · 프로그램 카드</small><strong data-deadline></strong></header>
            <div class="event-preview-image" data-cover></div>
            <h2 data-preview-title></h2><p class="event-muted" data-preview-meta></p><div class="event-preview-tags" data-preview-tags></div>
          </section>
          <section class="event-panel event-promotion">
            <header class="event-panel-heading"><h2>✦ AI 홍보문</h2><button class="text-button" type="button" data-regenerate>다시 쓰기</button></header>
            <div class="event-tones" role="group" aria-label="홍보문 형식">${tones.map(([key, label]) => `<button type="button" data-tone="${key}" aria-pressed="false">${label}</button>`).join('')}</div>
            <textarea name="promotion" rows="7" aria-label="홍보문" maxlength="3000"></textarea>
            <div class="event-promotion-actions"><button class="pill" type="button" data-copy>복사하기</button><button class="pill" type="button" data-poster>포스터로 받기</button></div>
            <p class="event-muted" data-promotion-status role="status"></p>
          </section>
        </aside>
      </div>
      <article class="event-poster" aria-hidden="true"></article>
    </form>`;
  const form = container.firstElementChild;
  const elements = form.elements;
  const fileInput = form.querySelector('input[type="file"]');
  const photoList = form.querySelector('[data-photos]');
  const feedback = form.querySelector('.event-feedback');
  const promotionStatus = form.querySelector('[data-promotion-status]');
  const promotion = elements.promotion;
  const publish = form.querySelector('[type="submit"]');
  const draft = form.querySelector('[data-save-draft]');
  const promotions = { ...event?.promotions };
  let tone = 'easy';
  let busy = false;
  let draggedIndex = null;

  function values() {
    const date = elements.date.value;
    const start = elements.start.value;
    return {
      title: elements.title.value.trim(), startAt: date ? `${date}T${start || '00:00'}:00` : null,
      endAt: date && elements.end.value ? `${date}T${elements.end.value}:00` : null,
      capacity: elements.capacity.value ? Number(elements.capacity.value) : null,
      venue: { ...event?.venue, name: elements.venue.value.trim() },
      accessibilityTags: [...new FormData(form).getAll('accessibility')],
      notes: elements.notes.value.trim(), photos: [...photos], promotions: { ...promotions },
    };
  }
  function generatedText() {
    const item = values();
    const name = item.title || '행사';
    const when = item.startAt ? programSchedule(item) + (elements.end.value ? ` ~ ${elements.end.value}` : '') : '일정 미정';
    const where = item.venue.name || '장소 미정';
    const support = item.accessibilityTags.join(', ');
    if (tone === 'message') return [`[${name}] ${when}`, where, support, item.notes].filter(Boolean).join(' · ');
    return [tone === 'easy' ? `${name}에 놀러 오세요.` : `${name}에 여러분을 초대합니다.`,
      `언제: ${when}\n어디: ${where}`, support && `이용할 수 있는 편의시설과 지원: ${support}`, item.notes].filter(Boolean).join('\n\n');
  }
  function updatePreview() {
    const item = values();
    form.querySelector('[data-deadline]').textContent = item.startAt ? programDeadline({ applyUntil: item.startAt }).label : '';
    form.querySelector('[data-preview-title]').textContent = item.title || '행사 이름';
    form.querySelector('[data-preview-meta]').textContent = [
      item.startAt && programSchedule(item), item.venue.name, item.capacity && `정원 ${item.capacity}명`,
    ].filter(Boolean).join(' · ') || '날짜와 장소를 입력해 주세요.';
    form.querySelector('[data-preview-tags]').innerHTML = item.accessibilityTags.map(tag => `<span class="tag">${escapeText(tag)}</span>`).join('');
    promotion.value = promotions[tone] ?? generatedText();
  }
  function renderPhotos() {
    form.querySelector('[data-photo-count]').textContent = `${photos.length} / ${maxPhotos}`;
    form.querySelector('[data-cover]').innerHTML = photos.length ? `<img src="${escapeText(photos[0])}" alt="행사 대표 사진">` : eventPlaceholder;
    photoList.innerHTML = photos.map((url, index) => `<div class="event-photo" data-index="${index}" draggable="true">
      <img src="${escapeText(url)}" alt="행사 사진 ${index + 1}" draggable="false"><button type="button" class="event-remove-photo" data-remove="${index}" aria-label="사진 ${index + 1} 삭제">×</button>
      ${index === 0 ? '<small>대표</small>' : `<button type="button" class="event-cover-photo" data-cover-index="${index}">대표로</button>`}
    </div>`).join('');
    fileInput.disabled = busy || photos.length >= maxPhotos;
  }
  function movePhoto(from, to) {
    if (busy || from === to || !photos[from] || !photos[to]) return;
    photos.splice(to, 0, photos.splice(from, 1)[0]);
    renderPhotos();
  }
  function setBusy(value) {
    busy = value;
    publish.disabled = value;
    if (draft) draft.disabled = value;
    fileInput.disabled = value || photos.length >= maxPhotos;
  }
  function selectTone(value) {
    tone = value;
    for (const button of form.querySelectorAll('[data-tone]')) button.setAttribute('aria-pressed', String(button.dataset.tone === tone));
    updatePreview();
  }
  async function submit(status) {
    if (busy) return;
    const item = values();
    if (status === 'PUBLISHED' && (!item.title || !item.venue.name || (item.endAt && item.endAt <= item.startAt))) {
      feedback.textContent = '행사 이름과 장소를 입력하고, 종료 시간을 시작 시간보다 뒤로 설정해 주세요.';
      return;
    }
    setBusy(true);
    feedback.textContent = '';
    try {
      await save({ ...item, status });
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      setBusy(false);
    }
  }
  form.addEventListener('input', e => {
    if (e.target === promotion) promotions[tone] = promotion.value;
    else if (e.target !== fileInput) updatePreview();
  });
  form.addEventListener('submit', e => { e.preventDefault(); submit('PUBLISHED'); });
  draft?.addEventListener('click', () => submit('DRAFT'));
  form.querySelector('.event-tones').addEventListener('click', e => {
    const button = e.target.closest('[data-tone]');
    if (button) selectTone(button.dataset.tone);
  });
  form.querySelector('[data-regenerate]').addEventListener('click', () => {
    delete promotions[tone];
    updatePreview();
    promotionStatus.textContent = '현재 행사 정보로 홍보문을 다시 작성했어요.';
  });
  form.querySelector('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(promotion.value);
      promotionStatus.textContent = '홍보문을 복사했어요.';
    } catch {
      promotion.select();
      promotionStatus.textContent = '선택한 홍보문을 복사해 주세요.';
    }
  });
  form.querySelector('[data-poster]').addEventListener('click', () => {
    const poster = form.querySelector('.event-poster');
    poster.innerHTML = `<h1>${escapeText(elements.title.value || '행사 안내')}</h1>${photos.length ? `<img src="${escapeText(photos[0])}" alt="">` : ''}<p>${escapeText(promotion.value)}</p>`;
    window.print();
  });
  fileInput.addEventListener('change', async () => {
    const files = [...fileInput.files];
    if (!files.length || busy) return;
    if (photos.length + files.length > maxPhotos || files.some(file => !imageTypes.includes(file.type) || file.size > 10 * 1024 * 1024)) {
      feedback.textContent = '지원되는 사진을 최대 10장, 한 장에 10MB까지 추가할 수 있어요.';
      fileInput.value = '';
      return;
    }
    setBusy(true);
    feedback.textContent = '';
    try {
      const previews = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
      photos.push(...[...new Set(previews)].filter(url => !photos.includes(url)));
      renderPhotos();
    } catch {
      feedback.textContent = '사진을 읽지 못했어요.';
    } finally {
      fileInput.value = '';
      setBusy(false);
    }
  });
  photoList.addEventListener('click', e => {
    if (busy) return;
    const remove = e.target.closest('[data-remove]');
    const cover = e.target.closest('[data-cover-index]');
    if (remove) { photos.splice(Number(remove.dataset.remove), 1); renderPhotos(); }
    if (cover) movePhoto(Number(cover.dataset.coverIndex), 0);
  });
  photoList.addEventListener('dragstart', e => {
    const photo = e.target.closest('[data-index]');
    if (!photo || busy) return;
    draggedIndex = Number(photo.dataset.index);
    e.dataTransfer.setData('text/plain', photo.dataset.index);
  });
  photoList.addEventListener('dragover', e => {
    if (draggedIndex !== null && e.target.closest('[data-index]')) e.preventDefault();
  });
  photoList.addEventListener('drop', e => {
    const photo = e.target.closest('[data-index]');
    if (draggedIndex === null || !photo) return;
    e.preventDefault();
    movePhoto(draggedIndex, Number(photo.dataset.index));
    draggedIndex = null;
  });
  photoList.addEventListener('dragend', () => { draggedIndex = null; });
  selectTone(tone);
  renderPhotos();
}

function renderFeature(feature, selected, escapeText) {
  return `<label><input type="checkbox" name="accessibility" value="${escapeText(feature.label)}" ${selected.includes(feature.label) ? 'checked' : ''}><span class="pill">${escapeText(feature.label)}</span></label>`;
}
