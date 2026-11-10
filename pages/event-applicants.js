import { programDeadline, programSchedule } from '../program-format.js';
import { renderReceivedReviews } from './event-received-reviews.js';

const statuses = [['all', '전체'], ['NEW', '새 신청'], ['INQUIRY', '문의 있음'], ['CONFIRMED', '확정']];
const sections = [['applicants', '신청 기관'], ['support', '필요 지원 모아보기'], ['reviews', '후기'], ['info', '행사 정보']];
const dateFormat = new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit' });
const count = value => Number(value) || 0;
const tags = item => item.supportNeeds ?? [];
const statusLabel = status => ({ WAITING: '대기', REJECTED: '거절' })[status] ?? statuses.find(([key]) => key === status)?.[1] ?? '미정';

function appliedDate(value) {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) return '—';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes >= 0 && minutes < 60) return minutes ? `${minutes}분 전` : '방금';
  return dateFormat.format(date);
}

export function renderEventApplicants(container, { event, escapeText, closeApplications, saveApplicant, savePreparationTask, saveReviewReply, initialSection }) {
  const entries = event.applicants ?? [];
  const sum = key => entries.reduce((total, entry) => total + count(entry[key]), 0);
  const users = sum('participantCount');
  const companions = sum('companionCount');
  const schedule = event.startAt ? programSchedule(event) : '일정 미정';
  const deadline = event.startAt ? programDeadline({ applyUntil: event.startAt }).label : '';
  let section = initialSection === 'reviews' ? 'reviews' : 'applicants';
  let openReviewPhotos;
  let filter = 'all';
  let savingTask = false;
  container.innerHTML = `
    <section class="event-applicants">
      <header class="event-applicant-header">
        <a class="icon-button event-applicant-back" href="#events" aria-label="행사 목록으로 돌아가기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>
        </a>
        <div><p class="event-muted">${escapeText([schedule, event.venue?.name, deadline].filter(Boolean).join(' · '))}</p><h1 id="event-applicant-title" tabindex="-1">${escapeText(event.title || '제목 없는 행사')}</h1></div>
        <div class="actions"><button type="button" class="pill" data-review-photos hidden>사진 모아보기</button><a class="pill" href="#events/${encodeURIComponent(event.eventId)}">행사 수정</a>${event.status === 'COMPLETED' ? '' : `<button type="button" class="pill" data-close-applications ${event.applicationsClosed ? 'disabled' : ''}>${event.applicationsClosed ? '신청 마감됨' : '신청 마감하기'}</button>`}</div>
      </header>
      <div class="event-tabs" role="group" aria-label="행사 상세 메뉴">${sections.map(([key, label]) => `<button type="button" data-section="${key}" aria-pressed="${key === section}">${label}${key === 'applicants' ? ` <span>${entries.length}</span>` : key === 'reviews' ? ` <span>${event.reviews?.length ?? 0}</span>` : ''}</button>`).join('')}</div>
      <p class="event-feedback" data-applicant-feedback role="status"></p>
      <div data-applicant-body></div>
      <dialog class="event-detail" aria-labelledby="applicant-dialog-title">
        <form method="dialog"><button class="icon-button" aria-label="닫기">×</button></form>
        <h2 id="applicant-dialog-title"></h2><div data-applicant-detail></div>
      </dialog>
      <dialog class="event-applicant-drawer" aria-labelledby="applicant-drawer-title"></dialog>
    </section>`;
  const page = container.firstElementChild;
  const body = page.querySelector('[data-applicant-body]');
  const dialog = page.querySelector('dialog');
  const drawer = page.querySelector('.event-applicant-drawer');
  const feedback = page.querySelector('[data-applicant-feedback]');

  function update() {
    body.onclick = null;
    page.querySelector('[data-review-photos]').hidden = section !== 'reviews';
    for (const button of page.querySelectorAll('[data-section]')) button.setAttribute('aria-pressed', String(button.dataset.section === section));
    const metrics = [['신청 인원', event.capacity ? `${users + companions} / ${count(event.capacity)}명` : `${users + companions}명`], ['이용자', `${users}명`], ['동반 인력', `${companions}명`], ['휠체어', `${sum('wheelchairCount')}명`], ['새 신청', `${entries.filter(entry => entry.status === 'NEW').length}건`]];
    const summary = `<div class="event-summary event-applicant-summary">${metrics.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`;
    if (section === 'support') {
      body.innerHTML = summary + renderSupportOverview(event.preparationTasks ?? [], entries, escapeText, savingTask);
      return;
    }
    if (section === 'reviews') {
      openReviewPhotos = renderReceivedReviews(body, { event, escapeText, saveReply: async (index, reply) => {
        event.reviews = await saveReviewReply(index, reply);
        return event.reviews;
      } });
      return;
    }
    if (section === 'info') {
      body.innerHTML = `<div class="event-panel"><h2>행사 정보</h2><p class="page-meta">${escapeText(schedule)} · ${escapeText(event.venue?.name || '장소 미정')}</p><p class="page-meta">${event.capacity ? `정원 ${count(event.capacity)}명 · ` : ''}${event.applicationsClosed ? '신청 마감' : '신청 가능'}</p><div class="event-chips">${(event.accessibilityTags ?? []).map(tag => `<span class="tag">${escapeText(tag)}</span>`).join('')}</div><p class="page-meta">${escapeText(event.notes)}</p></div>`;
      return;
    }
    const visible = entries.map((entry, index) => ({ entry, index })).filter(({ entry }) => filter === 'all' || entry.status === filter);
    body.innerHTML = `
      ${summary}
      <div class="event-applicant-toolbar">
        <div class="event-applicant-filters" role="group" aria-label="신청 상태">${statuses.map(([key, label]) => `<button type="button" data-filter-applicants="${key}" aria-pressed="${filter === key}">${label} ${key === 'all' ? entries.length : entries.filter(entry => entry.status === key).length}</button>`).join('')}</div>
        <div class="actions"><button type="button" class="text-button" data-download-applicants>명단 내려받기</button><button type="button" class="text-button link" data-copy-message>확정 기관에 안내 문자</button></div>
      </div>
      <div class="event-applicant-table"><table aria-label="신청 기관 목록"><thead><tr><th scope="col">신청 기관</th><th scope="col">인원</th><th scope="col">필요한 지원</th><th scope="col">개별 케어</th><th scope="col">상태</th><th scope="col">신청</th><th scope="col">상세</th></tr></thead><tbody>
        ${visible.map(({ entry, index }) => `<tr data-status="${escapeText(entry.status)}">
          <th scope="row"><strong>${escapeText(entry.organization)}</strong><small>${escapeText([entry.groupName, entry.managerName && '담당 ' + entry.managerName].filter(Boolean).join(' · '))}</small></th>
          <td><strong>${count(entry.participantCount)}명</strong><small>${entry.companionCount ? `동반 ${count(entry.companionCount)}명` : ''}</small></td>
          <td><div class="event-applicant-tags">${tags(entry).map(tag => `<span class="tag">${escapeText(tag)}</span>`).join('') || '—'}</div></td>
          <td>${entry.individualCareCount ? `${count(entry.individualCareCount)}명` : '없음'}</td><td><span class="event-applicant-badge">${statusLabel(entry.status)}</span></td>
          <td>${appliedDate(entry.appliedAt)}</td><td><button class="text-button link" type="button" data-applicant-index="${index}" aria-label="${escapeText(entry.organization)} 자세히">자세히</button></td>
        </tr>`).join('') || '<tr><td colspan="7">이 상태의 신청 기관이 없어요.</td></tr>'}
      </tbody></table></div>`;
  }

  page.addEventListener('click', async e => {
    const button = e.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.section || button.dataset.filterApplicants) {
      section = button.dataset.section ?? section;
      filter = button.dataset.filterApplicants ?? filter;
      update();
      page.querySelector(button.dataset.section ? `[data-section="${section}"]` : `[data-filter-applicants="${filter}"]`)?.focus();
    } else if (button.hasAttribute('data-review-photos')) {
      openReviewPhotos?.();
    } else if (button.hasAttribute('data-applicant-index')) {
      const index = Number(button.dataset.applicantIndex);
      openApplicantDrawer(drawer, entries[index], escapeText, async changes => {
        entries[index] = await saveApplicant(index, changes);
        if (changes.status) update();
        return entries[index];
      });
      drawer.addEventListener('close', () => {
        const trigger = page.querySelector(`[data-applicant-index="${index}"]`) ?? page.querySelector('[data-filter-applicants][aria-pressed="true"]');
        trigger?.focus();
      }, { once: true });
    } else if (button.hasAttribute('data-download-applicants')) {
      downloadList(entries);
    } else if (button.hasAttribute('data-copy-message')) {
      if (!entries.some(entry => entry.status === 'CONFIRMED')) {
        feedback.textContent = '확정된 기관이 없어요.';
        return;
      }
      dialog.querySelector('h2').textContent = '확정 기관에 안내 문자';
      const message = `안녕하세요. ${event.title} 참가가 확정되었습니다. ${schedule}, ${event.venue?.name || '장소는 추후 안내'}입니다.`;
      dialog.querySelector('[data-applicant-detail]').innerHTML = `<label>안내 문자 초안<textarea readonly rows="4">${escapeText(message)}</textarea></label>`;
      dialog.showModal();
      dialog.querySelector('textarea').select();
    } else if (button.hasAttribute('data-close-applications')) {
      button.disabled = true;
      try {
        await closeApplications();
        event.applicationsClosed = true;
        button.textContent = '신청 마감됨';
        feedback.textContent = '신청을 마감했어요.';
        if (section === 'info') update();
      } catch (error) {
        feedback.textContent = error.message;
        button.disabled = false;
      }
    }
  });
  body.addEventListener('change', async e => {
    const input = e.target.closest('[data-preparation-task]');
    if (!input || savingTask) return;
    const taskId = input.dataset.preparationTask;
    const ready = input.checked;
    savingTask = true;
    feedback.textContent = '';
    body.querySelectorAll('[data-preparation-task]').forEach(control => { control.disabled = true; });
    try {
      event.preparationTasks = await savePreparationTask(taskId, ready);
    } catch (error) {
      feedback.textContent = error.message;
    } finally {
      savingTask = false;
      if (section === 'support') {
        const restoreFocus = document.activeElement === input || document.activeElement === document.body;
        update();
        if (restoreFocus) [...body.querySelectorAll('[data-preparation-task]')].find(control => control.dataset.preparationTask === taskId)?.focus();
      }
    }
  });
  update();
}

