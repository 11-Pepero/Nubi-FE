export function renderProgramDiscovery(container, { programs, escapeText, hasProgramApplication, programDeadline, programSchedule }) {
  const categories = [...new Set(programs.map(item => item.category).filter(Boolean))];
  const districts = [...new Set(programs.map(item => item.district ?? item.venue?.district).filter(Boolean))];
  const monthLabels = [...new Set(programs.map(item => item.startAt?.slice(0, 7)).filter(Boolean))].sort();
  const methodLabels = { ONLINE: '온라인', PHONE: '전화', PAPER: '서면' };
  const options = values => values.map(value => `<option value="${escapeText(value)}">${escapeText(value)}</option>`).join('');
  container.innerHTML = `
    <section class="discovery" aria-label="프로그램 검색 결과">
      <div class="discovery-controls">
        <label class="eligible-search"><svg aria-hidden="true"><use href="#search"/></svg><input id="program-search" type="search" aria-label="프로그램 검색" placeholder="프로그램, 기관, 장소로 찾기"></label>
        <div class="eligible-select"><select id="discovery-category" aria-label="분야"><option value="">분야 전체</option>${options(categories)}</select></div>
        <div class="eligible-select"><select id="discovery-district" aria-label="지역"><option value="">구 전체</option>${options(districts)}</select></div>
        <div class="eligible-select"><select id="discovery-month" aria-label="일정"><option value="">일정 전체</option>${monthLabels.map(value => `<option value="${value}">${Number(value.slice(5))}월</option>`).join('')}</select></div>
        <div class="eligible-select"><select id="discovery-method" aria-label="신청 방법"><option value="">신청 방법 전체</option>${Object.entries(methodLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div>
      </div>
      <div class="discovery-categories" role="group" aria-label="분야 바로 선택">
        ${['', ...categories].map(value => `<button type="button" class="pill" data-category="${escapeText(value)}" aria-pressed="${!value}">${escapeText(value || '전체')}</button>`).join('')}
      </div>
      <div class="discovery-toolbar">
        <strong id="discovery-count" role="status"></strong>
        <label><input id="discovery-accessible" type="checkbox"> 접근성 정보 있는 것만</label>
        <div class="discovery-view" role="group" aria-label="보기 방식">
          <button type="button" aria-label="카드 보기" data-view="grid" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z"/></svg></button>
          <button type="button" aria-label="목록 보기" data-view="list" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h1m3 0h12M4 12h1m3 0h12M4 18h1m3 0h12"/></svg></button>
        </div>
      </div>
      <div id="program-list" class="discovery-results"></div>
    </section>`;

  const page = container.querySelector('.discovery');
  const byId = id => page.querySelector(`#${id}`);
  const category = byId('discovery-category');
  const list = byId('program-list');
  let view = 'list';
  function update() {
    const keyword = byId('program-search').value.trim().toLocaleLowerCase('ko-KR');
    const district = byId('discovery-district').value;
    const month = byId('discovery-month').value;
    const method = byId('discovery-method').value;
    const accessibilityOnly = byId('discovery-accessible').checked;
    const results = programs.filter(program =>
      (!category.value || program.category === category.value) &&
      (!district || (program.district ?? program.venue?.district) === district) &&
      (!month || !program.startAt || program.startAt.startsWith(month)) &&
      (!method || program.applyMethod === method) &&
      (!accessibilityOnly || program.accessibilityTags?.length) &&
      [program.title, program.organizerName, program.venue?.name].some(value => value?.toLocaleLowerCase('ko-KR').includes(keyword))
    );
    byId('discovery-count').textContent = `${results.length.toLocaleString('ko-KR')}개의 프로그램`;
    list.dataset.view = view;
    list.innerHTML = results.map(program => discoveryRow(program, { escapeText, hasProgramApplication, programDeadline, programSchedule })).join('') || '<p class="empty">조건에 맞는 프로그램이 없어요.</p>';
    page.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.category === category.value)));
    page.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  }
  byId('program-search').addEventListener('input', update);
  page.addEventListener('change', update);
  page.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button?.hasAttribute('data-category')) category.value = button.dataset.category;
    else if (button?.dataset.view) view = button.dataset.view;
    else return;
    update();
  });
  update();
}

function discoveryRow(program, { escapeText, hasProgramApplication, programDeadline, programSchedule }) {
  const statuses = { ELIGIBLE: '참여 가능', NEEDS_REVIEW: '확인 필요', UNKNOWN: '정보 없음', BENEFIT: '혜택' };
  const status = program.discoveryStatus ?? 'UNKNOWN';
  const deadline = programDeadline(program);
  const id = encodeURIComponent(program.programId);
  const alreadyApplied = hasProgramApplication(program.programId);
  const action = program.discoveryAction ?? 'PREPARE';
  const canApply = ['APPLY', 'PREPARE'].includes(action) && deadline.label !== '마감';
  let actionButton = `<button class="pill discovery-action" type="button" data-program="${id}">${action === 'INQUIRE' ? '문의하기' : '자세히'}</button>`;
  if (alreadyApplied) actionButton = `<a class="pill discovery-action" href="#prepare/${id}">신청 준비</a>`;
  else if (canApply) actionButton = `<a class="pill discovery-action primary" href="#prepare/${id}">신청하기</a>`;
  const metadata = [program.organizerName ?? program.venue?.name, program.district ?? program.venue?.district, program.startAt ? programSchedule(program) : '상시'].filter(Boolean);
  return `<article class="discovery-row">
    <span class="discovery-icon"><svg aria-hidden="true"><use href="#list"/></svg></span>
    <div class="discovery-name"><h2>${escapeText(program.title)}</h2><p>${escapeText(metadata.join(' · '))}</p></div>
    <div class="eligible-tags discovery-tags">${program.accessibilityTags?.length ? program.accessibilityTags.slice(0, 2).map(tag => `<span class="tag">${escapeText(tag)}</span>`).join('') : '<span class="tag discovery-unknown">접근성 정보 없음</span>'}</div>
    <footer class="discovery-footer">
      <div class="discovery-status-group">
        <span class="eligible-result discovery-status" data-status="${escapeText(status)}">${statuses[status] ?? statuses.UNKNOWN}</span>
        <strong class="discovery-deadline ${deadline.soon ? 'link' : ''}">${deadline.label}</strong>
      </div>
      <div class="discovery-actions">
        <button class="icon-button discovery-details" type="button" data-program="${id}" aria-label="${escapeText(program.title)} 자세히 보기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5h6v6m0-6-9 9m7-1v6H5V7h6"/></svg></button>
        ${actionButton}
      </div>
    </footer>
  </article>`;
}
