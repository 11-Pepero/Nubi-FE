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
let eligibleRequest = 0;

async function loadActivity() {
  [programs, applications, events, places] = await Promise.all([
    mockActivity.getPrograms(), mockActivity.getApplications(), mockActivity.getEvents(), mockActivity.getPlaces(),
  ]);
}

async function loadProfile() {
  const { organizationName, memberName } = (await mockActivity.getProfile()) ?? {};
  const name = organizationName?.trim();
  const member = memberName?.trim();
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
  PREPARING: '신청 준비', SUBMITTED: '접수 기다림', INQUIRY: '문의 있음',
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

async function renderProgramList(page, groupId, keyword = '') {
  const list = byId('program-list');
  const request = ++eligibleRequest;
  const options = page === 'eligible' && groupId
    ? (await mockActivity.getEligiblePrograms(groupId)).filter(item => item.result === 'ELIGIBLE').map(item => item.program)
    : programs;
  if (!list.isConnected || request !== eligibleRequest) return;
  const filtered = options.filter(program =>
    [program.title, venueLabel(program.venue)].some(value => value.includes(keyword.trim()))
  );
  byId('program-list').innerHTML = filtered.map(program => `
    <article class="card">
      <h2>${escapeText(program.title)}</h2>
      <p class="page-meta">${escapeText(dateLabel(program.startAt))} · ${escapeText(venueLabel(program.venue))}</p>
      <button class="pill" data-program="${program.programId}">상세 보기</button>
      <a class="pill primary" href="#prepare/${program.programId}${groupId ? `/${groupId}` : ''}">신청 준비</a>
    </article>`).join('') || '<p class="empty">조건에 맞는 프로그램이 없어요.</p>';
}

function groupOptions(selected) {
  return groups.map(group => `
    <option value="${group.id}" ${group.id === selected ? 'selected' : ''}>${escapeText(group.name)}</option>`).join('');
}

function renderPage(focus = true) {
  const [route, id, group] = location.hash.slice(1).split('/');
  const groupAnchor = /^group-\d+$/.test(route);
  const page = Object.hasOwn(pageTitles, route) ? route : 'support';
  byId('support-page').hidden = page !== 'support';
  byId('other-page').hidden = page === 'support';
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
  if (page === 'programs' || page === 'eligible') {
    otherContent.innerHTML = `
      <div class="page-controls"><label>검색 <input id="program-search" type="search" placeholder="프로그램 또는 장소"></label>
      ${page === 'eligible' ? `<label>참여 그룹 <select id="program-group"><option value="">전체 그룹</option>${groupOptions(Number(id))}</select></label>` : ''}</div>
      <div id="program-list" class="page-list"></div>`;
    const update = () => renderProgramList(page, Number(byId('program-group')?.value), byId('program-search').value);
    byId('program-search').addEventListener('input', update);
    byId('program-group')?.addEventListener('change', update);
    update();
    if (page === 'programs' && id) openProgram(Number(id), location.hash);
  } else if (page === 'prepare') {
    otherContent.innerHTML = `
      <form id="application-form" class="card page-form">
        <label>프로그램<select name="programId" required><option value="">프로그램 선택</option>
          ${programs.map(program => `<option value="${program.programId}" ${program.programId === Number(id) ? 'selected' : ''}>${escapeText(program.title)}</option>`).join('')}
        </select></label>
        <label>참여 그룹<select name="groupId" required><option value="">그룹 선택</option>${groupOptions(Number(group))}</select></label>
        <label>신청 인원<input name="participantCount" type="number" min="1" max="1000" placeholder="그룹 인원"></label>
        <label>동반 인원<input name="companionCount" type="number" min="0" max="1000" value="0"></label>
        <button class="pill primary" type="submit">신청 준비 저장</button>
        <p id="application-error" role="alert"></p>
      </form>`;
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
  if (focus) (application || byId('other-title')).focus();
}

async function openProgram(id, hash = location.hash) {
  const item = await mockActivity.getProgram(id);
  if (!item || location.hash !== hash) return;
  showDetails(item.title, `
    <p class="page-meta">${escapeText(dateLabel(item.startAt))} · ${escapeText(venueLabel(item.venue))}</p>
    ${item.capacity == null ? '' : `<p class="page-meta">정원 ${escapeText(item.capacity)}명</p>`}
    <p>${escapeText(item.description ?? '등록된 활동 내용이 없어요.')}</p>`);
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

Promise.all([loadSupport(), loadActivity()]).then(() => renderPage(Boolean(location.hash)));
loadProfile().catch(() => {
  byId('profile-organization').textContent = '기관 정보를 불러오지 못했어요';
});
loadNotifications().catch(error => { byId('notification-error').textContent = error.message; });
