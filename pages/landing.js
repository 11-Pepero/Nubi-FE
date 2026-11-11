const stats = [
  ['38,206명', '용인시 등록장애인', '2025.12.31 기준'],
  ['43곳', '장애인복지시설', '처인구 · 기흥구 · 수지구'],
  ['1,083건', '용인시 프로그램 공고', '오늘 올라온 프로그램 포함'],
  ['0건', '접근성 정보가 적힌 공고', '휠체어, 화장실, 동반 정보 없음'],
];

const features = [
  ['▣', '지원 카드 한 번 등록', '그룹에서 휠체어, 동반, 쉬운 말 안내처럼 필요한 지원만 적어요. 이름과 진단명은 받지 않아요.'],
  ['◎', '참여 가능한 곳만 골라 보기', '흩어진 공고를 모아 우리 그룹이 참여 가능한 곳과 확인이 필요한 곳을 나눠 보여줘요.'],
  ['✦', '신청서와 문의문은 AI가', '외부 공고도 신청서 초안, 통화 요약, 문의 문자를 준비해요. 접수는 담당자가 확인해요.'],
  ['♧', '우리 기관 행사도 알리기', '행사를 올리면 다른 기관이 지원 카드로 신청하고, 필요한 지원이 한눈에 모여요.'],
];

const steps = [
  ['기관 가입', '기관 정보와 담당자 계정'],
  ['지원 카드 등록', '그룹과 개별 케어'],
  ['참여 가능 목록', '바로 신청 또는 신청 준비'],
  ['다녀와서 후기', '다음 기관의 판단에 반영'],
];

const questions = [
  ['이용자 개인정보를 올려야 하나요?', '아니요. 그룹에 필요한 지원만 적고, 따로 챙길 일이 있으면 기관이 정한 별칭으로만 관리해요.'],
  ['외부 기관 프로그램도 대신 신청해 주나요?', '신청서와 문의 문구를 준비할 수 있어요. 외부 기관에 실제로 접수하는 일은 담당자가 진행해요.'],
  ['참여 가능 판정은 얼마나 믿을 수 있나요?', '공고에 공개된 정보와 기관에서 등록한 지원 조건을 비교해요. 정보가 부족한 항목은 확인 필요로 표시해요.'],
  ['이용 요금이 있나요?', '이 화면은 서비스 미리보기예요. 실제 이용 요금은 아직 안내되지 않았어요.'],
];

export function mountLanding(container) {
  container.innerHTML = `
    <div class="landing-top">
      <header class="landing-header">
        <a class="landing-brand" href="#landing" aria-label="Nubi 홈">
          <span class="landing-brand-mark" aria-hidden="true"><img src="./nubi-logo.png" alt="" width="46" height="46"></span>
          <span class="landing-brand-text"><strong>Nubi:</strong> <span>다양한 복지 기회를 누비다</span></span>
        </a>
        <nav class="landing-nav" aria-label="랜딩 메뉴">
          <a href="#landing-about">서비스 소개</a>
          <a href="#landing-steps">이용 방법</a>
          <a href="#landing-faq">자주 묻는 질문</a>
          <a href="#login">로그인</a>
          <button type="button" class="landing-button" data-landing-access>기관 가입하기</button>
        </nav>
      </header>
      <section class="landing-hero" aria-labelledby="landing-title">
        <div class="landing-frame">
          <p class="landing-kicker">용인 공공데이터로 찾는 참여 가능 프로그램</p>
          <h1 id="landing-title">함께 갈 수 있는 곳,<br>이제 묻지 않고 바로 찾아요</h1>
          <p class="landing-intro">기관이 이용자 지원 정보를 한 번 등록하면, 참여할 수 있는 프로그램만 골라 보여주고<br>신청서와 문의문까지 준비해 드려요.</p>
          <div class="landing-actions">
            <button type="button" class="landing-button" data-landing-access>우리 기관 시작하기</button>
            <a class="landing-button landing-outline" href="#landing-demo">프로그램 둘러보기</a>
          </div>
        </div>
      </section>
    </div>
    <main class="landing-main">
      <section class="landing-wrap landing-about" id="landing-about">
        <p class="landing-kicker">왜 필요한가요</p>
        <h2>사람도, 시설도, 프로그램도 많은데<br>함께 갈 수 있는지는 아무도 적어 두지 않았어요.</h2>
        <ul class="landing-stats">${stats.map(([value, label, note]) => `<li><strong>${value}</strong><b>${label}</b><small>${note}</small></li>`).join('')}</ul>
        <p class="landing-caption">용인시 장애인, 복지시설, 프로그램 공고 현황 예시</p>
      </section>
      <section class="landing-wrap landing-features">
        <div><p class="landing-kicker">할 수 있는 일</p><h2>한 번 등록하면<br>찾기부터 신청까지</h2></div>
        <ul>${features.map(([icon, title, desc]) => `<li><span aria-hidden="true">${icon}</span><div><h3>${title}</h3><p>${desc}</p></div></li>`).join('')}</ul>
      </section>
      <section class="landing-wrap landing-steps" id="landing-steps">
        <p class="landing-kicker">이용 방법</p><h2>네 단계면 충분해요</h2>
        <ol>${steps.map(([title, desc], i) => `<li><span aria-hidden="true"><small>STEP</small><b>0${i + 1}</b></span><h3>${title}</h3><p>${desc}</p></li>`).join('')}</ol>
      </section>
      <section class="landing-wrap landing-faq" id="landing-faq">
        <h2>자주 묻는 질문</h2>
        ${questions.map(([question, answer], i) => `<details name="landing-questions"${i === 0 ? ' open' : ''}><summary>${question}</summary><p>${answer}</p></details>`).join('')}
      </section>
      <section class="landing-wrap landing-end">
        <h2>다음 나들이는<br>함께 갈 수 있는 곳으로</h2>
        <button type="button" class="landing-button" data-landing-access>우리 기관 시작하기</button>
      </section>
    </main>
    <footer class="landing-footer"><div class="landing-wrap"><a href="#landing"><strong>함께가요 용인</strong></a><span>Nubi · 다양한 복지 기회를 누비다</span></div></footer>
    <dialog class="landing-access" aria-labelledby="landing-access-title">
      <h2 id="landing-access-title">기관 서비스 미리보기</h2>
      <p>로그인과 기관 가입은 아직 연결되지 않았어요. 예시 데이터로 기관 화면을 둘러볼 수 있어요.</p>
      <div class="landing-actions">
        <form method="dialog"><button type="submit" class="landing-button landing-outline">닫기</button></form>
        <a href="#support" class="landing-button">기관 화면 둘러보기</a>
      </div>
    </dialog>`;

  const dialog = container.querySelector('dialog');
  for (const button of container.querySelectorAll('[data-landing-access]')) {
    button.addEventListener('click', () => dialog.showModal());
  }
  dialog.querySelector('a').addEventListener('click', () => dialog.close());
}
