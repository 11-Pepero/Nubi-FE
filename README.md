# Nubi-FE

프로젝트 폴더에서 `npm run dev`를 실행하고 브라우저에서 [지원 관리 화면](http://localhost:4173/)을 엽니다. 서버가 실행되는 동안 터미널을 열어 두세요.

화면은 예시 데이터로 동작합니다. 그룹이나 개별 케어 명단에서 바꾼 내용은 새로고침하면 초기화됩니다.

예시 응답과 저장 동작은 `mock-data.js`의 `mockSupport`와 `mockActivity`에 있습니다. 화면은 이 함수들이 반환하는 데이터로 표시됩니다.

- 알림은 `NotificationResponseDto` 목록과 `unreadCount`를 별도로 사용합니다. 더보기는 페이지 응답의 `totalPages`를 따릅니다. 실제 연동 시 SSE 수신과 재연결은 데이터 제공 함수에 추가해야 합니다.
- 신청 준비는 `programId`, `groupId`, `careIds`, `participantCount`, `companionCount`를 전달합니다. 목록은 신청 요약 응답의 프로그램명과 인원수를 표시합니다.
- 프로그램은 목록과 상세를 따로 읽습니다. 활동 설명은 상세의 `description`에서 표시합니다. 행사 편집과 지도 장소는 화면용 로컬 모델을 사용하므로 실제 연동 시 해당 요청과 응답에 맞춰 변환합니다.
