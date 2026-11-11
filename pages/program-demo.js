import { renderProgramDiscovery } from './program-discovery.js';
import { programDeadline, programSchedule } from '../program-format.js';

const escapeText = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export async function renderProgramDemo(container) {
  container.innerHTML = `
    <aside class="sidebar" aria-label="체험 서비스 메뉴">
      <div class="brand">
        <button class="icon-button" type="button" data-demo-toggle aria-label="메뉴 접기" aria-controls="demo-sidebar-content" aria-expanded="true"><svg aria-hidden="true"><use href="#panel"/></svg></button>
        <div class="brand-identity">
          <span class="brand-mark" aria-hidden="true"><img src="./nubi-logo.png" alt="" width="34" height="34"></span>
          <strong>Nubi</strong>
          <small>다양한 복지 기회를 누비다</small>
        </div>
        <button class="notice icon-button" type="button" data-demo-action="알림함" aria-label="알림함 열기"><svg aria-hidden="true"><use href="#bell"/></svg><b aria-hidden="true">3</b></button>
      </div>
      <div id="demo-sidebar-content">
        <a class="prepare" href="#landing-demo" data-demo-action="프로그램 신청 준비"><strong>＋</strong> 프로그램 신청 준비</a>
        <nav aria-label="체험 주 메뉴">
          <a href="#landing-demo" data-demo-action="참여 가능 프로그램"><svg aria-hidden="true"><use href="#home"/></svg>참여 가능 프로그램</a>
          <a href="#landing-demo" aria-current="page"><svg aria-hidden="true"><use href="#search"/></svg>프로그램 탐색</a>
          <a href="#landing-demo" data-demo-action="지원 관리"><svg aria-hidden="true"><use href="#users"/></svg>지원 관리</a>
          <a href="#landing-demo" data-demo-action="신청 현황"><svg aria-hidden="true"><use href="#list"/></svg>신청 현황</a>
          <a href="#landing-demo" data-demo-action="행사 관리"><svg aria-hidden="true"><use href="#flag"/></svg>행사 관리</a>
          <a href="#landing-demo" data-demo-action="사각지대 지도"><svg aria-hidden="true"><use href="#map-icon"/></svg>사각지대 지도</a>
        </nav>
        <section class="side-groups" aria-label="참여 그룹">
          <p>참여 그룹</p>
          <a href="#landing-demo" data-demo-action="주간활동 A">주간활동 A <small>8명</small></a>
          <a href="#landing-demo" data-demo-action="주간활동 B">주간활동 B <small>6명</small></a>
          <a href="#landing-demo" data-demo-action="직업재활반">직업재활반 <small>5명</small></a>
        </section>
      </div>
    </aside>
    <main><header class="page-header"><h1>프로그램 탐색</h1><a class="pill" href="#landing">체험 종료</a></header>
      <p class="demo-label">예시 프로그램으로 검색과 필터를 체험해 보세요.</p>
      <p class="demo-feedback" role="status"></p>
      <div class="demo-discovery"></div>
    </main>
    <dialog class="demo-detail" aria-labelledby="demo-detail-title"></dialog>`;
  const content = container.querySelector('.demo-discovery');
  const feedback = container.querySelector('.demo-feedback');
  const dialog = container.querySelector('dialog');
  container.querySelector('.sidebar').addEventListener('click', event => {
    const toggle = event.target.closest('[data-demo-toggle]');
    if (toggle) {
      const sidebarContent = container.querySelector('#demo-sidebar-content');
      sidebarContent.hidden = !sidebarContent.hidden;
      toggle.setAttribute('aria-expanded', String(!sidebarContent.hidden));
      toggle.setAttribute('aria-label', sidebarContent.hidden ? '메뉴 펼치기' : '메뉴 접기');
    }
    const action = event.target.closest('[data-demo-action]');
    if (action) {
      event.preventDefault();
      feedback.textContent = `${action.dataset.demoAction} 기능은 기관 가입 후 이용할 수 있어요.`;
    }
  });
  try {
    const programs = await mockActivity.getPrograms();
    if (!content.isConnected) return;
    renderProgramDiscovery(content, {
      programs: structuredClone(programs),
      escapeText,
      hasProgramApplication: () => false,
      programDeadline,
      programSchedule,
    });
    content.addEventListener('click', event => {
      const apply = event.target.closest('a[href^="#prepare"]');
      if (apply) {
        event.preventDefault();
        feedback.textContent = '체험 화면이에요. 기관 가입 후 프로그램 신청을 준비할 수 있어요.';
        return;
      }
      const button = event.target.closest('[data-program]');
      if (!button) return;
      const program = programs.find(item => String(item.programId) === button.dataset.program);
      if (!program) return;
      dialog.innerHTML = `<h2 id="demo-detail-title">${escapeText(program.title)}</h2><p>${escapeText(program.organizerName ?? program.venue?.name)}</p><p>${escapeText(program.startAt ? programSchedule(program) : '상시')}</p><p>${escapeText(program.description ?? '프로그램 상세 안내를 준비하고 있어요.')}</p><div class="eligible-tags">${(program.accessibilityTags ?? []).map(tag => `<span class="tag">${escapeText(tag)}</span>`).join('')}</div><form method="dialog"><button class="pill" type="submit">닫기</button></form>`;
      dialog.showModal();
    });
  } catch {
    feedback.textContent = '체험 프로그램을 불러오지 못했어요. 페이지를 새로고침해 주세요.';
  }
}
