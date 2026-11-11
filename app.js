import { createReviewPublisher, getReviewDraft, saveReviewDraft } from './pages/application-reviews-api.js';
import { getEvents, saveEvent, getEventApplicants, getEventApplicant, saveEventApplicant, getEventNeeds, saveEventNeed, getEventReviews, postEventReviewReply, getEventEditorData, saveEventPhotos } from './pages/events-api.js';
import { notificationApi } from './pages/notifications-api.js';
import { getAccessibilityMap } from './pages/accessibility-map-api.js';
import { renderEventEditor, renderEventList } from './pages/event-management.js';
import { renderEventApplicants } from './pages/event-applicants.js';
import { renderApplicationStatus } from './pages/application-status.js';
import { renderApplicationReview } from './pages/application-review.js';
import { renderAccessibilityMap } from './pages/accessibility-map.js';
import { renderProgramDiscovery } from './pages/program-discovery.js';
import { mountLanding } from './pages/landing.js';
import { renderProgramDemo } from './pages/program-demo.js';
import { renderLogin, renderPasswordReset } from './pages/login.js';
import { renderSignup } from './pages/signup.js';
import { apiEnabled, apiRequest, getSession } from './pages/api-client.js';
import { signIn, signOut, signUp } from './pages/auth-api.js';
import { getProgram, getPrograms } from './pages/programs-api.js';
import { getApplications, markApplicationReceived } from './pages/applications-api.js';

import { care, groupOptions, groups, loadSupport, showPanel } from './pages/support-management.js';
import { renderEligiblePage } from './pages/eligible-programs.js';
import { renderApplicationPreparation } from './pages/application-preparation.js';
import { programDeadline, programSchedule } from './program-format.js';

const byId = id => document.getElementById(id);
const landingPage = byId('landing-page');
mountLanding(landingPage);
const isLandingRoute = route => !route || route === 'landing' || route.startsWith('landing-');
const isAccountRoute = route => route === 'login' || route === 'signup';

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
let eventLoadError = '';

async function loadEvents() {
  events = await (apiEnabled ? getEvents() : mockActivity.getEvents());
  eventLoadError = '';
}
let eventEditorOptions;
let accessibilityMap;
let notifications = [];
let unreadCount = 0;
let notificationPage = 0;
let notificationTotalPages = 0;
let notificationBusy = false;

async function loadActivity() {
  [programs, applications, eventEditorOptions] = await Promise.all([
    getPrograms().catch(error => {
      programLoadError = error.message;
      return [];
    }), getApplications().catch(showApplicationError), mockActivity.getEventEditorOptions(),
  ]);
  if (!apiEnabled) {
    await loadEvents();
    accessibilityMap = await mockActivity.getAccessibilityMap();
  }
}

let applicationProfile = {};
let programLoadError = '';
let applicationLoadError = '';

function showApplicationError(error) {
  applicationLoadError = error.message;
  return [];
}

async function loadProfile() {
  let profile;
  if (apiEnabled) {
    if (!getSession()) return;
    const organization = await apiRequest('/organizations/me');
    profile = { organizationName: organization.name, memberName: organization.member?.name || organization.member?.email };
  } else {
    profile = await mockActivity.getProfile();
  }
  const { organizationName, memberName } = profile ?? {};
  const name = organizationName?.trim();
  const member = memberName?.trim();
  applicationProfile = { name, member };
  byId('profile-avatar').textContent = name ? Array.from(name)[0] : '·';
  byId('profile-organization').textContent = name || '기관 정보 없음';
  byId('profile-member').textContent = member ? `담당자 ${member}` : '담당자 —';
}

