import { programDeadline, programSchedule } from '../program-format.js';

const byId = id => document.getElementById(id);

const eligibilityFilters = [['ALL', '전체'], ['ELIGIBLE', '참여 가능'], ['NEEDS_REVIEW', '확인 필요']];

function eligibleApplicationState({ program, result }, groupId, hasProgramApplication) {
  const alreadyApplied = hasProgramApplication(program.programId, groupId);
  const direct = result === 'ELIGIBLE' && program.canApplyDirectly && !alreadyApplied;
  return { direct, alreadyApplied };
}

function eligibleCard(item, groupId, selectedCare, { hasProgramApplication, escapeText, venueLabel }) {
  const { program, result, review } = item;
  const available = result === 'ELIGIBLE';
  const action = eligibleApplicationState(item, groupId, hasProgramApplication);
  const deadline = programDeadline(program);
  const person = selectedCare.find(item => item.id === review?.careId);
  const details = [
    ['calendar', programSchedule(program)],
    ['pin', venueLabel(program.venue)],
    ['users', program.capacity == null ? '정원 미정' : `정원 ${program.capacity}명`],
  ];
  return `<article class="card eligible-card">
    <header class="eligible-card-meta">
      <span>${escapeText(program.organizerName)}</span>
      ${program.sharedWithOrganization ? '<span class="tag">우리 기관 공유</span>' : ''}
      <strong class="${deadline.soon ? 'eligible-deadline soon' : ''}">${deadline.label}</strong>
    </header>
    <h2>${escapeText(program.title)}</h2>
    <ul class="eligible-details">${details.map(([icon, label]) => `<li><svg aria-hidden="true"><use href="#${icon}"/></svg>${escapeText(label)}</li>`).join('')}</ul>
    <div class="eligible-tags">${(program.accessibilityTags ?? []).map(label => `<span class="tag">${escapeText(label)}</span>`).join('')}</div>
    ${review ? `<p class="eligible-review">${person ? `<strong>${escapeText(person.alias)}</strong> ` : ''}${escapeText(review.message)}</p>` : ''}
    <footer>
      <span class="eligible-result ${available ? '' : 'needs-review'}">${available ? '참여 가능' : '확인 필요'}</span>
      <button class="text-button" type="button" data-eligible-details="${escapeText(program.programId)}">자세히 보기</button>
      ${action.direct
        ? `<a class="pill primary" href="#prepare/${encodeURIComponent(program.programId)}/${encodeURIComponent(groupId)}">신청하기</a>`
        : action.alreadyApplied
          ? `<a class="pill" href="#prepare/${encodeURIComponent(program.programId)}/${encodeURIComponent(groupId)}">신청 준비</a>`
          : '<button class="pill" type="button" disabled>신청 불가</button>'}
    </footer>
  </article>`;
}

const eligibleDetailDialog = byId('eligible-detail-dialog');

