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
  const accessibilityMap = {
    month: 11,
    defaultDistrictId: 'cheoin',
    districts: [
      {
        id: 'suji', name: '수지구', facilityCount: 12, facilitiesPerThousand: 0.8, programCount: 22,
        boundary: '35,125 70,54 206,27 260,126 215,215 102,207', labelPoint: [150, 116],
        facilityPoints: [[97,158],[114,146],[164,151],[222,153],[76,135]],
        programPoints: [[60,109],[60,145],[82,139],[101,198],[110,207],[120,190],[119,166],[123,157],[165,211],[198,159],[211,103],[225,120],[241,106],[245,134],[183,100]],
        summary: '세 구 중 시설 한 곳당 프로그램이 가장 많아요.',
        neighborhoods: [{ name: '고기동', facilityCount: 2, programCount: 1 }, { name: '동천동', facilityCount: 3, programCount: 2 }],
      },
      {
        id: 'giheung', name: '기흥구', facilityCount: 19, facilitiesPerThousand: 1.2, programCount: 26,
        boundary: '102,207 215,215 260,126 405,104 486,199 450,345 315,381 188,335', labelPoint: [348, 241],
        facilityPoints: [[181,246],[225,226],[232,222],[235,303],[272,225],[280,211],[291,150],[290,260],[338,145],[336,318],[381,344],[402,258],[407,161],[423,276],[444,263],[450,179]],
        programPoints: [[207,261],[234,325],[289,190],[289,245],[293,273],[297,324],[305,136],[313,165],[313,318],[345,146],[351,198],[355,219],[397,318],[407,181],[412,188],[416,173],[410,244],[418,321],[436,234],[442,319],[444,171],[474,209]],
        summary: '프로그램은 가장 많고, 동네별 참여 기회에는 차이가 있어요.',
        neighborhoods: [{ name: '지곡동', facilityCount: 3, programCount: 1 }, { name: '고매동', facilityCount: 2, programCount: 1 }],
      },
      {
        id: 'cheoin', name: '처인구', facilityCount: 23, facilitiesPerThousand: 1.6, programCount: 12,
        boundary: '315,381 450,345 486,199 405,104 585,64 789,150 845,312 774,463 639,590 444,581 315,500',
        labelPoint: [610, 333],
        facilityPoints: [[476,141],[498,98],[465,353],[510,243],[527,235],[514,271],[605,205],[652,165],[530,398],[492,410],[361,415],[358,434],[610,447],[572,437],[653,426],[691,459],[710,464],[743,416],[650,566],[512,561],[444,579],[380,532],[388,532]],
        programPoints: [[501,128],[527,152],[532,178],[539,217],[727,177],[678,333],[703,371],[410,491],[441,501],[583,482],[511,567],[773,330]],
        summary: '시설은 가장 많은데 갈 수 있는 프로그램은 가장 적어요.',
        neighborhoods: [
          { name: '백암면', facilityCount: 4, programCount: 0 },
          { name: '원삼면', facilityCount: 3, programCount: 0 },
          { name: '양지면', facilityCount: 2, programCount: 1 },
          { name: '포곡읍', facilityCount: 3, programCount: 1 },
        ],
      },
    ],
  };
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
  matchedPrograms[3].applyMethod = 'PAPER';
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
    { programId: 12, title: '어울림 보치아 교실', organizerName: '용인시체육회', district: '처인구', category: '체육', venue: { name: '용인실내체육관' }, startAt: `${month}-20T10:00:00`, days: 14, accessibilityTags: ['장애인 화장실'], discoveryStatus: 'ELIGIBLE', discoveryAction: 'PREPARE', applyMethod: 'ONLINE', description: '보치아 경기 규칙을 배우고 함께 연습해요.' },
    { programId: 13, title: '장애인 등록증 제시 시 20% 할인', organizerName: '용인 문화의 거리 상인회', district: '처인구', category: '할인과 혜택', days: 24, discoveryStatus: 'BENEFIT', discoveryAction: 'DETAILS', description: '참여 매장에서 장애인 등록증을 제시하면 할인 혜택을 받을 수 있어요.' },
  ];
  programs.push(...discoveryExamples.map(({ days, ...program }) => ({
    ...program, status: 'PUBLISHED', applyUntil: days == null ? null : new Date(deadlineStart + days * 86400000).toISOString(),
  })));
  const applicationExamples = [
    [5, 'CONFIRMED', 2], [4, 'CONFIRMED', 2], [6, 'SUBMITTED'],
    [7, 'PREPARING', 2], [12, 'PREPARING', 3], [8, 'ATTENDED'],
    [7, 'CONFIRMED'], [9, 'ATTENDED'], [11, 'ATTENDED'], [12, 'ATTENDED'],
    [2, 'ATTENDED', 2], [3, 'ATTENDED', 3],
  ];
  const applicationGroups = {
    1: ['주간활동 A', 8, 4],
    2: ['주간활동 B', 6, 2],
    3: ['직업재활반', 5, 0],
  };
  const applications = applicationExamples.map(([programId, status, groupId = 1], index) => {
    const program = programs.find(item => item.programId === programId);
    const [groupName, participantCount, companionCount] = applicationGroups[groupId];
    return {
      applicationId: index + 1, programId, groupId, programTitle: program.title,
      groupName, startAt: program.startAt, venueName: program.venue.name,
      participantCount, companionCount, status,
    };
  });
  const eventEditorOptions = {
    features: [
      ...['승강기', '장애인 화장실', '주출입구 접근로', '높이 차이 없음', '장애인 주차', '점자블록'].map(label => ({ label, type: 'facility' })),
      ...['동반인 무료', '쉬운 말 안내', '조용한 휴식 공간', '휠체어석'].map(label => ({ label, type: 'support' })),
    ],
  };
  const eventDate = (days, time = '13:00') => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${time}:00`;
  };
  const events = [
    { eventId: 1, status: 'PUBLISHED', title: '개관 30주년 함께 걷는 가을 축제', startAt: eventDate(11), capacity: 40,
      venue: { name: '센터 강당과 앞마당' }, applicationOrgCount: 5, participantCount: 34, newApplicationCount: 2,
      preparationTasks: [
        { id: 'wheelchair', label: '휠체어 자리 7석', note: '앞줄 통로 쪽, 강당 출입문 기준', groups: ['수지 2', '기흥 2', '그룹홈 3'], ready: true },
        { id: 'restroom', label: '장애인 화장실 안내 표지', note: '강당 옆 1층 화장실까지 3곳', groups: ['전체'], ready: true },
        { id: 'easy', label: '쉬운 말 안내 자료', note: '순서표를 그림과 함께 출력', groups: ['수지', '처인 주간보호'], ready: true },
        { id: 'lift', label: '리프트 차량 정차 공간 3대', note: '정문 앞 12:30부터 비워 두기', groups: ['수지', '그룹홈', '작업장'], ready: false },
        { id: 'quiet', label: '조용한 휴식 공간', note: '2층 상담실 열어 두기', groups: ['그룹홈', '수지 하늘'], ready: true },
        { id: 'lunch', label: '점심 식사 보조', note: '다진 음식 1인분, 보조 인력 1명', groups: ['처인 주간보호'], ready: false },
      ],
      applicants: [
        { organization: '수지 ○○ 주간보호센터', groupName: '주간활동반', managerName: '김○○', managerRole: '사회복지사',
          phone: '031-000-0000', contactHours: '평일 9시~18시', submissionMethod: '지원 카드로 신청했어요', transport: '리프트 차량 1대', arrivalTime: '12:40',
          participantCount: 6, companionCount: 2, wheelchairCount: 2, supportNeeds: ['휠체어 2', '쉬운 말 안내'],
          supportChecklist: [{ label: '휠체어 2명 자리', note: '앞줄 통로 쪽 2석', ready: true }, { label: '쉬운 말 안내', note: '진행자에게 전달함', ready: true }, { label: '리프트 차량 승하차', note: '정문 앞 정차 공간 확인 필요', ready: false }],
          individualCareCount: 1, individualCare: [{ name: '하늘', title: '큰 소리 피하기', note: '출입문 가까운 자리에 앉고, 필요할 때 휴식 공간으로 이동할 수 있게 해 주세요.' }],
          note: '점심 식사가 포함인지, 도시락을 따로 챙겨야 하는지 궁금해요.', status: 'NEW', appliedAt: new Date().toISOString() },
        { organization: '기흥 ○○ 장애인복지관', groupName: '성인 여가반', managerName: '박○○', participantCount: 4, companionCount: 2, wheelchairCount: 2, supportNeeds: ['휠체어 2', '장애인 화장실'], transport: '대중교통', arrivalTime: '12:50', status: 'NEW', appliedAt: new Date(Date.now() - 600000).toISOString() },
        { organization: '용인 ○○ 그룹홈', groupName: '생활반', managerName: '이○○', participantCount: 4, companionCount: 2, wheelchairCount: 3, supportNeeds: ['휠체어 3', '조용한 자리'], individualCareCount: 2,
          individualCare: [{ name: '별', title: '전동휠체어 충전 콘센트' }, { name: '구름', title: '휴식 30분마다' }], transport: '리프트 차량', arrivalTime: '12:45', status: 'INQUIRY', appliedAt: eventDate(-9) },
        { organization: '처인 ○○ 보호작업장', groupName: '작업반', managerName: '최○○', participantCount: 6, companionCount: 2, supportNeeds: ['동반 1명당 3명'], transport: '승합차', arrivalTime: '12:30', status: 'CONFIRMED', appliedAt: eventDate(-11) },
        { organization: '처인 ○○ 주간보호센터', groupName: '주간활동반', managerName: '정○○', participantCount: 4, companionCount: 2, supportNeeds: ['쉬운 말 안내', '점심 식사 보조'], individualCareCount: 1,
          individualCare: [{ name: '솔', title: '다진 음식, 식사 보조' }], status: 'CONFIRMED', appliedAt: eventDate(-13) },
      ] },
    { eventId: 2, status: 'DRAFT', title: '우리 동네 겨울 축제', startAt: eventDate(25), endAt: eventDate(25, '16:00'), capacity: 40,
      venue: { name: '용인 ○○ 주간보호센터 1층 강당과 앞마당', district: '처인구' }, accessibilityTags: ['승강기', '장애인 화장실', '주출입구 접근로', '높이 차이 없음', '장애인 주차', '동반인 무료', '쉬운 말 안내'],
      notes: '쉬고 싶으면 조용한 방에서 쉴 수 있어요.', applicationOrgCount: 0, participantCount: 0, newApplicationCount: 0 },
    { eventId: 3, status: 'PUBLISHED', title: '어울림 합창 연습', startAt: eventDate(4, '15:00'), capacity: 10, venue: { name: '센터 1층 강당' }, applicationOrgCount: 3, participantCount: 6, newApplicationCount: 1,
      applicants: ['주간보호센터 A', '지역 활동센터', '직업재활시설'].map(organization => ({ organization, participantCount: 2 })) },
    { eventId: 4, status: 'PUBLISHED', title: '겨울맞이 손뜨개 모임', startAt: eventDate(23, '10:00'), capacity: 15, venue: { name: '센터 2층 프로그램실' }, applicationOrgCount: 2, participantCount: 9, newApplicationCount: 2,
      applicants: [{ organization: '주간보호센터 A', participantCount: 5 }, { organization: '주간보호센터 B', participantCount: 4 }] },
    ...[
      ['여름 텃밭 가꾸기', -30, 4, 28, 7], ['함께 걷는 공원 산책', -45, 3, 18, 2], ['동네 음악회', -55, 2, 16, 1],
      ['가을 공예 교실', -65, 2, 12, 1], ['그림책 읽는 날', -80, 1, 8, 1],
    ].map(([title, days, applicationOrgCount, participantCount, reviewCount], index) => ({
      eventId: index + 5, status: 'COMPLETED', title, startAt: eventDate(days), venue: { name: '센터 프로그램실' },
      applicationOrgCount, participantCount, reviewCount, rating: index === 0 ? 4.8 : null,
      reviewImprovements: index === 0 ? '그늘막을 늘리고, 순서표에 그림을 넣어 쉬운 말 안내를 준비해 주세요.' : '',
      reviews: Array.from({ length: reviewCount }, (_, reviewIndex) => {
        const organizations = ['수지 ○○ 주간보호센터', '용인 ○○ 그룹홈', '처인 ○○ 보호작업장', '기흥 ○○ 장애인복지관'];
        const comments = ['휠체어 높이에 맞춘 텃밭에서 직접 흙을 만질 수 있었어요.', '햇볕이 강해서 그늘막이 조금 더 있으면 좋겠어요.', '수확한 채소를 가져갈 수 있어서 좋아했어요.', '함께 활동하기 편했고 진행자 안내가 친절했어요.'];
        return {
          organization: organizations[reviewIndex % organizations.length],
          comment: comments[reviewIndex % comments.length],
          createdAt: eventDate(days + 1 + (reviewIndex === 0 ? 1 : 0)),
          rating: reviewIndex === 1 ? 4 : 5,
          participantCount: 5 - reviewIndex % 3, companionCount: 2,
          checks: [{ label: '높이 맞춤 텃밭', met: true }, { label: '장애인 화장실', met: reviewIndex !== 4 }, { label: '동반인 무료', met: true }, { label: '쉬운 말 안내', met: reviewIndex < 4 }],
          reactions: reviewIndex < 5 ? ['즐거워했어요', '다시 가고 싶어해요'] : ['즐거워했어요'],
          reply: reviewIndex > 0 && reviewIndex < 6 ? '다음 행사에도 의견을 반영할게요.' : null,
        };
      }),
    })),
  ];
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
    async getAccessibilityMap() { return structuredClone(accessibilityMap); },
    async getEvents() { return structuredClone(events); },
    async getEventEditorOptions() { return structuredClone(eventEditorOptions); },
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
    async markApplicationReceived(id) {
      const item = applications.find(entry => entry.applicationId === id);
      if (item?.status === 'RECEIVED') return;
      if (item?.status !== 'SUBMITTED') throw new Error('접수 완료로 표시할 수 없는 신청이에요.');
      item.status = 'RECEIVED';
    },
    async saveApplicationReviewDraft(id, review) {
      const item = applications.find(entry => entry.applicationId === id);
      if (item?.status !== 'ATTENDED') throw new Error('참여를 마친 신청에만 후기를 남길 수 있어요.');
      item.reviewDraft = structuredClone(review);
    },
    async saveApplicationReview(id, review) {
      const item = applications.find(entry => entry.applicationId === id);
      if (item?.status !== 'ATTENDED') throw new Error('참여를 마친 신청에만 후기를 남길 수 있어요.');
      item.review = structuredClone(review);
      delete item.reviewDraft;
    },
    async saveEvent(id, values) {
      const item = events.find(entry => entry.eventId === id);
      if (item) Object.assign(item, values);
      else events.push({ eventId: events.length + 1, applicationOrgCount: 0, participantCount: 0, newApplicationCount: 0, ...values });
    },
    async saveEventApplicant(eventId, index, changes) {
      const event = events.find(item => item.eventId === eventId);
      const applicant = event?.applicants?.[index];
      if (!applicant) throw new Error('신청 기관을 찾을 수 없어요.');
      Object.assign(applicant, structuredClone(changes));
      if (changes.status) event.newApplicationCount = event.applicants.filter(item => item.status === 'NEW').length;
      return structuredClone(applicant);
    },
    async saveEventPreparationTask(eventId, taskId, ready) {
      const tasks = events.find(event => event.eventId === eventId)?.preparationTasks;
      const task = tasks?.find(item => item.id === taskId);
      if (!task) throw new Error('준비 항목을 찾을 수 없어요.');
      task.ready = ready;
      return structuredClone(tasks);
    },
    async saveEventReviewReply(eventId, index, reply) {
      const reviews = events.find(event => event.eventId === eventId)?.reviews;
      const review = reviews?.[index];
      if (!review) throw new Error('후기를 찾을 수 없어요.');
      review.reply = reply;
      return structuredClone(reviews);
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