async function loadNotifications(page = 0) {
  const [result, count] = await Promise.all([
    notificationApi.getNotifications({ page }), notificationApi.getUnreadCount(),
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

async function renderPage(focus = true) {
  const [route, id, group] = location.hash.slice(1).split('/');
  const loginPage = byId('login-page');
  loginPage.hidden = !isAccountRoute(route);
  if (isAccountRoute(route)) {
    landingPage.hidden = true;
    byId('program-demo-page').hidden = true;
    byId('dashboard-sidebar').hidden = true;
    byId('dashboard-main').hidden = true;
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    document.querySelector('#notification-panel:popover-open')?.hidePopover();
    document.title = `${route === 'signup' ? '기관 가입' : id === 'reset' ? '비밀번호 찾기' : '로그인'} | Nubi`;
    if (route === 'signup') renderSignup(loginPage, { register: apiEnabled ? signUp : undefined });
    else if (id === 'reset') renderPasswordReset(loginPage, { apiEnabled });
    else renderLogin(loginPage, { authenticate: apiEnabled ? signIn : undefined });
    window.scrollTo(0, 0);
    return;
  }
  const isDemo = route === 'landing-demo';
  const demoPage = byId('program-demo-page');
  demoPage.hidden = !isDemo;
  if (isDemo) {
    landingPage.hidden = true;
    byId('dashboard-sidebar').hidden = true;
    byId('dashboard-main').hidden = true;
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    document.title = '프로그램 탐색 체험 | Nubi';
    renderProgramDemo(demoPage);
    window.scrollTo(0, 0);
    return;
  }
  const isLanding = isLandingRoute(route);
  const wasLanding = !landingPage.hidden;
  landingPage.hidden = !isLanding;
  byId('dashboard-sidebar').hidden = isLanding;
  byId('dashboard-main').hidden = isLanding;
  if (isLanding) {
    document.title = 'Nubi | 다양한 복지 기회를 누비다';
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    document.querySelector('#notification-panel:popover-open')?.hidePopover();
    const target = byId(route);
    if (target && landingPage.contains(target)) target.scrollIntoView();
    else window.scrollTo(0, 0);
    return;
  }
  if (apiEnabled && !getSession()) {
    byId('dashboard-sidebar').hidden = true;
    byId('dashboard-main').hidden = true;
    location.replace('#login');
    return;
  }
  if (apiEnabled && loadedMemberId !== getSession()?.memberId) {
    loadAccountData().then(() => { if (!isPublicRoute()) renderPage(false); });
  }
  if (wasLanding) window.scrollTo(0, 0);
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
    if (programLoadError) {
      otherContent.innerHTML = '<p class="empty" role="alert"></p>';
      otherContent.firstElementChild.textContent = programLoadError;
      return;
    }
    renderProgramDiscovery(otherContent, { programs, escapeText, hasProgramApplication, programDeadline, programSchedule });
    if (id) openProgram(Number(id), location.hash);
  } else if (page === 'prepare') {
    renderApplicationPreparation(otherContent, Number(id), Number(group), {
      programs, groups, care, applicationProfile, escapeText, venueLabel, groupOptions,
      refreshApplications: async () => { applications = await getApplications(); },
    });
  } else if (page === 'applications') {
    if (applicationLoadError) {
      otherContent.innerHTML = '<p class="empty" role="alert"></p>';
      otherContent.firstElementChild.textContent = applicationLoadError;
      return;
    }
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
      const publishReview = createReviewPublisher(item);
      renderApplicationReview(otherContent, {
        item: { ...item, reviewDraft: apiEnabled ? getReviewDraft(item.applicationId) : item.reviewDraft },
        program: programs.find(program => program.programId === item.programId),
        organization: applicationProfile.name,
        escapeText,
        saveDraft: async review => {
          await saveReviewDraft(item.applicationId, review);
          if (!apiEnabled) applications = await getApplications();
        },
        publish: async review => {
          await publishReview(review);
          applications = await getApplications();
          if (location.hash === reviewHash) location.hash = `applications/${encodeURIComponent(item.applicationId)}`;
        },
      });
      if (focus) byId('review-title').focus();
      return;
    }
    const update = operation => async (...args) => {
      await operation(...args);
      applications = await getApplications();
      if (location.hash.slice(1).split('/')[0] === 'applications') renderPage(false);
    };
    renderApplicationStatus(otherContent, {
      applications, programs, escapeText,
      markReceived: update(markApplicationReceived),
    });
  } else if (page === 'events') {
    const route = location.hash;
    let event = events.find(item => String(item.eventId) === id);
    if (apiEnabled && (eventLoadError || (event && ['applications', 'reviews'].includes(group)))) {
      try {
        if (eventLoadError) throw new Error(eventLoadError);
        const [applicants, needs, reviews] = await Promise.all([
          getEventApplicants(event.eventId), getEventNeeds(event.eventId),
          getEventReviews(event.eventId).catch(error => ({ reviewError: error.message })),
        ]);
        event = { ...event, applicants, ...needs, ...reviews };
      } catch (error) {
        if (location.hash === route) otherContent.textContent = error.message;
        return;
      }
      if (location.hash !== route) return;
    }
    if (event && ['applications', 'reviews'].includes(group) && event.status !== 'DRAFT') {
      byId('other-title').hidden = true;
      byId('other-page').setAttribute('aria-labelledby', 'event-applicant-title');
      renderEventApplicants(otherContent, {
        event, escapeText, initialSection: group,
        saveReviewReply: async (index, reply) => {
          if (apiEnabled) {
            const review = event.reviews[index];
            const response = await postEventReviewReply(review.reviewId, reply);
            review.reply = response.content;
            event.reviewStats.awaitingReplyCount = Math.max(0, event.reviewStats.awaitingReplyCount - 1);
            return event.reviews;
          }
          const reviews = await mockActivity.saveEventReviewReply(event.eventId, index, reply);
          events = await mockActivity.getEvents();
          return reviews;
        },
        savePreparationTask: async (taskId, ready) => {
          if (apiEnabled) {
            const task = event.preparationTasks.find(item => String(item.id) === taskId);
            const needs = await saveEventNeed(event.eventId, task, ready);
            Object.assign(event, needs);
            return needs.preparationTasks;
          }
          const tasks = await mockActivity.saveEventPreparationTask(event.eventId, taskId, ready);
          events = await mockActivity.getEvents();
          return tasks;
        },
        loadApplicant: apiEnabled ? index => getEventApplicant(event.eventId, event.applicants[index].applicationId) : null,
        saveApplicant: async (index, changes) => {
          if (apiEnabled) return saveEventApplicant(event.eventId, event.applicants[index], changes);
          const applicant = await mockActivity.saveEventApplicant(event.eventId, index, changes);
          events = await mockActivity.getEvents();
          return applicant;
        },
        closeApplications: async () => {
          await (apiEnabled ? saveEvent : mockActivity.saveEvent)(event.eventId, { applicationsClosed: true });
          await loadEvents();
        },
      });
      if (focus) byId('event-applicant-title').focus();
      return;
    }
    if (id !== 'new' && !event) {
      byId('other-title').hidden = true;
      byId('other-page').setAttribute('aria-labelledby', 'event-list-title');
      renderEventList(otherContent, { events, escapeText, initialTab: group });
      if (focus) byId('event-list-title').focus();
      return;
    } else {
      const eventHash = location.hash;
      let eventId = event?.eventId;
      let savedImages = new Map();
      if (apiEnabled && event) {
        try {
          const detail = await getEventEditorData(eventId);
          savedImages = new Map(detail.images.map(image => [image.url, image.imageId]));
          event = { ...event, ...detail, status: event.status, notes: detail.description, photos: [...savedImages.keys()] };
        } catch (error) {
          if (location.hash === eventHash) otherContent.textContent = error.message;
          return;
        }
        if (location.hash !== eventHash) return;
      }
      const initialPlace = accessibilityMap?.districts.find(district => district.id === group)?.name;
      byId('other-title').hidden = true;
      byId('other-page').setAttribute('aria-labelledby', 'event-title');
      renderEventEditor(otherContent, {
        event, options: eventEditorOptions, initialPlace, escapeText,
        save: async values => {
          if (apiEnabled) {
            const saved = await saveEvent(eventId, values);
            eventId = saved.programId;
            await saveEventPhotos(eventId, values.photos, savedImages);
          } else {
            await mockActivity.saveEvent(eventId ?? null, values);
          }
          await loadEvents();
          if (location.hash === eventHash) location.hash = values.status === 'DRAFT' ? 'events/list/drafts' : 'events';
        },
      });
      if (focus) byId('event-title').focus();
      return;
    }
  } else {
    renderAccessibilityMap(otherContent, { data: accessibilityMap, escapeText });
  }
  const application = page === 'applications' && id ? byId(`application-${Number(id)}`) : null;
  if (focus) (application || byId('prepare-title') || byId('other-title')).focus();
}

async function openProgram(id, hash = location.hash) {
  let item;
  try {
    item = await getProgram(id);
  } catch (error) {
    if (location.hash === hash) showDetails('프로그램을 불러오지 못했어요', `<p>${escapeText(error.message)}</p>`);
    return;
  }
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
  const { program } = button.dataset;
  if (program) await openProgram(Number(program));
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
      const result = await notificationApi.readAllNotifications();
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
      const item = current.read ? current : await notificationApi.readNotification(id);
      const target = notificationTarget(item);
      notifications = notifications.map(entry => entry.notificationId === id ? item : entry);
      ({ unreadCount } = await notificationApi.getUnreadCount());
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
const settingsButton = byId('account-settings');
const settingsPanel = byId('account-settings-panel');
function positionSettingsPanel() {
  const { right, top } = settingsButton.getBoundingClientRect();
  settingsPanel.style.setProperty('--settings-right', `${document.documentElement.clientWidth - right}px`);
  settingsPanel.style.setProperty('--settings-bottom', `${document.documentElement.clientHeight - top + 6}px`);
}
settingsPanel.addEventListener('beforetoggle', event => {
  const opening = event.newState === 'open';
  settingsButton.setAttribute('aria-expanded', String(opening));
  if (opening) {
    positionSettingsPanel();
    window.addEventListener('resize', positionSettingsPanel);
    window.addEventListener('scroll', positionSettingsPanel, true);
  } else {
    window.removeEventListener('resize', positionSettingsPanel);
    window.removeEventListener('scroll', positionSettingsPanel, true);
  }
});
settingsPanel.addEventListener('click', async event => {
  if (!event.target.closest('a[href="#login"]')) return;
  settingsPanel.hidePopover();
  if (!apiEnabled) return;
  event.preventDefault();
  try {
    await signOut();
  } catch (error) {
    console.warn('서버 로그아웃 요청 실패:', error.message);
  }
  applicationProfile = {};
  location.replace('#login');
});
const withdrawalDialog = byId('withdrawal-dialog');
const withdrawalActions = withdrawalDialog.querySelector('form');
let withdrawalTimer;
byId('open-withdrawal').addEventListener('click', () => {
  settingsPanel.hidePopover();
  withdrawalActions.hidden = false;
  byId('withdrawal-title').hidden = false;
  withdrawalDialog.showModal();
});
byId('confirm-withdrawal').addEventListener('click', () => {
  if (apiEnabled) {
    byId('withdrawal-title').textContent = '계정 탈퇴를 아직 지원하지 않아요';
    return;
  }
  withdrawalActions.hidden = true;
  byId('withdrawal-title').textContent = '탈퇴되었습니다';
  const currentRoute = location.hash;
  withdrawalTimer = window.setTimeout(() => {
    withdrawalDialog.close();
    if (location.hash === currentRoute) location.hash = 'landing';
  }, 3000);
});
withdrawalDialog.addEventListener('cancel', event => {
  if (withdrawalActions.hidden) event.preventDefault();
});
withdrawalDialog.addEventListener('close', () => {
  window.clearTimeout(withdrawalTimer);
  byId('withdrawal-title').textContent = '정말로 탈퇴할까요?';
  if (!withdrawalActions.hidden) settingsButton.focus();
});
window.addEventListener('hashchange', () => renderPage());
const isPublicRoute = () => {
  const [route] = location.hash.slice(1).split('/');
  return isLandingRoute(route) || isAccountRoute(route);
};
if (isPublicRoute()) renderPage(false);

function showProfileError() {
  byId('profile-organization').textContent = '기관 정보를 불러오지 못했어요';
}
function showSupportError(error) {
  byId('support-error').textContent = error.message;
}
let loadedMemberId;
function showNotificationError(error) {
  byId('notification-error').textContent = error.message;
}
function loadAccountData() {
  loadedMemberId = getSession()?.memberId;
  byId('support-error').textContent = '';
  const accountRequests = [loadSupport().catch(showSupportError), loadProfile().catch(showProfileError)];
  if (apiEnabled) {
    accountRequests.push(loadEvents().catch(error => { events = []; eventLoadError = error.message; }));
    applicationLoadError = '';
    accountRequests.push(loadNotifications().catch(showNotificationError));
    accountRequests.push(getAccessibilityMap().then(data => { accessibilityMap = data; }).catch(error => { accessibilityMap = { error: error.message }; }));
    accountRequests.push(getApplications().catch(showApplicationError).then(items => { applications = items; }));
  }
  return Promise.all(accountRequests);
}
const accountReady = !apiEnabled || getSession() ? loadAccountData() : Promise.resolve();
Promise.all([accountReady, loadActivity()]).then(() => {
  if (!isPublicRoute()) renderPage();
});
if (!apiEnabled) loadNotifications().catch(showNotificationError);
