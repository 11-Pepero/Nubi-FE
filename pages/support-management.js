import { apiEnabled, apiRequest } from './api-client.js';

const supportApi = apiEnabled ? {
  getGroups: () => apiRequest('/groups'),
  getCare: () => apiRequest('/care-persons'),
  getTags: () => apiRequest('/support-tags'),
  getSummary: () => apiRequest('/groups/summary'),
  saveGroup: (id, body) => apiRequest(id == null ? '/groups' : `/groups/${id}`, { method: id == null ? 'POST' : 'PUT', body }),
  addCare: body => apiRequest('/care-persons', { method: 'POST', body }),
} : mockSupport;

export let groups = [];
export let care = [];
let categories = [];
let summary;

export async function loadSupport() {
  [groups, care, categories, summary] = await Promise.all([
    supportApi.getGroups(), supportApi.getCare(), supportApi.getTags(), supportApi.getSummary(),
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

export function showPanel(showCare, groupId = null) {
  careFilter = groupId;
  byId('care-group-filter').value = groupId ?? '';
  byId('groups-tab').setAttribute('aria-pressed', !showCare);
  byId('care-tab').setAttribute('aria-pressed', showCare);
  byId('groups-panel').hidden = showCare;
  byId('care-panel').hidden = !showCare;
  renderCare();
}

export function openEditor(title, fields, save, { groupEditor = false } = {}) {
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
    await supportApi.saveGroup(group?.id ?? null, { name: data.get('name').trim(), memberCount, supports });
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
    await supportApi.addCare({
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

export function groupOptions(selected) {
  return groups.map(group => `
    <option value="${group.id}" ${group.id === selected ? 'selected' : ''}>${escapeText(group.name)}</option>`).join('');
}
