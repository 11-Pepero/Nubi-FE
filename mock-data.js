const mockSupport = (() => {
  const categories = [
    ['MOBILITY', '이동', [[1, 'WHEELCHAIR', '휠체어 이용'], [2, 'WALKING_ASSISTANCE', '보행 보조'], [3, 'VEHICLE_ASSISTANCE', '차량 승하차 지원'], [4, 'PUBLIC_TRANSPORT', '대중교통 이동 가능']]],
    ['TOILET', '화장실', [[5, 'ACCESSIBLE_TOILET', '장애인 화장실']]],
    ['COMPANION', '동반', [[6, 'COMPANION', '동반 인력 필요']]],
    ['COMMUNICATION', '의사소통', [[7, 'EASY_LANGUAGE', '쉬운 말 안내'], [8, 'PICTURE_GUIDE', '그림 안내판']]],
    ['ENVIRONMENT', '환경', [[9, 'QUIET_SPACE', '조용한 휴식 공간']]],
    ['TIME', '시간', [[10, 'SHORT_ACTIVITY', '90분 이내 활동']]],
    ['MEAL', '식사', [[11, 'CHOPPED_FOOD', '다진 음식'], [12, 'MEAL_ASSISTANCE', '식사 보조']]],
    ['REST', '휴식', [[13, 'REST_BREAK', '중간 휴식']]],
    ['ETC', '기타', []],
  ].map(([category, label, tags]) => ({
    category, label, tags: tags.map(([id, code, label]) => ({ id, code, label })),
  }));
  const tagsById = new Map(categories.flatMap(({ category, tags }) =>
    tags.map(({ id, ...tag }) => [id, { supportTagId: id, category, ...tag }])
  ));
  const support = (supportTagId, quantity = null, ratio = null, note = null) => ({
    ...tagsById.get(supportTagId), quantity, ratio, note,
  });
  const createdAt = '2026-11-09T09:00:00';
  const groups = [
    { id: 1, name: '주간활동 A', memberCount: 8, suggestedCompanionCount: 4, eligibleCount: 12, checkCount: 5,
      supports: [support(1, 3), support(2, 2), support(3), support(5), support(6, null, '1:2'), support(7), support(8), support(9)] },
    { id: 2, name: '주간활동 B', memberCount: 6, eligibleCount: 21, checkCount: 3,
      supports: [support(2, 1), support(6, null, '1:3'), support(7), support(10)] },
    { id: 3, name: '직업재활반', memberCount: 5, eligibleCount: 0, checkCount: 0,
      supports: [support(4), support(1, 3), support(6)] },
  ].map(group => ({ ...group, createdAt, updatedAt: createdAt }));
  const care = [
    [1, '햇살', 1, '승강기가 없는 2층 이상 장소는 함께 가기 어려워요.', [[1, '전동휠체어 충전'], [1, '넓은 회전 공간']]],
    [2, '바다', 1, null, [[9, '큰 소리 피하기'], [9, '조용한 자리']]],
    [3, '새싹', 2, null, [[11, null], [12, null]]],
    [4, '나무', 3, null, [[6, '1명당 1명 동반']]],
  ].map(([id, alias, groupId, memo, entries]) => ({
    id, alias, groupId, memo, applyToJudgement: true,
    items: entries.map(([supportTagId, content], index) => ({
      id: id * 30 + index + 1, ...tagsById.get(supportTagId), content,
    })),
    judgementImpact: null, createdAt, updatedAt: createdAt,
  }));

  return {
    async getGroups() {
      return groups.map(group => ({
        ...group, careCount: care.filter(person => person.groupId === group.id).length,
      }));
    },
    async getCare() {
      return care.map(person => ({
        ...person, groupName: groups.find(group => group.id === person.groupId)?.name ?? null,
      }));
    },
    async getTags() {
      return categories;
    },
    async getSummary() {
      const counts = new Map();
      for (const group of groups) {
        for (const { supportTagId, quantity } of group.supports) {
          counts.set(supportTagId, (counts.get(supportTagId) ?? 0) + (quantity ?? group.memberCount));
        }
      }
      return {
        groupCount: groups.length,
        memberCount: groups.reduce((total, group) => total + group.memberCount, 0),
        supports: [...counts].map(([id, count]) => ({ ...tagsById.get(id), count }))
          .sort((a, b) => b.count - a.count || a.supportTagId - b.supportTagId),
      };
    },
    async saveGroup(id, { name, memberCount, supports }) {
      const group = groups.find(item => item.id === id);
      const updatedAt = new Date().toISOString().slice(0, -1);
      const update = {
        name, memberCount, updatedAt,
        supports: supports.map(item => ({ ...tagsById.get(item.supportTagId), ...item })),
      };
      if (group) Object.assign(group, update);
      else groups.push({ ...update, id: groups.length + 1, eligibleCount: 0, checkCount: 0, createdAt: updatedAt });
    },
    async addCare({ alias, groupId, memo, items, applyToJudgement }) {
      const createdAt = new Date().toISOString().slice(0, -1);
      const careItems = items.map(({ supportTagId, content }, index) => {
        const tag = tagsById.get(supportTagId);
        return {
          id: (care.length + 1) * 30 + index + 1, supportTagId,
          category: tag?.category ?? null, code: tag?.code ?? null, label: tag?.label ?? null, content,
        };
      });
      care.push({
        id: care.length + 1, alias, groupId, memo, items: careItems, applyToJudgement,
        judgementImpact: null, createdAt, updatedAt: createdAt,
      });
    },
  };
})();

