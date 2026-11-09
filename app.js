const groups = [
  {
    id: 'day-a', name: '주간활동 A', people: 8, available: 12, review: 5,
    needs: {
      이동: ['휠체어 3명', '보행 보조 2명', '차량 승하차 지원'],
      화장실: ['장애인 화장실 필요'],
      동반: ['동반 인력 1명당 2명'],
      의사소통: ['쉬운 말 안내', '그림 안내판'],
      환경: ['조용한 휴식 공간'],
    },
  },
  {
    id: 'day-b', name: '주간활동 B', people: 6, available: 21, review: 3,
    needs: {
      이동: ['보행 보조 1명'],
      동반: ['동반 인력 1명당 3명'],
      의사소통: ['쉬운 말 안내'],
      시간: ['90분 이내 활동'],
    },
  },
  {
    id: 'work', name: '직업재활반', people: 5, available: 0, review: 0,
    needs: { 이동: ['대중교통 이동 가능'] },
  },
];

const care = [
  { alias: '햇살', group: 'day-a', note: '출발 전에 활동 순서를 그림으로 안내해요.' },
  { alias: '구름', group: 'day-a', note: '이동 중간에 쉴 시간을 마련해요.' },
  { alias: '별빛', group: 'day-b', note: '새로운 장소에서는 동선을 먼저 안내해요.' },
  { alias: '새싹', group: 'work', note: '일정이 바뀌면 미리 알려줘요.' },
];

const metrics = [['휠체어 이용', 6], ['동반 인력 필요', 19], ['쉬운 말 안내', 14], ['장애인 화장실', 8]];
const categories = ['이동', '화장실', '동반', '의사소통', '환경', '시간'];
const byId = id => document.getElementById(id);
const editor = byId('editor');
const form = byId('editor-form');
let saveEditor;
let careFilter = '';