function openEligibleDetails(item, group, selectedCare, trigger, { hasProgramApplication, escapeText, dateLabel, venueLabel }) {
  const { program, result, review } = item;
  const action = eligibleApplicationState(item, group.id, hasProgramApplication);
  const gallery = program.gallery?.length ? program.gallery : [{ alt: '등록된 프로그램 이미지가 없어요.' }];
  const careReview = review ?? program.careAssessment;
  const person = selectedCare.find(entry => entry.id === careReview?.careId);
  const rows = group.supports.filter(support => program.supportAssessments?.[support.code])
    .map(support => [support.quantity ? `${support.label} ${support.quantity}명` : support.label, program.supportAssessments[support.code]]);
  const metadata = [
    ['calendar', programSchedule(program)],
    ['pin', venueLabel(program.venue)],
    ['users', program.capacity == null ? null : `정원 ${program.capacity}명${program.remainingCapacity == null ? '' : ` · 남은 자리 ${program.remainingCapacity}`}`],
    ['list', program.applyUntil ? `${dateLabel(program.applyUntil)} 마감` : null],
  ];
  const imageIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m4 18 5-5 3 3 4-5 4 5"/></svg>';
  eligibleDetailDialog.innerHTML = `
    <div class="eligible-detail-body">
      <header class="eligible-detail-header">
        <span>${escapeText(program.organizerName)}</span>
        ${program.sharedWithOrganization ? '<span class="tag">우리 기관 공유</span>' : ''}
        <strong>${programDeadline(program).label}</strong>
        <form method="dialog">
          <button class="icon-button eligible-detail-close" aria-label="닫기" autofocus>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
        </form>
      </header>
      <div class="eligible-detail-gallery">
        <div class="eligible-detail-photo"></div>
        <span class="eligible-detail-counter"></span>
        ${gallery.length > 1 ? '<button type="button" data-step="-1" aria-label="이전 이미지">‹</button><button type="button" data-step="1" aria-label="다음 이미지">›</button>' : ''}
      </div>
      ${gallery.length > 1 ? `<div class="eligible-detail-thumbs">${gallery.map((photo, index) =>
        `<button type="button" data-photo="${index}" aria-label="${escapeText(photo.alt ?? `이미지 ${index + 1}`)}">${photo.url ? `<img src="${escapeText(photo.url)}" alt="">` : imageIcon}</button>`
      ).join('')}</div>` : ''}
      <h2 id="eligible-detail-title">${escapeText(program.title)}</h2>
      <ul class="eligible-details">${metadata.filter(([, label]) => label).map(([icon, label]) =>
        `<li><svg aria-hidden="true"><use href="#${icon}"/></svg>${escapeText(label)}</li>`).join('')}</ul>
      <section class="eligible-detail-match">
        <header><h3>${escapeText(group.name)} ${escapeText(group.memberCount)}명 기준</h3>
          <span class="eligible-result ${result === 'ELIGIBLE' ? '' : 'needs-review'}">${result === 'ELIGIBLE' ? '참여 가능' : '확인 필요'}</span></header>
        ${rows.map(([label, description]) => `<div class="eligible-detail-check"><span aria-hidden="true">✓</span><strong>${escapeText(label)}</strong><small>${escapeText(description)}</small></div>`).join('')}
        ${careReview && (review || person) ? `<div class="eligible-detail-check warning"><span aria-hidden="true">ⓘ</span><strong>${escapeText(person?.alias ?? '확인 필요')}</strong><small>${escapeText(careReview.message)}</small></div>` : ''}
        ${rows.length || review || person ? '' : '<p>등록된 세부 지원 정보가 없어요.</p>'}
      </section>
      <section class="eligible-detail-facilities"><h3>편의시설</h3>
        <div class="eligible-tags">${(program.accessibilityTags ?? []).map(tag => `<span class="tag">${escapeText(tag)}</span>`).join('') || '<p>등록된 편의시설 정보가 없어요.</p>'}</div>
        ${program.description ? `<p>${escapeText(program.description)}</p>` : ''}
      </section>
      <label class="eligible-detail-inquiry" hidden>문의 문자<textarea rows="3"></textarea></label>
    </div>
    <footer class="eligible-detail-footer">
      <button class="pill" type="button" data-inquiry>문의 문자 쓰기</button>
      ${action.direct
        ? `<a class="pill primary" href="#prepare/${encodeURIComponent(program.programId)}/${encodeURIComponent(group.id)}">${escapeText(group.name)}로 신청하기</a>`
        : action.alreadyApplied
          ? `<a class="pill" href="#prepare/${encodeURIComponent(program.programId)}/${encodeURIComponent(group.id)}">신청 준비</a>`
          : '<button class="pill" type="button" disabled>신청 불가</button>'}
    </footer>`;

  let currentPhoto = 0;
  const photoFrame = eligibleDetailDialog.querySelector('.eligible-detail-photo');
  const counter = eligibleDetailDialog.querySelector('.eligible-detail-counter');
  const thumbnails = eligibleDetailDialog.querySelectorAll('[data-photo]');
  function showPhoto(index) {
    currentPhoto = (index + gallery.length) % gallery.length;
    const photo = gallery[currentPhoto];
    photoFrame.innerHTML = photo.url
      ? `<img src="${escapeText(photo.url)}" alt="${escapeText(photo.alt)}">`
      : `<span role="img" aria-label="${escapeText(photo.alt ?? '이미지 없음')}">${imageIcon}</span>`;
    counter.textContent = `${currentPhoto + 1}/${gallery.length}`;
    thumbnails.forEach((button, position) => button.setAttribute('aria-pressed', String(position === currentPhoto)));
  }
  eligibleDetailDialog.querySelectorAll('[data-step]').forEach(button => {
    button.addEventListener('click', () => showPhoto(currentPhoto + Number(button.dataset.step)));
  });
  thumbnails.forEach(button => button.addEventListener('click', () => showPhoto(Number(button.dataset.photo))));
  eligibleDetailDialog.querySelector('[data-inquiry]').addEventListener('click', () => {
    const inquiry = eligibleDetailDialog.querySelector('.eligible-detail-inquiry');
    const text = inquiry.querySelector('textarea');
    if (inquiry.hidden) {
      inquiry.hidden = false;
      text.value = `안녕하세요. ${program.title}에 ${group.name} ${group.memberCount}명이 참여할 수 있는지 문의드립니다.`;
    }
    text.focus();
  });
  eligibleDetailDialog.querySelector('footer a')?.addEventListener('click', () => eligibleDetailDialog.close());
  const card = trigger.closest('.eligible-card');
  card.classList.add('eligible-card-selected');
  eligibleDetailDialog.addEventListener('close', () => card.classList.remove('eligible-card-selected'), { once: true });
  showPhoto(0);
  eligibleDetailDialog.showModal();
}

