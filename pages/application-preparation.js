import { programSchedule } from '../program-format.js';

const byId = id => document.getElementById(id);

const receptionMethods = [['PHONE', '전화'], ['ONLINE', '온라인'], ['PAPER', '서면']];

export function renderApplicationPreparation(otherContent, programId, groupId, {
  programs, groups, care, applicationProfile, escapeText, venueLabel, groupOptions, refreshApplications,
}) {
  const selectablePrograms = programs.filter(item => !['INQUIRE', 'DETAILS'].includes(item.discoveryAction));
  const program = selectablePrograms.find(item => item.programId === programId);
  const group = groups.find(item => item.id === groupId) ?? groups[0];
  if (!program || !group) {
    if (!group || !selectablePrograms.length) {
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
          ${selectablePrograms.map(item => `<option value="${item.programId}">${escapeText(item.title)}</option>`).join('')}
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
  form.addEventListener('submit', event => submitApplication(event, refreshApplications));
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

async function submitApplication(event, refreshApplications) {
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
    await refreshApplications();
    if (form.isConnected) location.hash = 'applications';
  } catch (error) {
    errorMessage.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}
