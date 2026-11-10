import { renderApplicationStatus } from './pages/application-status.js';
import { renderApplicationReview } from './pages/application-review.js';
import { renderProgramDiscovery } from './pages/program-discovery.js';

import { care, groupOptions, groups, loadSupport, openEditor, showPanel } from './pages/support-management.js';
import { renderEligiblePage } from './pages/eligible-programs.js';
import { renderApplicationPreparation } from './pages/application-preparation.js';
import { programDeadline, programSchedule } from './program-format.js';

const byId = id => document.getElementById(id);

function escapeText(value) {
  const element = document.createElement('span');
  element.textContent = String(value ?? '');
  return element.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

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

function hasProgramApplication(programId, groupId = null) {
  return applications.some(item =>
    item.programId === programId && (groupId == null || item.groupId === groupId) &&
    !['PREPARING', 'CANCELLED'].includes(item.status)
  );
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
    renderEligiblePage(otherContent, Number(id), { groups, care, hasProgramApplication, escapeText, dateLabel, venueLabel });
  } else if (page === 'programs') {
    renderProgramDiscovery(otherContent, { programs, escapeText, hasProgramApplication, programDeadline, programSchedule });
    if (id) openProgram(Number(id), location.hash);
  } else if (page === 'prepare') {
    renderApplicationPreparation(otherContent, Number(id), Number(group), {
      programs, groups, care, applicationProfile, escapeText, venueLabel, groupOptions,
      refreshApplications: async () => { applications = await mockActivity.getApplications(); },
    });
  } else if (page === 'applications') {
    if (id === 'review') {
      const item = applications.find(entry => String(entry.applicationId) === group && entry.status === 'ATTENDED');
      if (!item) {
        otherContent.innerHTML = '<p class="empty">후기를 작성할 수 있는 신청을 찾지 못했어요.</p><p><a class="pill" href="#applications">신청 현황으로 돌아가기</a></p>';
        if (focus) byId('other-title').focus();
        return;
      }
      const reviewHash = location.hash;
      byId('other-title').hidden = true;
      byId('other-page').setAttribute('aria-labelledby', 'review-title');
      document.title = '후기 남기기 | Nubi';
      renderApplicationReview(otherContent, {
        item,
        program: programs.find(program => program.programId === item.programId),
        organization: applicationProfile.name,
        escapeText,
        saveDraft: async review => {
          await mockActivity.saveApplicationReviewDraft(item.applicationId, review);
          applications = await mockActivity.getApplications();
        },
        publish: async review => {
          await mockActivity.saveApplicationReview(item.applicationId, review);
          applications = await mockActivity.getApplications();
          if (location.hash === reviewHash) location.hash = `applications/${encodeURIComponent(item.applicationId)}`;
        },
      });
      if (focus) byId('review-title').focus();
      return;
    }
    const update = operation => async (...args) => {
      await operation(...args);
      applications = await mockActivity.getApplications();
      if (location.hash.slice(1).split('/')[0] === 'applications') renderPage(false);
    };
    renderApplicationStatus(otherContent, {
      applications, programs, escapeText,
      markReceived: update(mockActivity.markApplicationReceived),
    });
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
  const canPrepare = !hash.startsWith('#prepare') &&
    !hasProgramApplication(item.programId) &&
    !['INQUIRE', 'DETAILS'].includes(item.discoveryAction) && programDeadline(item).label !== '마감';
  showDetails(item.title, `
    <p class="page-meta">${escapeText(programSchedule(item))} · ${escapeText(venueLabel(item.venue))}</p>
    ${item.capacity == null ? '' : `<p class="page-meta">정원 ${escapeText(item.capacity)}명</p>`}
    <p>${escapeText(item.description ?? '등록된 활동 내용이 없어요.')}</p>
    ${canPrepare ? `<p class="page-meta"><a class="pill primary" href="#prepare/${item.programId}">신청하기</a></p>` : ''}`);
  byId('details-content').querySelector('a')?.addEventListener('click', () => detailsDialog.close());
}

otherContent.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { program, event: eventId, place } = button.dataset;
  if (program) await openProgram(Number(program));
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