function renderSupportOverview(tasks, entries, escapeText, saving) {
  const ready = tasks.filter(task => task.ready).length;
  const care = entries.flatMap(entry => (entry.individualCare ?? []).map(item => ({ ...item, organization: entry.organization })));
  const arrivals = entries.filter(entry => entry.arrivalTime).sort((a, b) => a.arrivalTime.localeCompare(b.arrivalTime));
  return `
    <div class="event-support-layout">
      <section class="event-support-tasks">
        <header><h2>행사 날 준비할 것</h2><span class="link">${ready} / ${tasks.length} 준비함</span></header>
        <ul>${tasks.map(task => `<li><label>
          <input type="checkbox" data-preparation-task="${escapeText(task.id)}" ${task.ready ? 'checked' : ''} ${saving ? 'disabled' : ''}>
          <span><strong>${escapeText(task.label)}</strong><small>${escapeText(task.note)}</small></span>
          <span class="event-support-tags">${(task.groups ?? []).map(group => `<span class="tag">${escapeText(group)}</span>`).join('')}</span>
        </label></li>`).join('') || '<li class="empty">등록된 준비 항목이 없어요.</li>'}</ul>
      </section>
      <div class="event-support-sidebar">
        <section class="event-panel"><header><h2>개별 케어 모아보기</h2><span>${care.length}명</span></header>
          <ul class="event-support-care">${care.map(item => `<li><strong>${escapeText(item.name)}</strong> <small>${escapeText(item.organization)}</small><p>${escapeText([item.title, item.note].filter(Boolean).join(' · '))}</p></li>`).join('') || '<li class="empty">등록된 개별 케어 내용이 없어요.</li>'}</ul>
        </section>
        <section class="event-panel"><h2>도착 순서</h2>
          <ul class="event-support-arrivals">${arrivals.map(entry => `<li><strong>${escapeText(entry.arrivalTime)}</strong><span>${escapeText(entry.organization)}</span><small>${escapeText(entry.transport)}</small></li>`).join('') || '<li class="empty">등록된 도착 일정이 없어요.</li>'}</ul>
        </section>
      </div>
    </div>`;
}