const mockActivity = (() => {
  const places = [
    { venueId: 1, name: '동백호수공원', district: '기흥구', detail: '산책로 일부 구간에 경사로가 있어요.' },
    { venueId: 2, name: '용인문화예술원', district: '처인구', detail: '건물 입구와 관람층에 승강기가 있어요.' },
    { venueId: 3, name: '수지문화복지타운', district: '수지구', detail: '정문 쪽에 장애인 주차 구역이 있어요.' },
  ];
  const programs = [
    { programId: 1, title: '용인 숲길 산책', venue: places[0], startAt: '2026-11-21T10:00:00', capacity: 24, description: '호숫가를 함께 걷는 야외 활동이에요.' },
    { programId: 2, title: '함께 만드는 생활 공예', venue: places[1], startAt: '2026-11-25T14:00:00', capacity: 20, description: '재료를 골라 소품을 만드는 실내 활동이에요.' },
    { programId: 3, title: '작은 음악회', venue: places[2], startAt: '2026-11-28T15:00:00', capacity: 35, description: '다양한 악기 연주를 함께 감상해요.' },
  ].map(program => ({ ...program, status: 'PUBLISHED', applyMethod: 'ONLINE' }));
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  // Keep mock deadlines stable across reloads in the same browser.
  const deadlineStart = (() => {
    const key = 'nubi:mock-program-deadline-start';
    try {
      const saved = Number(localStorage.getItem(key));
      if (saved > 0 && saved <= now.getTime()) return saved;
      localStorage.setItem(key, String(now.getTime()));
    } catch {
      // The mock still works when browser storage is unavailable.
    }
    return now.getTime();
  })();
  const programExamples = [
    ['함께 만드는 도자기 공방', '용인시 평생학습관', '처인구 평생학습관 2층', '12T14:00', 18, ['승강기', '장애인 화장실', '동반인 무료'], 6, true, null, '흙을 빚어 나만의 도자기를 만들어요.'],
    ['장애인의 날 기념 가을 음악회', '용인시 장애인복지관', '용인포은아트홀', '08T15:00', 30, ['휠체어석 6석', '장애인 주차', '동반 할인'], 3, true, null, '여러 악기의 연주를 감상하는 음악회예요.'],
    ['가족과 함께하는 그림책 낭독회', '용인시 문화재단', '수지도서관 강당', '15T11:00', 20, ['경사로', '쉬운 말 안내'], 9, false, { careId: 2, message: '조용한 자리 문의' }, '그림책을 함께 읽고 이야기를 나눠요.'],
    ['손쉬운 생활 체조 교실', '용인시 보건소', '기흥구 보건지소', null, 15, ['승강기', '장애인 화장실'], null, false, { careId: 1, message: '전동휠체어 충전 문의' }, '앉아서도 따라 할 수 있는 생활 체조를 배워요.'],
    ['함께 걷는 호수공원 산책', '용인시 체육회', '기흥호수공원', '18T10:00', 25, ['평탄한 산책로', '장애인 화장실'], 12, false, null, '호수 주변의 평탄한 산책로를 걸어요.'],
    ['원데이 꽃꽂이 클래스', '수지구청', '수지구청 3층 강의실', '11T13:30', 12, ['승강기'], 5, false, { careId: null, message: '동반인 참가비 미기재' }, '계절 꽃으로 작은 꽃다발을 만들어요.'],
  ];
  const matchedPrograms = programExamples.map(([title, organizerName, venueName, date, capacity, accessibilityTags, days, canApplyDirectly, review, description], index) => ({
    programId: index + 4, title, organizerName, venue: { name: venueName }, capacity, accessibilityTags,
    startAt: date ? `${month}-${date}:00` : null, scheduleText: date ? null : '매주 화 10:00',
    applyUntil: days == null ? null : new Date(deadlineStart + days * 86400000).toISOString(),
    canApplyDirectly, sharedWithOrganization: canApplyDirectly, review, description, status: 'PUBLISHED',
    applyMethod: canApplyDirectly ? 'ONLINE' : null,
  }));
  Object.assign(matchedPrograms[0], {
    gallery: ['공방 전경', '공방 입구', '작업대', '공용 공간', '편의시설'].map(alt => ({ alt, url: null })),
    remainingCapacity: 4,
    accessibilityTags: ['승강기', '장애인 화장실', '주출입구 접근로', '장애인 주차', '높이 차이 없음'],
    supportAssessments: {
      WHEELCHAIR: '승강기, 넓은 작업대', ACCESSIBLE_TOILET: '2층 같은 층',
      COMPANION: '동반인 무료', EASY_LANGUAGE: '강사 사전 안내 가능',
    },
    careAssessment: { careId: 1, message: '콘센트 위치 문의' },
  });
  Object.assign(matchedPrograms[2], {
    applyMethod: 'PHONE',
    accessibilityTags: ['경사로', '장애인 화장실', '쉬운 말 안내'],
    applicationContact: { team: '문화재단 평생학습팀', phone: '031-000-0000', hours: '평일 9시~18시' },
    applicationNotes: '큰 소리에 놀라는 분이 있어 출입문 가까운 조용한 자리를 부탁드려요.',
  });
  const discoveryMetadata = [
    ['평생교육', '처인구'], ['장애인의 날', '기흥구'], ['문화와 예술', '수지구'],
    ['보건', '기흥구'], ['체육', '기흥구'], ['평생교육', '수지구'],
  ];
  programs.push(...matchedPrograms.map(({ review, ...program }, index) => ({
    ...program, category: discoveryMetadata[index][0], district: discoveryMetadata[index][1],
    discoveryStatus: review ? 'NEEDS_REVIEW' : 'ELIGIBLE',
    discoveryAction: program.canApplyDirectly ? 'APPLY' : 'PREPARE',
  })));
  const discoveryExamples = [
    { programId: 10, title: '주말 목공 체험', organizerName: '용인시청소년수련관', district: '처인구', category: '평생교육', venue: { name: '용인시청소년수련관' }, startAt: `${month}-16T14:00:00`, days: 10, discoveryStatus: 'UNKNOWN', discoveryAction: 'INQUIRE', description: '목공 도구를 사용해 작은 생활 소품을 만드는 체험이에요.' },
    { programId: 11, title: '큐레이터와 함께 보는 전시', organizerName: '용인시립미술관', district: '기흥구', category: '문화와 예술', venue: { name: '용인시립미술관' }, accessibilityTags: ['승강기', '휠체어 대여'], discoveryStatus: 'ELIGIBLE', discoveryAction: 'PREPARE', applyMethod: 'PHONE', description: '큐레이터의 설명과 함께 전시 작품을 감상해요.' },
    { programId: 12, title: '어울림 보치아 교실', organizerName: '용인시체육회', district: '처인구', category: '체육', venue: { name: '용인실내체육관' }, startAt: `${month}-20T10:00:00`, days: 14, accessibilityTags: ['장애인 화장실'], discoveryStatus: 'ELIGIBLE', discoveryAction: 'PREPARE', applyMethod: 'PAPER', description: '보치아 경기 규칙을 배우고 함께 연습해요.' },
    { programId: 13, title: '장애인 등록증 제시 시 20% 할인', organizerName: '용인 문화의 거리 상인회', district: '처인구', category: '할인과 혜택', days: 24, discoveryStatus: 'BENEFIT', discoveryAction: 'DETAILS', description: '참여 매장에서 장애인 등록증을 제시하면 할인 혜택을 받을 수 있어요.' },
  ];
  programs.push(...discoveryExamples.map(({ days, ...program }) => ({
    ...program, status: 'PUBLISHED', applyUntil: days == null ? null : new Date(deadlineStart + days * 86400000).toISOString(),
  })));
  const applications = [6, 7, 8, 9, 11, 12].map((programId, index) => {
    const program = programs.find(item => item.programId === programId);
    return {
      applicationId: index + 1, programId, groupId: 1, programTitle: program.title,
      groupName: '주간활동 A', startAt: program.startAt, venueName: program.venue.name,
      participantCount: 8, companionCount: 4, status: 'SUBMITTED',
    };
  });
  const events = [{ eventId: 1, title: '11월 기관 나들이', startAt: '2026-11-27T10:00:00', venue: places[0], applicationOrgCount: 0, participantCount: 0, newApplicationCount: 0 }];
  const notifications = [
    [1, 'NEW_APPLICATION', '새 신청', '기흥 ○○ 복지관이 가을 축제에 바로 신청했어요\n이용자 6명, 동반 2명 · 휠체어 2명', 'APPLICATION', null, false, 0],
    [2, 'APPLICATION_DECIDED', '접수 확인', '용인시 문화재단이 그림책 낭독회 접수를 확인했어요\n휠체어 3명 자리 확보, 조용한 자리 가능', null, null, false, 5],
    [3, 'CARE_CHANGED', '확인 필요', '햇살의 케어 정보가 바뀌었어요\n참여 가능이던 프로그램 2개가 확인 필요로 바뀌었어요', 'PROGRAM', null, false, 32],
    [4, 'DEADLINE', '마감 임박', '도자기 공방 신청이 3일 뒤 마감돼요\n남은 자리 4 · 아직 신청하지 않았어요', null, null, true, 120],
    [5, 'NEW_PROGRAM', '새 프로그램', '주간활동 A 조건에 맞는 프로그램 4개가 새로 올라왔어요\n장애인의 날 음악회 외 3개', null, null, true, 1440],
    [6, 'APPLICATION_DECIDED', '접수 확인', '가을 산책 프로그램 접수가 확인됐어요\n참여 일정은 신청 현황에서 확인할 수 있어요', 'APPLICATION', null, true, 4320],
  ].map(([notificationId, type, title, body, targetType, targetId, read, minutes]) => ({
    notificationId, type, title, body, targetType, targetId, read,
    createdAt: new Date(Date.now() - minutes * 60000).toISOString(),
  }));

  return {
    async getProfile() {
      return { organizationName: '용인 ○○ 주간보호센터', memberName: '최정원' };
    },
    async getPrograms() { return structuredClone(programs); },
    async getProgram(id) { return structuredClone(programs.find(item => item.programId === id)); },
    async getEligiblePrograms(groupId, { careIds = [] } = {}) {
      const groupPrograms = {
        1: matchedPrograms,
        2: [programs[0], programs[1], programs[2]],
        3: [programs[1], programs[2]],
      };
      return structuredClone({ items: (groupPrograms[groupId] ?? []).map(({ review, ...program }) => {
        const needsReview = review && (review.careId == null || careIds.includes(review.careId));
        return { program, result: needsReview ? 'NEEDS_REVIEW' : 'ELIGIBLE', review: needsReview ? review : null };
      }) });
    },
    async getPlaces() { return structuredClone(places); },
    async getEvents() { return structuredClone(events); },
    async getApplications() { return structuredClone(applications); },
    async prepareApplication({ programId, groupId, participantCount, companionCount, submitImmediately = false, received = false }) {
      const program = programs.find(item => item.programId === programId);
      const group = (await mockSupport.getGroups()).find(item => item.id === groupId);
      if (!program || !group) throw new Error('프로그램과 참여 그룹을 확인해 주세요.');
      if (submitImmediately && !program.canApplyDirectly) throw new Error('이 프로그램은 바로 신청할 수 없어요.');
      const existing = applications.find(item => item.programId === programId && item.groupId === groupId && item.status !== 'CANCELLED');
      const status = received ? 'RECEIVED' : submitImmediately ? 'SUBMITTED' : 'PREPARING';
      if (existing && (status === 'PREPARING' || existing.status === status || existing.status === 'RECEIVED')) return;
      const count = participantCount ?? group.memberCount;
      if (program.capacity != null && count > program.capacity) throw new Error('신청 인원이 프로그램 정원을 넘어요.');
      if (existing) {
        Object.assign(existing, { participantCount: count, companionCount, status });
        return;
      }
      applications.push({
        applicationId: applications.length + 1, programId, groupId, programTitle: program.title,
        groupName: group.name, startAt: program.startAt, venueName: program.venue?.name ?? null,
        participantCount: count, companionCount: companionCount ?? 0, status,
      });
    },
    async cancelApplication(id) {
      const item = applications.find(entry => entry.applicationId === id);
      if (item) item.status = 'CANCELLED';
    },
    async saveEvent(id, values) {
      const item = events.find(entry => entry.eventId === id);
      if (item) Object.assign(item, values);
      else events.push({ eventId: events.length + 1, applicationOrgCount: 0, participantCount: 0, newApplicationCount: 0, ...values });
    },
    async getNotifications({ page = 0, size = 5 } = {}) {
      return {
        content: structuredClone(notifications.slice(page * size, (page + 1) * size)),
        page, size, totalElements: notifications.length, totalPages: Math.ceil(notifications.length / size),
      };
    },
    async getUnreadCount() { return { unreadCount: notifications.filter(item => !item.read).length }; },
    async readNotification(id) {
      const item = notifications.find(entry => entry.notificationId === id);
      if (item) item.read = true;
      return structuredClone(item);
    },
    async readAllNotifications() {
      for (const item of notifications) item.read = true;
      return { unreadCount: 0 };
    },
  };
})();
