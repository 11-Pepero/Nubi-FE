let groups = [];
let care = [];
let categories = [];
let summary;

async function loadSupport() {
  [groups, care, categories, summary] = await Promise.all([
    mockSupport.getGroups(), mockSupport.getCare(), mockSupport.getTags(), mockSupport.getSummary(),
  ]);
  byId('care-group-filter').innerHTML = `<option value="">그룹 전체</option>${groupOptions(careFilter)}`;
  const selectedCategory = byId('care-category-filter').value;
  byId('care-category-filter').innerHTML = '<option value="">케어 종류 전체</option>' + categories.map(({ category, label }) =>
    `<option value="${escapeText(category)}">${escapeText(label)}</option>`
  ).join('');
  byId('care-category-filter').value = categories.some(item => item.category === selectedCategory) ? selectedCategory : '';
  renderGroups();
  renderCare();
}

const byId = id => document.getElementById(id);
const editor = byId('editor');
const form = byId('editor-form');
let saveEditor;
let careFilter = null;

function escapeText(value) {
  const element = document.createElement('span');
  element.textContent = String(value ?? '');
  return element.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const summaryTagOrder = ['WHEELCHAIR', 'COMPANION', 'EASY_LANGUAGE', 'ACCESSIBLE_TOILET'];

function renderGroups() {
  byId('group-count').textContent = groups.length;
  byId('group-links').innerHTML = groups.map(group =>
    `<a href="#group-${group.id}">${escapeText(group.name)} <small>${group.memberCount}명</small></a>`
  ).join('');

  byId('groups-panel').innerHTML = groups.map(group => {
    const needs = categories.map(({ category, label }) => {
      const tags = group.supports.filter(item => item.category === category);
      if (!tags.length) return '';
      const badges = tags.map(({ code, label, quantity, ratio, note }) => {
        const companionRatio = code === 'COMPANION' && /^(\d+):(\d+)$/.exec(ratio ?? '');
        const tagLabel = companionRatio
          ? `동반 인력 ${companionRatio[1]}명당 ${companionRatio[2]}명`
          : label;
        const parts = [tagLabel, quantity == null ? null : `${quantity}명`, companionRatio ? null : ratio, note];
        return `<span class="tag">${escapeText(parts.filter(Boolean).join(' · '))}</span>`;
      }).join('');
      return `<dt>${escapeText(label)}</dt><dd>${badges}</dd>`;
    }).join('');

    return `<article class="card group-card" id="group-${group.id}" tabindex="-1">
      <header class="card-header">
        <div><h2>${escapeText(group.name)}</h2><span class="badge">${group.memberCount}명 참여</span></div>
        <button class="text-button" data-edit="${group.id}" aria-label="${escapeText(group.name)} 수정">수정</button>
      </header>
      ${needs ? `<dl>${needs}</dl>` : '<p class="empty">등록된 지원 항목이 없어요.</p>'}
      <footer class="card-footer">
        <div class="counts">
          <span>참여 가능 <strong class="available">${group.eligibleCount}</strong></span>
          <span>확인 필요 <strong class="review">${group.checkCount}</strong></span>
          <span>개별 케어 <strong>${group.careCount}명</strong></span>
          <button class="text-button link" data-roster="${group.id}">명단 보기</button>
        </div>
        <button class="pill secondary" data-programs="${group.id}">이 그룹으로 프로그램 찾기</button>
      </footer>
    </article>`;
  }).join('') || '<p class="empty">등록된 공통 지원 그룹이 없어요.</p>';

  const total = summary.memberCount;
  byId('total').textContent = total;
  const supportsByCode = new Map(summary.supports.map(item => [item.code, item]));
  const metrics = summaryTagOrder.map(code => supportsByCode.get(code)).filter(Boolean);
  byId('metrics').innerHTML = (metrics.length ? metrics : summary.supports.slice(0, 4)).map(({ label, count }) => `
    <div class="metric">
      <div class="metric-label"><span>${escapeText(label)}</span><strong>${count}명</strong></div>
      <progress value="${count}" max="${Math.max(total, count, 1)}" aria-label="${escapeText(label)}"></progress>
    </div>`
  ).join('');
}

function renderCare() {
  byId('care-count').textContent = care.length;
  const keyword = byId('care-search').value.trim().toLocaleLowerCase();
  const category = byId('care-category-filter').value;
  const entries = care.filter(item =>
    (careFilter == null || item.groupId === careFilter) &&
    (!category || item.items.some(entry => entry.category === category)) &&
    [item.alias, item.memo, ...item.items.flatMap(({ label, content }) => [label, content])]
      .some(value => value?.toLocaleLowerCase().includes(keyword))
  );
  byId('care-results-count').textContent = `${entries.length}명`;
  byId('care-rows').innerHTML = entries.map(item => `
    <tr>
      <th scope="row">${escapeText(item.alias)}</th>
      <td>${escapeText(item.groupName ?? '미지정')}</td>
      <td>${item.items.map(({ label, content }) => `<span class="tag">${escapeText(content || label)}</span>`).join('') || '—'}</td>
      <td><span class="badge ${item.applyToJudgement ? 'care-applied' : ''}">${item.applyToJudgement ? '판정에 반영' : '반영 안 함'}</span></td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty">표시할 개별 케어가 없어요.</td></tr>';
}

function showPanel(showCare, groupId = null) {
  careFilter = groupId;
  byId('care-group-filter').value = groupId ?? '';
  byId('groups-tab').setAttribute('aria-pressed', !showCare);
  byId('care-tab').setAttribute('aria-pressed', showCare);
  byId('groups-panel').hidden = showCare;
  byId('care-panel').hidden = !showCare;
  renderCare();
}

function openEditor(title, fields, save, { groupEditor = false } = {}) {
  editor.classList.toggle('group-editor', groupEditor);
  byId('group-editor-description').hidden = !groupEditor;
  if (groupEditor) editor.setAttribute('aria-describedby', 'group-editor-description');
  else editor.removeAttribute('aria-describedby');
  byId('editor-title').textContent = title;
  byId('editor-error').textContent = '';
  byId('editor-fields').innerHTML = fields;
  saveEditor = save;
  editor.showModal();
}

function editGroup(group) {
  const fields = categories.map(({ label, tags }, index) => `
    <details class="support-category" ${index === 0 ? 'open' : ''}>
      <summary><span>${escapeText(label)}</span><span class="category-chevron" aria-hidden="true"></span></summary>
      <div class="support-options">
      ${tags.map(tag => {
        const support = group?.supports.find(item => item.supportTagId === tag.id);
        return `<div class="support-option">
          <label><input type="checkbox" name="supportTagId" value="${tag.id}" ${support ? 'checked' : ''}> ${escapeText(tag.label)}</label>
          <fieldset class="support-details" ${support ? '' : 'hidden disabled'}>
            <label>필요 인원<input type="number" name="quantity-${tag.id}" min="1" max="1000" value="${support?.quantity ?? ''}"></label>
            <label>비율<input name="ratio-${tag.id}" maxlength="10" pattern="[1-9][0-9]*:[1-9][0-9]*" placeholder="1:2" value="${escapeText(support?.ratio ?? '')}"></label>
            <label>메모<input name="note-${tag.id}" maxlength="200" value="${escapeText(support?.note ?? '')}"></label>
          </fieldset>
        </div>`;
      }).join('')}
      </div>
    </details>`
  ).join('');
  openEditor(group ? '공통 지원 그룹 수정' : '공통 지원 그룹 만들기', `
    <section class="group-editor-basics" aria-label="그룹 정보">
      <label>그룹 이름<input name="name" placeholder="예: 주간활동 A" value="${escapeText(group?.name ?? '')}" required maxlength="50" pattern=".*\\S.*"></label>
      <label>참여 인원<input type="number" name="memberCount" value="${group?.memberCount ?? 1}" required min="1" max="1000"></label>
    </section>
    <div class="group-editor-section"><h3>공통 지원 항목</h3><p>필요한 항목을 선택하면 인원, 비율, 메모를 적을 수 있어요.</p></div>
    ${fields}`, async data => {
    const memberCount = Number(data.get('memberCount'));
    const supports = data.getAll('supportTagId').map(id => ({
      supportTagId: Number(id),
      quantity: Number(data.get(`quantity-${id}`)) || null,
      ratio: data.get(`ratio-${id}`).trim() || null,
      note: data.get(`note-${id}`).trim() || null,
    }));
    if (supports.some(item => item.quantity > memberCount)) {
      throw new Error('필요 인원은 그룹 참여 인원을 넘을 수 없어요.');
    }
    await mockSupport.saveGroup(group?.id ?? null, { name: data.get('name').trim(), memberCount, supports });
    await loadSupport();
    showPanel(false);
  }, { groupEditor: true });
}

form.addEventListener('invalid', event => {
  const category = event.target.closest('.support-category');
  if (category) category.open = true;
}, true);

byId('groups-tab').addEventListener('click', () => showPanel(false));
byId('care-tab').addEventListener('click', () => showPanel(true));

byId('groups-panel').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.dataset.edit) editGroup(groups.find(group => group.id === Number(button.dataset.edit)));
  if (button?.dataset.programs) location.hash = `eligible/${button.dataset.programs}`;
  if (button?.dataset.roster) {
    byId('care-search').value = '';
    byId('care-category-filter').value = '';
    showPanel(true, Number(button.dataset.roster));
    byId('care-tab').focus();
  }
});
const careEditor = byId('care-editor');
const careForm = byId('care-form');
const careItems = byId('care-editor-items');

function renderInheritedSupport() {
  const group = groups.find(item => item.id === Number(byId('care-editor-group').value));
  byId('care-inherited-items').innerHTML = (group?.supports ?? []).map(item =>
    `<span class="tag">${escapeText([item.label, item.quantity == null ? null : `${item.quantity}명`, item.ratio].filter(Boolean).join(' · '))}</span>`
  ).join('') || '<small>이어받는 공통 지원이 없어요.</small>';
}

function addCareItem() {
  if (careItems.children.length >= 30) return;
  const row = document.createElement('div');
  row.className = 'care-item-row';
  row.dataset.category = byId('care-tag-category').querySelector('[aria-pressed="true"]')?.dataset.category ?? '';
  row.innerHTML = `<input aria-label="케어 항목" list="care-tag-options" maxlength="200" placeholder="필요한 케어 입력">
    <button type="button" class="icon-button" data-remove-item aria-label="케어 항목 삭제">×</button>`;
  careItems.append(row);
  row.querySelector('input').focus();
}

function renderCareTags(selected = byId('care-tag-category').querySelector('[aria-pressed="true"]')?.dataset.category) {
  const tags = categories.find(item => item.category === selected)?.tags ?? [];
  byId('care-tag-options').innerHTML = tags.map(tag =>
    `<option value="${escapeText(tag.label)}"></option>`
  ).join('');
}

byId('care-search').addEventListener('input', renderCare);
byId('care-category-filter').addEventListener('change', renderCare);
byId('care-group-filter').addEventListener('change', event => {
  careFilter = Number(event.target.value) || null;
  renderCare();
});
byId('add-group').addEventListener('click', () => editGroup());
byId('add-care').addEventListener('click', () => {
  const groupId = careFilter ?? groups[0]?.id ?? null;
  showPanel(true, careFilter);
  careForm.reset();
  careItems.replaceChildren();
  byId('care-editor-error').textContent = '';
  byId('care-editor-group').innerHTML = `<option value="">미지정</option>${groupOptions(groupId)}`;
  byId('care-tag-category').innerHTML = categories.map(({ category, label }, index) =>
    `<button type="button" class="pill" data-category="${escapeText(category)}" aria-pressed="${index === 0}">${escapeText(label)}</button>`
  ).join('');
  renderInheritedSupport();
  renderCareTags();
  careEditor.showModal();
});
byId('care-editor-group').addEventListener('change', renderInheritedSupport);
byId('care-tag-category').addEventListener('click', event => {
  const selected = event.target.closest('[data-category]');
  if (!selected) return;
  for (const button of event.currentTarget.querySelectorAll('[data-category]')) {
    button.setAttribute('aria-pressed', String(button === selected));
  }
  renderCareTags();
});
careItems.addEventListener('focusin', event => {
  const category = event.target.closest('.care-item-row')?.dataset.category;
  if (category) renderCareTags(category);
});
byId('care-add-item').addEventListener('click', () => addCareItem());
careForm.addEventListener('click', event => {
  if (event.target.closest('[data-close-care]')) careEditor.close();
  const remove = event.target.closest('[data-remove-item]');
  if (remove) remove.closest('.care-item-row').remove();
});
careForm.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = careForm.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  const errorMessage = byId('care-editor-error');
  errorMessage.textContent = '';
  try {
    const data = new FormData(careForm);
    const items = [...careItems.children].map(row => {
      const content = row.querySelector('input').value.trim();
      const tags = categories.find(item => item.category === row.dataset.category)?.tags ?? [];
      const tag = tags.find(item => item.label === content);
      return { supportTagId: tag?.id ?? null, content: tag ? null : content || null };
    }).filter(item => item.supportTagId || item.content);
    await mockSupport.addCare({
      alias: data.get('alias').trim(),
      groupId: Number(data.get('groupId')) || null,
      memo: data.get('memo').trim() || null,
      items,
      applyToJudgement: data.has('applyToJudgement'),
    });
    await loadSupport();
    byId('care-search').value = '';
    byId('care-category-filter').value = '';
    showPanel(true);
    careEditor.close();
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
byId('cancel').addEventListener('click', () => editor.close());
form.addEventListener('change', event => {
  if (event.target.name !== 'supportTagId') return;
  const details = event.target.closest('.support-option').querySelector('.support-details');
  details.hidden = details.disabled = !event.target.checked;
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  submit.disabled = true;
  const errorMessage = byId('editor-error');
  errorMessage.textContent = '';
  try {
    await saveEditor(new FormData(form));
    editor.close();
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

const pageTitles = {
  support: '지원 관리',
  eligible: '참여 가능 프로그램',
  programs: '프로그램 탐색',
  prepare: '프로그램 신청 준비',
  applications: '신청 현황',
  events: '행사 관리',
  map: '사각지대 지도',
};
let programs = [];
let applications = [];
let events = [];
let places = [];
let notifications = [];
let unreadCount = 0;
let notificationPage = 0;
let notificationTotalPages = 0;
let notificationBusy = false;

async function loadActivity() {
  [programs, applications, events, places] = await Promise.all([
    mockActivity.getPrograms(), mockActivity.getApplications(), mockActivity.getEvents(), mockActivity.getPlaces(),
  ]);
}

let applicationProfile = {};

async function loadProfile() {
  const { organizationName, memberName } = (await mockActivity.getProfile()) ?? {};
  const name = organizationName?.trim();
  const member = memberName?.trim();
  applicationProfile = { name, member };
  byId('profile-avatar').textContent = name ? Array.from(name)[0] : '·';
  byId('profile-organization').textContent = name || '기관 정보 없음';
  byId('profile-member').textContent = member ? `담당자 ${member}` : '담당자 —';
}

async function loadNotifications(page = 0) {
  const [result, count] = await Promise.all([
    mockActivity.getNotifications({ page }), mockActivity.getUnreadCount(),
  ]);
  notifications = page ? [...notifications, ...result.content] : result.content;
  unreadCount = count.unreadCount;
  notificationPage = result.page;
  notificationTotalPages = result.totalPages;
  renderNotifications();
}
const notificationIcons = {
  new: '<rect x="5" y="3" width="10" height="18" rx="2"/><path d="M10 12h10m-4-4 4 4-4 4"/>',
  receipt: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  warning: '<path d="M10 4 3 18a1 1 0 0 0 1 2h16a1 1 0 0 0 1-2L14 4a2 2 0 0 0-4 0Z"/><path d="M12 9v4m0 3h.01"/>',
  deadline: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6h6"/>',
  program: '<path d="m10 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2zm8 11 1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>',
};
const notificationPanel = byId('notification-panel');
let notificationFilter = 'all';
let showArchived = false;

const otherContent = byId('other-content');
const detailsDialog = byId('details-dialog');

function showDetails(title, content) {
  byId('details-title').textContent = title;
  byId('details-content').innerHTML = content;
  if (!detailsDialog.open) detailsDialog.showModal();
}

const notificationTypes = {
  NEW_APPLICATION: ['application', 'new'],
  APPLICATION_DECIDED: ['receipt', 'receipt'],
  CARE_CHANGED: ['program', 'warning'],
  DEADLINE: ['application', 'deadline'],
  NEW_PROGRAM: ['program', 'program'],
  NEW_REVIEW: ['program', 'program'],
};
const applicationStatuses = {
  PREPARING: '신청 준비', SUBMITTED: '접수 기다림', RECEIVED: '접수 완료', INQUIRY: '문의 있음',
  WAITING: '대기 중', CONFIRMED: '참여 예정', ATTENDED: '다녀왔어요',
  REJECTED: '거절', CANCELLED: '취소',
};
const dateLabel = value => value?.slice(0, 10) ?? '일정 미정';
const venueLabel = venue => venue?.name ?? '장소 미정';

function notificationTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (!minutes) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  if (hours < 48) return '어제';
  return `${Math.floor(hours / 24)}일 전`;
}

function notificationTarget(item) {
  if (item.type === 'CARE_CHANGED') return { page: 'eligible', label: '프로그램 보기' };
  if (item.targetType === 'APPLICATION') {
    return { page: item.targetId == null ? 'applications' : `applications/${encodeURIComponent(item.targetId)}`, label: '신청 보기' };
  }
  if (item.targetType === 'PROGRAM') {
    return { page: item.targetId == null ? 'programs' : `programs/${encodeURIComponent(item.targetId)}`, label: '프로그램 보기' };
  }
  return null;
}
function renderNotifications() {
  const unread = unreadCount;
  byId('unread-count').textContent = unread;
  byId('unread-count').hidden = !unread;
  byId('open-notifications').setAttribute('aria-label', `알림함 열기, 읽지 않은 알림 ${unread}개`);
  const rows = notifications.map(item => {
    const [category, tone] = notificationTypes[item.type] ?? ['other', 'program'];
    if (notificationFilter !== 'all' && notificationFilter !== category) return '';
    const target = notificationTarget(item);
    const [message, ...details] = (item.body ?? '').split('\n');
    return `<li class="notification-row ${tone}${item.read ? '' : ' unread'}">
      <span class="notification-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${notificationIcons[tone]}</svg></span>
      <div class="notification-copy">
        <div class="notification-meta"><strong>${escapeText(item.title)}</strong>
          <span>${escapeText(notificationTime(item.createdAt))}${item.read ? '' : '<span class="notification-dot" role="img" aria-label="읽지 않음"></span>'}</span>
        </div>
        <p>${escapeText(message)}</p>
        ${details.length ? `<small>${escapeText(details.join(' '))}</small>` : ''}
        ${target ? `<a href="#${target.page}" data-notification="${escapeText(item.notificationId)}">${target.label}</a>` : ''}
      </div>
    </li>`;
  }).join('');
  notificationPanel.querySelector('.notification-history').hidden = !showArchived && notificationPage + 1 >= notificationTotalPages;
  byId('notification-list').innerHTML = rows || '<li class="notification-empty">이 분류에 표시할 알림이 없어요.</li>';
}

function renderProgramList(keyword = '') {
  const list = byId('program-list');
  const filtered = programs.filter(program =>
    [program.title, venueLabel(program.venue)].some(value => value.includes(keyword.trim()))
  );
  list.innerHTML = filtered.map(program => `
    <article class="card">
      <h2>${escapeText(program.title)}</h2>
      <p class="page-meta">${escapeText(dateLabel(program.startAt))} · ${escapeText(venueLabel(program.venue))}</p>
      <button class="pill" data-program="${program.programId}">상세 보기</button>
      <a class="pill primary" href="#prepare/${program.programId}">신청하기</a>
    </article>`).join('') || '<p class="empty">조건에 맞는 프로그램이 없어요.</p>';
}

const eligibilityFilters = [['ALL', '전체'], ['ELIGIBLE', '참여 가능'], ['NEEDS_REVIEW', '확인 필요']];

function programSchedule(program) {
  if (!program.startAt) return program.scheduleText ?? '일정 미정';
  const date = new Date(program.startAt);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(date);
}

function eligibleApplicationState({ program, result }, groupId) {
  const alreadyApplied = applications.some(item =>
    item.programId === program.programId && item.groupId === groupId &&
    !['PREPARING', 'CANCELLED'].includes(item.status)
  );
  const direct = result === 'ELIGIBLE' && program.canApplyDirectly && !alreadyApplied;
  return { direct, label: alreadyApplied ? '신청 준비' : '신청 불가' };
}

function programDeadline(program) {
  const now = new Date();
  const closesAt = new Date(program.applyUntil);
  let deadline = null;
  if (program.applyUntil && Number.isFinite(closesAt.getTime())) {
    deadline = closesAt <= now ? -1 : Math.ceil((closesAt - now) / 86400000);
    if (deadline > 0 && closesAt.toDateString() === now.toDateString()) deadline = 0;
  }
  return {
    soon: deadline !== null && deadline >= 0 && deadline <= 3,
    label: deadline === null ? '상시' : deadline < 0 ? '마감' : deadline === 0 ? 'D-day' : `D-${deadline}`,
  };
}

function eligibleCard(item, groupId, selectedCare) {
  const { program, result, review } = item;
  const available = result === 'ELIGIBLE';
  const action = eligibleApplicationState(item, groupId);
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
        : `<button class="pill" type="button" disabled>${action.label}</button>`}
    </footer>
  </article>`;
}

const eligibleDetailDialog = byId('eligible-detail-dialog');

function openEligibleDetails(item, group, selectedCare, trigger) {
  const { program, result, review } = item;
  const action = eligibleApplicationState(item, group.id);
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
        : `<button class="pill" type="button" disabled>${action.label}</button>`}
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

function renderEligiblePage(groupId) {
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
    if (item) openEligibleDetails(item, group, selectedCare, button);
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
      .map(item => eligibleCard(item, group.id, selectedCare)).join('') || '<p class="empty">조건에 맞는 프로그램이 없어요.</p>';
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

function groupOptions(selected) {
  return groups.map(group => `
    <option value="${group.id}" ${group.id === selected ? 'selected' : ''}>${escapeText(group.name)}</option>`).join('');
}

const receptionMethods = [['PHONE', '전화'], ['ONLINE', '온라인'], ['PAPER', '서면']];

function renderApplicationPreparation(programId, groupId) {
  const program = programs.find(item => item.programId === programId);
  const group = groups.find(item => item.id === groupId) ?? groups[0];
  if (!program || !group) {
    if (!group || !programs.length) {
      otherContent.innerHTML = `<p class="card">${group ? '신청을 준비할 프로그램이 없어요.' : '신청 준비를 시작하려면 지원 관리에서 참여 그룹을 만들어 주세요.'}</p>`;
      return;
    }
    otherContent.innerHTML = `<form id="prepare-selection" class="card prepare-selection">
      <header>
        <span class="prepare-selection-icon" aria-hidden="true"><svg><use href="#list"/></svg></span>
        <div><h2>프로그램과 참여 그룹 선택</h2>
          <p>함께 갈 프로그램과 그룹을 선택하면 신청서 초안과 접수 안내를 볼 수 있어요.</p></div>
      </header>
      <div class="page-form">
        <label>프로그램<select name="programId" required><option value="">프로그램을 선택해 주세요</option>
          ${programs.map(item => `<option value="${item.programId}">${escapeText(item.title)}</option>`).join('')}
        </select></label>
        <label>참여 그룹<select name="groupId" required>${groupOptions(group.id)}</select></label>
      </div>
      <p id="prepare-selection-preview" aria-live="polite" hidden></p>
      <button type="submit" class="pill primary">신청서 준비하기</button>
    </form>`;
    const selection = byId('prepare-selection');
    const programSelect = selection.elements.programId;
    const preview = byId('prepare-selection-preview');
    programSelect.addEventListener('change', () => {
      const selected = programs.find(item => item.programId === Number(programSelect.value));
      preview.hidden = !selected;
      preview.textContent = selected
        ? [selected.organizerName, programSchedule(selected), venueLabel(selected.venue)].filter(Boolean).join(' · ')
        : '';
    });
    selection.addEventListener('submit', event => {
      event.preventDefault();
      location.hash = `prepare/${encodeURIComponent(programSelect.value)}/${encodeURIComponent(selection.elements.groupId.value)}`;
    });
    return;
  }

  const method = receptionMethods.find(([value]) => value === program.applyMethod)?.[1] ?? '접수 방법 확인 필요';
  const contact = program.applicationContact ?? {};
  const participantCount = group.memberCount;
  const wheelchairCount = group.supports.find(item => item.code === 'WHEELCHAIR')?.quantity;
  const supportNeeds = group.supports.filter(item => ['WHEELCHAIR', 'ACCESSIBLE_TOILET', 'EASY_LANGUAGE'].includes(item.code))
    .map(item => item.code === 'WHEELCHAIR' && wheelchairCount ? `휠체어 이용자 ${wheelchairCount}명 자리` : item.label);
  const aliases = care.filter(item => item.groupId === group.id && item.applyToJudgement);
  const quietCare = aliases.find(item => item.items.some(need => need.code === 'QUIET_SPACE'));
  const review = quietCare ? program.applicationNotes : null;
  const questions = [
    wheelchairCount ? `휠체어 ${wheelchairCount}명 자리` : null,
    review && quietCare ? `${quietCare.alias} · 조용한 자리` : null,
  ].filter(Boolean);
  const phone = String(contact.phone ?? '').replace(/[^\d+]/g, '');
  const { name, member } = applicationProfile;

  byId('other-title').hidden = true;
  byId('other-page').setAttribute('aria-labelledby', 'prepare-title');
  otherContent.innerHTML = `
    <header class="prepare-heading">
      <a class="icon-button" href="#eligible/${group.id}" aria-label="참여 가능 프로그램으로 돌아가기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></a>
      <div><p>${escapeText([program.organizerName, method === '접수 방법 확인 필요' ? method : `${method} 접수`].filter(Boolean).join(' · '))}</p>
        <h1 id="prepare-title" tabindex="-1">${escapeText(program.title)}</h1></div>
      ${program.sourceUrl && /^https?:\/\//i.test(program.sourceUrl)
        ? `<a class="pill" href="${escapeText(program.sourceUrl)}" target="_blank" rel="noopener">원문 보기</a>`
        : `<button class="pill" type="button" data-program="${program.programId}">원문 보기</button>`}
    </header>
    <form id="application-form" class="prepare-layout" data-received="true">
      <input type="hidden" name="programId" value="${program.programId}">
      <input type="hidden" name="participantCount" value="${participantCount}">
      <div class="prepare-main">
        <section class="card">
          <header class="prepare-row"><h2>함께 가는 사람</h2>
            <select name="groupId" aria-label="참여 그룹">${groups.map(item => `<option value="${item.id}" ${item.id === group.id ? 'selected' : ''}>${escapeText(item.name)} · ${item.memberCount}명 + 동반 ${item.suggestedCompanionCount ?? 0}명</option>`).join('')}</select>
          </header>
          <div class="prepare-tags">
            ${(program.accessibilityTags ?? []).map(tag => `<span class="eligible-result">공고에 있어요 · ${escapeText(tag)}</span>`).join('')}
          </div>
          <div class="prepare-tags">
            ${questions.map(question => `<span class="eligible-result needs-review">물어봐야 해요 · ${escapeText(question)}</span>`).join('')}
          </div>
        </section>
        <section class="prepare-document">
          <header class="prepare-row"><h2><span class="prepare-sparkle" aria-hidden="true">✦</span> AI가 쓴 신청서</h2><div>
            <button type="button" class="text-button" id="prepare-reset">다시 쓰기</button>
            <button type="button" class="text-button link" id="prepare-print">PDF로 받기</button>
          </div></header>
          <div class="prepare-sheet">
            <h2>프로그램 참가 신청서</h2>
            <dl>
              <div><dt>신청 기관</dt><dd>${escapeText(name ?? '—')}</dd></div>
              <div><dt>담당자</dt><dd class="prepare-field"><span>${escapeText(member ?? '—')}</span><input type="tel" name="contact" aria-label="담당자 연락처" placeholder="직접 입력: 연락처"></dd></div>
              <div><dt>참가 인원</dt><dd class="prepare-field">
                <span>이용자 ${participantCount}명</span>
                <label class="prepare-companions">동반 인력 <input type="number" name="companionCount" min="0" max="1000" value="${group.suggestedCompanionCount ?? 0}" required>명</label>
                <span id="prepare-total"></span>
              </dd></div>
              <div><dt>필요한 지원</dt><dd>${escapeText(supportNeeds.join(', ') || '—')}</dd></div>
              <div><dt>미리 여쭐 점</dt><dd><textarea name="notes" aria-label="미리 여쭐 점" rows="2">${escapeText(review ?? '')}</textarea></dd></div>
            </dl>
          </div>
        </section>
      </div>
      <div class="prepare-side">
        <section class="card">
          <h2>접수하는 곳</h2>
          <div class="prepare-methods" role="group" aria-label="접수 방법">${receptionMethods.map(([value, label]) =>
            `<button type="button" data-method="${value}" aria-pressed="false">${label}</button>`).join('')}</div>
          <div id="prepare-reception"></div>
        </section>
        <section class="card">
          <h2><span class="prepare-sparkle" aria-hidden="true">✦</span> AI가 쓴 문의 문자</h2>
          <p id="prepare-message" class="prepare-note"></p>
          <div class="prepare-message-actions">
            <button class="pill" type="button" id="prepare-copy">복사하기</button>
            ${phone ? '<a class="pill" id="prepare-sms">문자로 보내기</a>' : ''}
          </div>
          <p id="prepare-copy-status" role="status"></p>
        </section>
        <button class="pill primary" type="submit">접수했어요, 완료로 표시</button>
        <p id="application-error" role="alert"></p>
      </div>
    </form>`;

  const form = byId('application-form');
  const methods = [...form.querySelectorAll('[data-method]')];
  const message = byId('prepare-message');
  const sms = byId('prepare-sms');
  const reception = byId('prepare-reception');
  let selectedMethod = program.applyMethod;

  function updateDraft() {
    const companions = form.elements.companionCount.valueAsNumber || 0;
    const total = participantCount + companions;
    form.elements.groupId.selectedOptions[0].textContent = `${group.name} · ${participantCount}명 + 동반 ${companions}명`;
    byId('prepare-total').textContent = `(총 ${total}명)`;
    const notes = form.elements.notes.value.trim();
    const supportQuestion = supportNeeds.length ? ` ${supportNeeds.join(', ')} 지원이 가능한지 알려 주실 수 있을까요?` : '';
    const request = `${program.title}에 이용자 ${participantCount}명과 동반 ${companions}명이 함께 가려고 해요.`;
    message.textContent = [name ? `안녕하세요, ${name}입니다.` : '안녕하세요.', request, supportQuestion.trim(), notes].filter(Boolean).join(' ');
    if (sms) sms.href = `sms:${phone}?body=${encodeURIComponent(message.textContent)}`;
    for (const button of methods) button.setAttribute('aria-pressed', String(button.dataset.method === selectedMethod));
    if (selectedMethod === 'PHONE' && phone) {
      reception.innerHTML = `<div class="prepare-note prepare-row">
        <div class="prepare-phone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/></svg>
          <div><small>${escapeText(contact.team)}</small><strong>${escapeText(contact.phone)}</strong></div>
        </div><small>${escapeText(contact.hours)}</small>
      </div>
      <div class="prepare-note"><small>통화할 때 이렇게 말해요</small><p>${escapeText(`${program.title}에 ${total}명 신청하려고 해요.` + supportQuestion + (notes ? ` ${notes}` : ''))}</p></div>`;
    } else {
      reception.innerHTML = '<p class="prepare-note">이 접수 방법의 안내 정보가 없어요.</p>';
    }
  }

  form.elements.groupId.addEventListener('change', event => {
    location.hash = `prepare/${program.programId}/${event.target.value}`;
  });
  for (const button of methods) button.addEventListener('click', () => {
    selectedMethod = button.dataset.method;
    updateDraft();
  });
  form.addEventListener('input', event => {
    if (event.target !== form.elements.groupId) updateDraft();
  });
  byId('prepare-reset').addEventListener('click', () => {
    form.reset();
    updateDraft();
  });
  byId('prepare-print').addEventListener('click', () => window.print());
  byId('prepare-copy').addEventListener('click', async () => {
    const status = byId('prepare-copy-status');
    try {
      await navigator.clipboard.writeText(message.textContent);
      status.textContent = '문자를 복사했어요.';
    } catch {
      status.textContent = '복사할 수 없어요. 문자 내용을 직접 선택해 주세요.';
    }
  });
  updateDraft();
}

function renderPage(focus = true) {
  const [route, id, group] = location.hash.slice(1).split('/');
  const groupAnchor = /^group-\d+$/.test(route);
  const page = Object.hasOwn(pageTitles, route) ? route : 'support';
  byId('support-page').hidden = page !== 'support';
  byId('other-page').hidden = page === 'support';
  byId('other-title').hidden = false;
  byId('other-page').setAttribute('aria-labelledby', 'other-title');
  const prepareLink = document.querySelector('.sidebar .prepare');
  if (page === 'prepare') prepareLink.setAttribute('aria-current', 'page');
  else prepareLink.removeAttribute('aria-current');
  document.title = `${pageTitles[page]} | Nubi`;
  for (const link of document.querySelectorAll('nav [data-page]')) {
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  if (page === 'support') {
    showPanel(false);
    const card = groupAnchor ? byId(route) : null;
    if (focus) (card ?? byId('support-title')).focus();
    return;
  }

  byId('other-title').textContent = pageTitles[page];
  if (page === 'eligible') {
    renderEligiblePage(Number(id));
  } else if (page === 'programs') {
    otherContent.innerHTML = `
      <div class="page-controls"><label>검색 <input id="program-search" type="search" placeholder="프로그램 또는 장소"></label></div>
      <div id="program-list" class="page-list"></div>`;
    byId('program-search').addEventListener('input', event => renderProgramList(event.target.value));
    renderProgramList();
    if (id) openProgram(Number(id), location.hash);
  } else if (page === 'prepare') {
    renderApplicationPreparation(Number(id), Number(group));
  } else if (page === 'applications') {
    otherContent.innerHTML = `<div class="page-list">${applications.map(item => `
    <article class="card" id="application-${item.applicationId}" tabindex="-1"><h2>${escapeText(item.programTitle)}</h2>
        <p class="page-meta">${escapeText(item.groupName ?? '미지정')} · ${escapeText(applicationStatuses[item.status] ?? item.status)}</p>
        <p class="page-meta">이용자 ${escapeText(item.participantCount)}명 · 동반 ${escapeText(item.companionCount)}명</p>
        ${item.status === 'PREPARING' ? `<button class="pill" data-cancel-application="${item.applicationId}">준비 취소</button>` : ''}
      </article>`).join('') || '<p class="empty">준비 중인 신청이 없어요.</p>'}</div>
      <p class="page-meta"><a class="pill" href="#prepare">프로그램 신청 준비</a></p>`;
  } else if (page === 'events') {
    otherContent.innerHTML = `
      <p class="page-meta"><button class="pill primary" data-event="0">행사 추가</button></p>
      <div class="page-list">${events.map(event => `<article class="card"><h2>${escapeText(event.title)}</h2>
        <p class="page-meta">${escapeText(dateLabel(event.startAt))} · ${escapeText(venueLabel(event.venue))}</p>
        <p class="page-meta">신청 기관 ${escapeText(event.applicationOrgCount)}곳 · 참여 ${escapeText(event.participantCount)}명</p><button class="pill" data-event="${event.eventId}">행사 수정</button></article>`).join('')}</div>`;
  } else {
    otherContent.innerHTML = `<p class="page-meta">지역별 예시 장소의 접근 정보를 확인할 수 있어요.</p>
      <div class="area-map">${places.map((place) => `
        <button class="card area-marker" data-place="${place.venueId}"><strong>${escapeText(place.district)}</strong><span>${escapeText(place.name)}</span></button>`).join('')}</div>`;
  }
  const application = page === 'applications' && id ? byId(`application-${Number(id)}`) : null;
  if (focus) (application || byId('prepare-title') || byId('other-title')).focus();
}

async function openProgram(id, hash = location.hash) {
  const item = await mockActivity.getProgram(id);
  if (!item || location.hash !== hash) return;
  showDetails(item.title, `
    <p class="page-meta">${escapeText(programSchedule(item))} · ${escapeText(venueLabel(item.venue))}</p>
    ${item.capacity == null ? '' : `<p class="page-meta">정원 ${escapeText(item.capacity)}명</p>`}
    <p>${escapeText(item.description ?? '등록된 활동 내용이 없어요.')}</p>
    ${hash.startsWith('#prepare') ? '' : `<p class="page-meta"><a class="pill primary" href="#prepare/${item.programId}">신청하기</a></p>`}`);
  byId('details-content').querySelector('a')?.addEventListener('click', () => detailsDialog.close());
}

otherContent.addEventListener('submit', async event => {
  if (event.target.id !== 'application-form') return;
  event.preventDefault();
  const form = event.target;
  const submit = form.querySelector('[type="submit"]');
  if (submit.disabled) return;
  const data = new FormData(form);
  const errorMessage = byId('application-error');
  errorMessage.textContent = '';
  submit.disabled = true;
  try {
    await mockActivity.prepareApplication({
      programId: Number(data.get('programId')),
      groupId: Number(data.get('groupId')),
      participantCount: data.get('participantCount') === '' ? null : Number(data.get('participantCount')),
      companionCount: Number(data.get('companionCount')),
      careIds: [],
      received: form.dataset.received === 'true',
    });
    applications = await mockActivity.getApplications();
    if (form.isConnected) location.hash = 'applications';
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

otherContent.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { program, cancelApplication, event: eventId, place } = button.dataset;
  if (program) await openProgram(Number(program));
  if (cancelApplication) {
    button.disabled = true;
    try {
      await mockActivity.cancelApplication(Number(cancelApplication));
      applications = await mockActivity.getApplications();
      if (button.isConnected) renderPage();
    } finally {
      button.disabled = false;
    }
  }
  if (eventId !== undefined) {
    const item = events.find(entry => entry.eventId === Number(eventId));
    openEditor(item ? '행사 수정' : '행사 추가', `
      <label>행사 이름<input name="title" required maxlength="80" pattern=".*\\S.*" value="${escapeText(item?.title ?? '')}"></label>
      <label>날짜<input name="date" type="date" required value="${escapeText(item?.startAt?.slice(0, 10) ?? '')}"></label>
      <label>장소<input name="place" required maxlength="80" pattern=".*\\S.*" value="${escapeText(item?.venue?.name ?? '')}"></label>`, async data => {
      await mockActivity.saveEvent(item?.eventId ?? null, {
        title: data.get('title').trim(),
        startAt: `${data.get('date')}${item?.startAt?.slice(10) || 'T09:00:00'}`,
        venue: { name: data.get('place').trim() },
      });
      events = await mockActivity.getEvents();
      renderPage(false);
    });
  }
  if (place !== undefined) {
    const item = places.find(entry => entry.venueId === Number(place));
    showDetails(item.name, `<p class="page-meta">${escapeText(item.district)}</p><p>${escapeText(item.detail ?? item.address ?? '')}</p>`);
  }
});

notificationPanel.addEventListener('click', async event => {
  const filter = event.target.closest('[data-filter]');
  if (filter) {
    notificationFilter = filter.dataset.filter;
    for (const button of notificationPanel.querySelectorAll('[data-filter]')) {
      button.setAttribute('aria-pressed', String(button === filter));
    }
    renderNotifications();
    byId('notification-list').scrollTop = 0;
    return;
  }

  const readAll = event.target.closest('[data-read-all]');
  const history = event.target.closest('.notification-history');
  const link = event.target.closest('[data-notification]');
  if (link) event.preventDefault();
  if (notificationBusy || !(readAll || history || link)) return;
  notificationBusy = true;
  const errorMessage = byId('notification-error');
  errorMessage.textContent = '';
  try {
    if (readAll) {
      const result = await mockActivity.readAllNotifications();
      unreadCount = result.unreadCount;
      notifications = notifications.map(item => ({ ...item, read: true }));
      renderNotifications();
    }
    if (history) {
      if (notificationPage + 1 < notificationTotalPages) {
        await loadNotifications(notificationPage + 1);
        showArchived = true;
        const list = byId('notification-list');
        list.scrollTop = list.scrollHeight;
      } else {
        await loadNotifications();
        showArchived = false;
      }
      history.setAttribute('aria-expanded', String(showArchived));
      history.textContent = showArchived && notificationPage + 1 >= notificationTotalPages ? '지난 알림 접기' : '지난 알림 모두 보기';
      renderNotifications();
    }
    if (link) {
      const id = Number(link.dataset.notification);
      const current = notifications.find(item => item.notificationId === id);
      if (!current) return;
      const item = current.read ? current : await mockActivity.readNotification(id);
      const target = notificationTarget(item);
      notifications = notifications.map(entry => entry.notificationId === id ? item : entry);
      ({ unreadCount } = await mockActivity.getUnreadCount());
      renderNotifications();
      notificationPanel.hidePopover();
      if (location.hash === `#${target.page}`) renderPage();
      else location.hash = target.page;
    }
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    notificationBusy = false;
  }
});
notificationPanel.addEventListener('beforetoggle', event => {
  if (event.newState !== 'open') return;
  const { right, bottom } = byId('open-notifications').getBoundingClientRect();
  notificationPanel.style.setProperty('--notification-left', `${Math.max(8, Math.min(right - 32, document.documentElement.clientWidth - 470))}px`);
  notificationPanel.style.setProperty('--notification-top', `${bottom + 8}px`);
});
renderNotifications();
document.querySelector('.sidebar').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link?.hash && link.hash === location.hash) renderPage();
});
byId('toggle-menu').addEventListener('click', event => {
  const button = event.currentTarget;
  const sidebarContent = byId('sidebar-content');
  sidebarContent.hidden = !sidebarContent.hidden;
  button.setAttribute('aria-expanded', String(!sidebarContent.hidden));
  button.setAttribute('aria-label', sidebarContent.hidden ? '메뉴 펼치기' : '메뉴 접기');
});
byId('toggle-theme').addEventListener('click', event => {
  const dark = document.documentElement.classList.toggle('dark');
  event.currentTarget.setAttribute('aria-pressed', String(dark));
});
window.addEventListener('hashchange', () => renderPage());

const profileReady = loadProfile().catch(() => {
  byId('profile-organization').textContent = '기관 정보를 불러오지 못했어요';
});
Promise.all([loadSupport(), loadActivity(), profileReady]).then(() => renderPage(Boolean(location.hash)));
loadNotifications().catch(error => { byId('notification-error').textContent = error.message; });