eligibleDetailDialog.addEventListener('click', event => {
  if (event.target === eligibleDetailDialog) eligibleDetailDialog.close();
});

export function renderEligiblePage(otherContent, groupId, { groups, care, hasProgramApplication, escapeText, dateLabel, venueLabel }) {
  const group = groups.find(item => item.id === groupId) ?? groups[0];
  if (!group) {
    otherContent.innerHTML = '<p class="empty">참여 그룹을 먼저 만들어 주세요.</p>';
    return;
  }
  const groupCare = care.filter(item => item.groupId === group.id && item.applyToJudgement);
  otherContent.innerHTML = `
    <div class="eligible-controls">
      <label class="eligible-search"><svg aria-hidden="true"><use href="#search"/></svg><input type="search" id="eligible-search" aria-label="프로그램 검색" placeholder="수영, 도예, 장애인의 날 행사"></label>
      <div class="eligible-select${group.id === groupId ? ' is-selected' : ''}"><select id="eligible-group" aria-label="참여 그룹">${groups.map(item => `<option value="${escapeText(item.id)}" ${item.id === group.id ? 'selected' : ''}>${escapeText(item.name)} · ${escapeText(item.memberCount)}명</option>`).join('')}</select></div>
      <details class="eligible-care">
        <summary id="eligible-care-label"></summary>
        <div>${groupCare.map(item => `<label><input type="checkbox" value="${escapeText(item.id)}" checked> ${escapeText(item.alias)}</label>`).join('') || '<p>반영할 개별 케어가 없어요.</p>'}</div>
      </details>
      <div class="eligible-select"><select id="eligible-period" aria-label="일정 범위"><option value="month">이번 달</option><option value="all">전체 일정</option></select></div>
    </div>
    <div class="eligible-context">
      <div id="eligible-criteria" class="eligible-tags"></div>
      <div id="eligible-filters" class="eligible-filters" role="group" aria-label="참여 판정 필터">${eligibilityFilters.map(([value, label]) =>
        `<button type="button" data-result="${value}" aria-pressed="${value === 'ALL'}">${label} <span>0</span></button>`).join('')}</div>
    </div>
    <div id="eligible-grid" class="eligible-grid" aria-live="polite"></div>`;

  const grid = byId('eligible-grid');
  const search = byId('eligible-search');
  const period = byId('eligible-period');
  const filters = byId('eligible-filters');
  const careControl = otherContent.querySelector('.eligible-care');
  const careLabel = byId('eligible-care-label');
  const criteria = byId('eligible-criteria');
  const supportCodes = ['WHEELCHAIR', 'ACCESSIBLE_TOILET', 'COMPANION', 'EASY_LANGUAGE'];
  const supportTags = group.supports.filter(item => supportCodes.includes(item.code));
  let selectedCare = [];
  let items = [];
  let active = 'ALL';
  let request = 0;
  let loading = true;

  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-eligible-details]');
    if (!button) return;
    const item = items.find(entry => entry.program.programId === Number(button.dataset.eligibleDetails));
    if (item) openEligibleDetails(item, group, selectedCare, button, { hasProgramApplication, escapeText, dateLabel, venueLabel });
  });

  function updateResults() {
    const keyword = search.value.trim().toLocaleLowerCase('ko-KR');
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const matches = items.filter(({ program }) =>
      (period.value === 'all' || !program.startAt || program.startAt.startsWith(month)) &&
      [program.title, program.organizerName, venueLabel(program.venue)].some(value => value?.toLocaleLowerCase('ko-KR').includes(keyword))
    );
    for (const button of filters.querySelectorAll('button')) {
      const { result } = button.dataset;
      button.setAttribute('aria-pressed', String(result === active));
      button.querySelector('span').textContent = matches.filter(item => result === 'ALL' || item.result === result).length;
    }
    if (loading) return;
    grid.innerHTML = matches.filter(item => active === 'ALL' || item.result === active)
      .map(item => eligibleCard(item, group.id, selectedCare, { hasProgramApplication, escapeText, venueLabel })).join('') || '<p class="empty">조건에 맞는 프로그램이 없어요.</p>';
  }

  async function loadMatches() {
    const currentRequest = ++request;
    const careIds = [...careControl.querySelectorAll('input:checked')].map(input => Number(input.value));
    selectedCare = groupCare.filter(item => careIds.includes(item.id));
    careControl.classList.toggle('is-selected', careIds.length > 0);
    careLabel.textContent = careIds.length ? `개별 케어 함께 보기 ${careIds.length}명` : '개별 케어 함께 보기';
    criteria.innerHTML = '<span>이 조건으로 찾았어요</span>' +
      supportTags.map(item => `<span class="tag">${escapeText(item.code === 'WHEELCHAIR' && item.quantity != null ? `휠체어 ${item.quantity}명` : item.code === 'COMPANION' && item.ratio ? `동반 ${item.ratio.replace(':', '명당 ')}명` : item.label)}</span>`).join('') +
      (selectedCare.length ? `<span class="eligible-result">+ ${escapeText(selectedCare.map(item => item.alias).join(', '))}</span>` : '');
    loading = true;
    items = [];
    grid.innerHTML = '<p class="empty">프로그램을 불러오는 중이에요.</p>';
    updateResults();
    try {
      const response = await mockActivity.getEligiblePrograms(group.id, { careIds });
      if (!grid.isConnected || currentRequest !== request) return;
      items = response.items;
      loading = false;
      updateResults();
    } catch {
      if (grid.isConnected && currentRequest === request) {
        grid.innerHTML = '<p class="empty">프로그램을 불러오지 못했어요.</p>';
      }
    }
  }

  byId('eligible-group').addEventListener('change', event => {
    location.hash = `eligible/${event.target.value}`;
  });
  careControl.addEventListener('change', loadMatches);
  search.addEventListener('input', updateResults);
  period.addEventListener('change', updateResults);
  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-result]');
    if (!button) return;
    active = button.dataset.result;
    updateResults();
  });
  loadMatches();
}