function openApplicantDrawer(drawer, initialEntry, escapeText, save) {
  let entry = initialEntry;
  let busy = false;
  const initialChecks = entry.supportChecklist ?? tags(entry).map(label => ({ label, ready: false }));
  const phone = String(entry.phone ?? '').replace(/[^\d+]/g, '');
  const date = new Date(entry.appliedAt);
  const dateLabel = Number.isFinite(date.getTime()) ? programSchedule({ startAt: entry.appliedAt }) + ' 신청' : '신청 시간 미정';
  drawer.innerHTML = `
    <div class="applicant-drawer-body">
      <header class="applicant-drawer-heading">
        <div data-status="${escapeText(entry.status)}"><span class="event-applicant-badge">${statusLabel(entry.status)}</span> <small>${escapeText(dateLabel)}</small></div>
        <form method="dialog"><button class="icon-button" aria-label="신청 상세 닫기" autofocus>×</button></form>
        <h2 id="applicant-drawer-title">${escapeText(entry.organization)}</h2>
        <p>${escapeText([entry.groupName, entry.submissionMethod].filter(Boolean).join(' · '))}</p>
      </header>
      <section><h3>담당자</h3><div class="applicant-drawer-contact">
        <div><strong>${escapeText(entry.managerName || '담당자 미정')}${entry.managerRole ? ' ' + escapeText(entry.managerRole) : ''}</strong><small>${escapeText([entry.phone, entry.contactHours].filter(Boolean).join(' · '))}</small></div>
        ${phone ? `<a class="pill" href="sms:${escapeText(phone)}">문자 보내기</a>` : ''}
      </div></section>
      <section><header><h3>함께 오는 사람</h3><small>총 ${count(entry.participantCount) + count(entry.companionCount)}명</small></header>
        <div class="applicant-drawer-people">${[['이용자', count(entry.participantCount) + '명'], ['동반 인력', count(entry.companionCount) + '명'], ['오는 방법', entry.transport || '미정']].map(([label, value]) => `<div><small>${label}</small><strong>${escapeText(value)}</strong></div>`).join('')}</div>
      </section>
      <section><header><h3>필요한 지원</h3><small data-check-progress></small></header><div class="applicant-drawer-checks" data-support-checks></div></section>
      <section><header><h3>개별 케어</h3><small>${count(entry.individualCareCount)}명</small></header>
        ${(entry.individualCare ?? []).map(item => `<div class="applicant-drawer-care"><strong>${escapeText(item.name)} · ${escapeText(item.title)}</strong><p>${escapeText(item.note)}</p></div>`).join('') || '<p class="applicant-drawer-note">등록된 개별 케어 내용이 없어요.</p>'}
      </section>
      <section><h3>남긴 말</h3><p class="applicant-drawer-note">${escapeText(entry.note || '남긴 말이 없어요.')}</p>
        <div data-applicant-replies></div>
        <form class="applicant-drawer-reply" data-reply><input name="message" aria-label="답장 쓰기" placeholder="답장 쓰기" maxlength="500" required><button class="pill" type="submit">보내기</button></form>
      </section>
      <p class="event-feedback" data-drawer-feedback role="status"></p>
    </div>
    <footer class="applicant-drawer-footer"><button type="button" class="text-button" data-decision="REJECTED">거절</button><button type="button" class="pill" data-decision="WAITING">대기로 두기</button><button type="button" class="pill primary" data-decision="CONFIRMED">신청 확정</button></footer>`;
  const checks = drawer.querySelector('[data-support-checks]');
  const feedback = drawer.querySelector('[data-drawer-feedback]');
  const replyForm = drawer.querySelector('[data-reply]');
  const renderChecks = () => {
    const list = entry.supportChecklist ?? initialChecks;
    drawer.querySelector('[data-check-progress]').textContent = `준비 ${list.filter(item => item.ready).length} / ${list.length}`;
    checks.innerHTML = list.map((item, index) => `<label><input type="checkbox" data-check-index="${index}" ${item.ready ? 'checked' : ''}><span><strong>${escapeText(item.label)}</strong>${item.note ? `<small>${escapeText(item.note)}</small>` : ''}</span><span class="applicant-check-state" data-ready="${Boolean(item.ready)}">${item.ready ? '준비함' : '확인 필요'}</span></label>`).join('') || '<p class="applicant-drawer-note">등록된 지원 항목이 없어요.</p>';
  };
  const renderReplies = () => {
    drawer.querySelector('[data-applicant-replies]').innerHTML = (entry.replies ?? []).map(reply => `<p class="applicant-drawer-note"><strong>내 답장</strong> · ${escapeText(reply.message)}</p>`).join('');
  };
  async function persist(changes, onSaved) {
    if (busy) return;
    busy = true;
    const controls = [...drawer.querySelectorAll('button, [data-check-index]')];
    controls.forEach(control => { control.disabled = true; });
    feedback.textContent = '';
    try {
      entry = await save(changes);
      onSaved();
    } catch (error) {
      feedback.textContent = error.message;
      renderChecks();
    } finally {
      busy = false;
      controls.forEach(control => { control.disabled = false; });
    }
  }
  drawer.oncancel = e => { if (busy) e.preventDefault(); };
  checks.addEventListener('change', e => {
    const input = e.target;
    const index = Number(input.dataset.checkIndex);
    const supportChecklist = (entry.supportChecklist ?? initialChecks).map((item, i) => i === index ? { ...item, ready: input.checked } : item);
    persist({ supportChecklist }, () => {
      renderChecks();
      checks.querySelector(`[data-check-index="${index}"]`)?.focus();
    });
  });
  replyForm.addEventListener('submit', e => {
    e.preventDefault();
    const message = replyForm.elements.message.value.trim();
    if (message) persist({ replies: [...(entry.replies ?? []), { message }] }, () => { replyForm.reset(); renderReplies(); });
  });
  drawer.querySelector('.applicant-drawer-footer').addEventListener('click', e => {
    const button = e.target.closest('[data-decision]');
    if (button) persist({ status: button.dataset.decision }, () => drawer.close());
  });
  renderChecks();
  renderReplies();
  drawer.showModal();
}

function downloadList(entries) {
  const rows = [['신청 기관', '이용자', '동반 인력', '필요한 지원', '개별 케어', '상태'],
    ...entries.map(entry => [entry.organization, count(entry.participantCount), count(entry.companionCount), tags(entry).join(', '), count(entry.individualCareCount), statusLabel(entry.status)])];
  const cell = value => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = '신청-기관-명단.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