function escapeText(value) {
  const element = document.createElement('span');
  element.textContent = value;
  return element.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function renderGroups() {
  byId('group-count').textContent = groups.length;
  byId('group-links').innerHTML = groups.map(group =>
    `<a href="#${group.id}">${escapeText(group.name)} <small>${group.people}명</small></a>`
  ).join('');

  byId('groups-panel').innerHTML = groups.map(group => {
    const careCount = care.filter(item => item.group === group.id).length;
    const needs = Object.entries(group.needs).map(([category, tags]) =>
      `<dt>${category}</dt><dd>${tags.map(tag => `<span class="tag">${escapeText(tag)}</span>`).join('')}</dd>`
    ).join('');

    return `<article class="card" id="${group.id}" tabindex="-1">
      <header class="card-header">
        <div><h2>${escapeText(group.name)}</h2><span class="badge">${group.people}명 참여</span></div>
        <button class="text-button" data-edit="${group.id}" aria-label="${escapeText(group.name)} 수정">수정</button>
      </header>
      ${needs ? `<dl>${needs}</dl>` : '<p class="empty">등록된 지원 항목이 없어요.</p>'}
      <footer class="card-footer">
        <div class="counts">
          <span>참여 가능 <strong class="available">${group.available}</strong></span>
          <span>확인 필요 <strong class="review">${group.review}</strong></span>
          <span>개별 케어 <strong>${careCount}명</strong></span>
          <button class="text-button link" data-roster="${group.id}">명단 보기</button>
        </div>
        <button class="pill secondary" disabled title="프로그램 탐색은 준비 중이에요">이 그룹으로 프로그램 찾기</button>
      </footer>
    </article>`;
  }).join('');

  const total = groups.reduce((sum, group) => sum + group.people, 0);
  byId('total').textContent = total;
  byId('metrics').innerHTML = metrics.map(([label, count]) => `
    <div class="metric">
      <div class="metric-label"><span>${label}</span><strong>${count}명</strong></div>
      <progress value="${count}" max="${Math.max(total, count, 1)}" aria-label="${label}"></progress>
    </div>`
  ).join('');
}

function renderCare() {
  byId('care-count').textContent = care.length;
  const group = groups.find(item => item.id === careFilter);
  const entries = care.filter(item => !group || item.group === group.id);
  const heading = group
    ? `<div class="card-header"><h2>${escapeText(group.name)} 명단</h2><button id="clear-filter" class="text-button link">전체 명단 보기</button></div>`
    : '';
  byId('care-panel').innerHTML = heading + (entries.map(item => {
    const name = groups.find(entry => entry.id === item.group).name;
    return `<article class="card care-card">
      <div class="card-header"><h2>${escapeText(item.alias)}</h2><span class="badge">${escapeText(name)}</span></div>
      <p>${escapeText(item.note)}</p>
    </article>`;
  }).join('') || '<p class="empty">등록된 개별 케어가 없어요.</p>');
}

function showPanel(showCare, groupId = '') {
  careFilter = groupId;
  byId('groups-tab').setAttribute('aria-pressed', !showCare);
  byId('care-tab').setAttribute('aria-pressed', showCare);
  byId('groups-panel').hidden = showCare;
  byId('care-panel').hidden = !showCare;
  renderCare();
}

function openEditor(title, fields, save) {
  byId('editor-title').textContent = title;
  byId('editor-fields').innerHTML = fields;
  saveEditor = save;
  editor.showModal();
}

function editGroup(group) {
  const fields = categories.map(category =>
    `<label>${category}<input name="${category}" value="${escapeText(group?.needs[category]?.join(', ') ?? '')}" placeholder="쉼표로 항목 구분"></label>`
  ).join('');
  openEditor(group ? '공통 지원 그룹 수정' : '공통 지원 그룹 만들기', `
    <label>그룹 이름<input name="name" value="${escapeText(group?.name ?? '')}" required maxlength="50" pattern=".*\\S.*"></label>
    <label>참여 인원<input type="number" name="people" value="${group?.people ?? 1}" required min="1" max="999"></label>
    ${fields}`, data => {
    const needs = {};
    for (const category of categories) {
      const tags = data.get(category).split(',').map(tag => tag.trim()).filter(Boolean);
      if (tags.length) needs[category] = tags;
    }
    const updates = { name: data.get('name').trim(), people: Number(data.get('people')), needs };
    if (group) {
      Object.assign(group, updates);
    } else {
      groups.push({ id: `group-${groups.length + 1}`, available: 0, review: 0, ...updates });
    }
    renderGroups();
    showPanel(false);
  });
}

byId('groups-tab').addEventListener('click', () => showPanel(false));
byId('care-tab').addEventListener('click', () => showPanel(true));
byId('group-links').addEventListener('click', () => showPanel(false));
byId('groups-panel').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.dataset.edit) editGroup(groups.find(group => group.id === button.dataset.edit));
  if (button?.dataset.roster) {
    showPanel(true, button.dataset.roster);
    byId('care-tab').focus();
  }
});
byId('care-panel').addEventListener('click', event => {
  if (event.target.id === 'clear-filter') {
    showPanel(true);
    byId('care-tab').focus();
  }
});
byId('add-group').addEventListener('click', () => editGroup());
byId('add-care').addEventListener('click', () => {
  const options = groups.map(group =>
    `<option value="${group.id}" ${group.id === careFilter ? 'selected' : ''}>${escapeText(group.name)}</option>`
  ).join('');
  openEditor('개별 케어 추가', `
    <label>별칭<input name="alias" required maxlength="30" pattern=".*\\S.*"></label>
    <label>참여 그룹<select name="group">${options}</select></label>
    <label>지원 메모<textarea name="note" rows="4" required maxlength="300"></textarea></label>`, data => {
    care.push({ alias: data.get('alias').trim(), group: data.get('group'), note: data.get('note').trim() });
    renderGroups();
    showPanel(true);
  });
});
byId('cancel').addEventListener('click', () => editor.close());
form.addEventListener('submit', event => {
  event.preventDefault();
  saveEditor(new FormData(form));
  editor.close();
});

renderGroups();
renderCare();
