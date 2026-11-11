import { programDeadline, programSchedule } from '../program-format.js';

const stages = [
  { key: 'preparing', label: '준비 중', note: '신청서와 문의문을 만들었어요', statuses: ['PREPARING'] },
  { key: 'waiting', label: '접수 기다림', note: '기관 답을 기다리고 있어요', statuses: ['SUBMITTED', 'INQUIRY', 'WAITING'] },
  { key: 'confirmed', label: '참여 예정', note: '참가 안내를 확인해 주세요', statuses: ['RECEIVED', 'CONFIRMED'] },
  { key: 'attended', label: '다녀왔어요', note: '참여 후기를 남겨 보세요', statuses: ['ATTENDED'] },
];
const steps = ['준비', '접수', '참여', '후기'];
const methods = { PHONE: '전화 접수', ONLINE: '온라인 접수', PAPER: '서면 접수' };

export function renderApplicationStatus(container, { applications, programs, escapeText, markReceived, cancel }) {
  const rows = applications.map(item => ({
    item,
    program: programs.find(program => program.programId === item.programId),
    stage: stages.findIndex(stage => stage.statuses.includes(item.status)),
  }));
  const count = key => key === 'all' ? rows.length : rows.filter(row => stages[row.stage]?.key === key).length;
  container.innerHTML = `
    <section class="application-status" aria-label="프로그램 신청 현황">
      <div class="application-summary">${stages.map(stage => `
        <div class="application-summary-card" data-stage="${stage.key}">
          <span>${stage.label}</span><strong>${count(stage.key)}</strong><small>${stage.note}</small>
        </div>`).join('')}</div>
      <div class="application-filters" role="group" aria-label="신청 상태">
        ${[{ key: 'all', label: '전체' }, ...stages].map(({ key, label }) => `
          <button type="button" data-stage="${key}" aria-pressed="${key === 'all'}">${label} <span>${count(key)}</span></button>`).join('')}
      </div>
      <div class="application-rows"></div>
      <p class="application-note">외부 기관 접수는 대신 넣지 않아요. 담당자가 직접 접수한 뒤 접수 완료를 눌러 주세요.</p>
      <p class="application-error" role="alert"></p>
    </section>`;
  const page = container.firstElementChild;
  const list = page.querySelector('.application-rows');
  const filters = page.querySelector('.application-filters');
  function update(key) {
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.stage === key));
    list.innerHTML = rows.filter(row => key === 'all' || stages[row.stage]?.key === key)
      .map(row => applicationRow(row, escapeText)).join('') || '<p class="empty">이 상태의 신청 내역이 없어요.</p>';
  }
  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-stage]');
    if (button) update(button.dataset.stage);
  });
  list.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const item = rows.find(({ item }) => String(item.applicationId) === button.closest('[data-application-id]').dataset.applicationId)?.item;
    if (!item) return;
    const isCancel = button.dataset.action === 'cancel';
    if (isCancel && !window.confirm('신청 준비를 취소할까요?')) return;
    const error = page.querySelector('.application-error');
    button.disabled = true;
    error.textContent = '';
    try {
      await (isCancel ? cancel : markReceived)(item.applicationId);
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      button.disabled = false;
    }
  });
  update('all');
}

function applicationRow({ item, program, stage }, escapeText) {
  const id = escapeText(item.applicationId);
  const prepare = `#prepare/${encodeURIComponent(item.programId)}/${encodeURIComponent(item.groupId)}`;
  const deadline = program && stage === 2 ? programDeadline(program) : null;
  const method = item.applyMethod ?? program?.applyMethod;
  const direct = item.canApplyDirectly ?? program?.canApplyDirectly;
  const startAt = item.startAt ?? program?.startAt;
  const metadata = [item.organizerName ?? program?.organizerName ?? item.venueName, startAt ? programSchedule({ startAt }) : program?.scheduleText].filter(Boolean);
  const people = [item.participantCount == null ? null : `${item.participantCount}명`, item.companionCount ? `동반 ${item.companionCount}명` : null].filter(Boolean);
  let action = '';
  if (stage === 0) {
    const url = item.applicationUrl ?? program?.applicationUrl ?? item.sourceUrl ?? program?.sourceUrl ?? '';
    const hasOnlineLink = method === 'ONLINE' && /^https?:\/\//i.test(url);
    const label = method === 'ONLINE' ? '접수 링크 열기' : '신청서 이어 쓰기';
    action = `<a class="pill" href="${hasOnlineLink ? escapeText(url) : prepare}"${hasOnlineLink ? ' target="_blank" rel="noopener"' : ''}>${label}</a> <button class="pill" type="button" data-action="cancel">준비 취소</button>`;
  } else if (item.status === 'SUBMITTED' && !direct) {
    action = '<button class="pill primary" type="button" data-action="receive">접수 완료 표시</button>';
  } else if (stage === 1 || stage === 2) {
    action = `<button class="pill" type="button" data-program="${escapeText(item.programId)}">참가 안내 보기</button>`;
  } else if (stage === 3) {
    action = `<a class="pill" href="#applications/review/${encodeURIComponent(item.applicationId)}">${(item.reviewId ?? item.review) ? '후기 수정' : '후기 남기기'}</a>`;
  }
  return `<article class="application-row" id="application-${id}" data-application-id="${id}" tabindex="-1">
    <div><h2>${escapeText(item.programTitle ?? program?.title ?? '프로그램')}
      ${deadline?.label.startsWith('D-') ? `<span class="application-deadline">${deadline.label}</span>` : ''}</h2>
      <p>${escapeText(metadata.join(' · '))}</p></div>
    <div><strong>${escapeText(item.groupName ?? '미지정')}</strong><p>${escapeText(people.join(' + '))}</p></div>
    <span class="application-method${direct ? ' direct' : ''}">${direct ? '바로 신청' : methods[method] ?? '접수 방법 미정'}</span>
    ${stage < 0 ? `<span class="application-inactive">${({ CANCELLED: '취소', REJECTED: '거절' })[item.status] ?? '상태 확인 필요'}</span>` :
      `<ol class="application-steps" aria-label="신청 진행 단계">${steps.map((step, index) =>
        `<li class="${index < stage || (index === 3 && (item.reviewId ?? item.review)) ? 'is-done' : index === stage ? 'is-current' : ''}" ${index === stage ? 'aria-current="step"' : ''}>${step}</li>`).join('')}</ol>`}
    <div class="application-actions">${action}</div>
  </article>`;
}
