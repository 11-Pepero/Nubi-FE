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
    { id: 1, name: '주간활동 A', memberCount: 8, eligibleCount: 12, checkCount: 5,
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
  const eligibleIds = new Map([[1, [1, 2]], [2, [1, 2, 3]], [3, [2, 3]]]);
  const applications = [];
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
    async getEligiblePrograms(groupId) {
      return structuredClone(programs.filter(item => eligibleIds.get(groupId)?.includes(item.programId))
        .map(program => ({ program, result: 'ELIGIBLE' })));
    },
    async getPlaces() { return structuredClone(places); },
    async getEvents() { return structuredClone(events); },
    async getApplications() { return structuredClone(applications); },
    async prepareApplication({ programId, groupId, participantCount, companionCount }) {
      const program = programs.find(item => item.programId === programId);
      const group = (await mockSupport.getGroups()).find(item => item.id === groupId);
      if (!program || !group) throw new Error('프로그램과 참여 그룹을 확인해 주세요.');
      if (applications.some(item => item.programId === programId && item.groupId === groupId && item.status === 'PREPARING')) return;
      const count = participantCount ?? group.memberCount;
      if (program.capacity != null && count > program.capacity) throw new Error('신청 인원이 프로그램 정원을 넘어요.');
      applications.push({
        applicationId: applications.length + 1, programId, groupId, programTitle: program.title,
        groupName: group.name, startAt: program.startAt, venueName: program.venue?.name ?? null,
        participantCount: count, companionCount: companionCount ?? 0, status: 'PREPARING',
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
