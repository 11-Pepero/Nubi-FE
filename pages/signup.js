const organizationTypes = ['주간보호센터', '장애인복지관', '그룹홈', '보호작업장', '공공기관', '기타'];
const agreements = [
  ['서비스 이용약관', '기관 담당자는 기관 정보를 정확하게 입력하고, 기관에서 권한을 부여받은 범위 안에서 서비스를 이용해요.'],
  ['개인정보 처리방침', '가입 시 입력하는 담당자 이름, 연락처, 이메일은 계정 관리와 기관 연락에 사용돼요. 이 체험 화면에서는 입력값을 서버에 저장하지 않아요.'],
  ['이용자 실명과 진단명은 올리지 않아요', '지원 카드에는 필요한 지원 정보만 적어 주세요. 이용자를 구분할 때는 별칭을 사용해 주세요.'],
];
const demoCode = '123456';
const sampleAddress = '경기 용인시 처인구 금령로';

export function renderSignup(container, { register } = {}) {
  container.innerHTML = `
    <header class="login-header signup-header"><a class="login-brand" href="#landing"><span class="landing-brand-mark"><img src="./nubi-logo.png" width="46" height="46" alt=""></span><strong>Nubi</strong></a><p class="login-signup">이미 계정이 있나요? <a href="#login">로그인</a></p></header>
    <main class="signup-main">
      <ol class="signup-steps" aria-label="가입 단계">
        ${['기관 정보', '담당자 계정', '가입 완료'].map((label, i) => `<li><span aria-hidden="true">${i + 1}</span>${label}</li>`).join('')}
      </ol>
      <form class="signup-form" data-signup-step="0">
        <h1 tabindex="-1">어떤 기관인가요?</h1>
        <p class="login-description">기관 정보는 다른 기관이 행사에 신청할 때 함께 보여요.</p>
        <div class="login-field"><label for="signup-org">기관 이름</label><input id="signup-org" name="organizationName" required maxlength="100" placeholder="기관 이름을 입력해 주세요"></div>
        <fieldset class="signup-types"><legend>기관 유형</legend>
          ${organizationTypes.map((type, i) => `<label><input type="radio" name="organizationType" value="${type}" required${i === 0 ? ' checked' : ''}><span>${type}</span></label>`).join('')}
        </fieldset>
        <div class="login-field"><label for="signup-address">주소</label><div class="signup-input-action"><input id="signup-address" name="address" required maxlength="160" placeholder="주소를 입력해 주세요"><button type="button" data-address-search>주소 검색</button></div></div>
        <div class="signup-address-result" role="status" hidden></div>
        <div class="signup-pair">
          <div class="login-field"><label for="signup-phone">대표 전화</label><input id="signup-phone" name="organizationPhone" type="tel" autocomplete="tel" required placeholder="031-000-0000"></div>
          <div class="login-field"><label for="signup-count">함께 다니는 이용자 수</label><input id="signup-count" name="participantCount" type="number" min="0" step="1" required placeholder="이용자 수를 입력해 주세요"></div>
        </div>
        <div class="signup-actions"><button class="login-submit" type="submit">다음</button></div>
      </form>
      <form class="signup-form" data-signup-step="1" hidden>
        <h1 tabindex="-1">담당자 계정을 만들어요</h1>
        <p class="login-description">첫 담당자는 기관 관리자가 돼요. 다른 담당자는 가입 뒤 초대할 수 있어요.</p>
        <div class="signup-pair">
          <div class="login-field"><label for="signup-name">이름</label><input id="signup-name" name="name" autocomplete="name" required maxlength="50" placeholder="이름을 입력해 주세요"></div>
          <div class="login-field"><label for="signup-contact">연락처</label><input id="signup-contact" name="phone" type="tel" required placeholder="010-0000-0000"></div>
        </div>
        <div class="login-field"><label for="signup-email">이메일</label><div class="signup-input-action"><input id="signup-email" name="email" type="email" autocomplete="username" required maxlength="254" placeholder="이메일을 입력해주세요"><button type="button" data-send-code>인증번호 보내기</button></div></div>
        <div class="login-field" data-code-field hidden><label for="signup-code">인증번호</label><div class="signup-input-action"><input id="signup-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="인증번호 6자리"><button type="button" data-verify-code>인증번호 확인</button></div></div>
        <p class="signup-verification" role="status"></p>
        <div class="login-field"><label for="signup-password">비밀번호</label><input id="signup-password" name="password" type="password" autocomplete="new-password" required minlength="8" aria-describedby="signup-password-hint"><small id="signup-password-hint">8자 이상, 영문과 숫자를 함께 써 주세요.</small></div>
        <div class="login-field"><label for="signup-confirm">비밀번호 확인</label><input id="signup-confirm" name="confirm" type="password" autocomplete="new-password" required></div>
        <fieldset class="signup-agreements" aria-label="필수 약관">
          <label class="signup-agreement-all"><input type="checkbox" data-agree-all> 모두 동의</label>
          ${agreements.map(([title], i) => `<div class="signup-agreement"><label><input type="checkbox" data-agreement required> ${title} (필수)</label><button type="button" data-agreement-details="${i}" aria-label="${title} 보기">보기</button></div>`).join('')}
        </fieldset>
        <p class="login-error" role="alert" hidden></p>
        <div class="signup-actions"><button class="signup-back" type="button" data-signup-back>이전</button><button class="login-submit" type="submit">가입하기</button></div>
      </form>
      <section class="signup-complete" data-signup-step="2" hidden>
        <span class="signup-check" aria-hidden="true">✓</span>
        <h1 tabindex="-1">가입을 마쳤어요</h1>
        <p class="login-description">지원 카드를 등록하면 바로 참여 가능한 프로그램을 보여드려요.</p>
        <ol class="signup-next">
          <li><a href="#support"><span>1</span><div><strong>공동 지원 그룹 만들기</strong><small>몇 명이 함께 다니고 어떤 지원이 필요한지 적어요</small></div><small>약 3분 ›</small></a></li>
          <li><a href="#support"><span>2</span><div><strong>개별 케어 명단 추가</strong><small>따로 챙길 분을 별칭으로 적어요</small></div><small>선택 ›</small></a></li>
          <li><button type="button" data-invite><span>3</span><div><strong>다른 담당자 초대</strong><small>같은 기관 담당자를 링크로 불러요</small></div><small>선택 ›</small></button></li>
        </ol>
        <a class="login-submit" href="#support">지원 카드 등록하러 가기</a>
        <a class="signup-skip" href="#landing-demo">나중에 할게요, 프로그램부터 둘러보기</a>
      </section>
    </main>
    <dialog class="login-help" aria-labelledby="signup-dialog-title"><h2 id="signup-dialog-title"></h2><p></p><form method="dialog"><button class="pill" type="submit">닫기</button></form></dialog>`;

  const steps = [...container.querySelectorAll('[data-signup-step]')];
  const indicators = [...container.querySelectorAll('.signup-steps li')];
  const [organization, account] = steps;
  const signupButton = account.querySelector('button[type="submit"]');
  const typeCodes = ['DAY_CARE', 'WELFARE_CENTER', 'GROUP_HOME', 'WORKSHOP', 'PUBLIC'];
  if (register) {
    organization.querySelector('[data-address-search]').hidden = true;
    organization.elements.participantCount.closest('.login-field').hidden = true;
    organization.elements.participantCount.disabled = true;
    organization.elements.organizationPhone.maxLength = 20;
    organization.elements.organizationType[5].closest('label').hidden = true;
    account.querySelector('.signup-pair').hidden = true;
    account.elements.name.disabled = true;
    account.elements.phone.disabled = true;
    account.querySelector('[data-send-code]').hidden = true;
    account.elements.email.maxLength = 100;
    account.elements.password.maxLength = 64;
  }
  const dialog = container.querySelector('dialog');
  const showDialog = (title, message) => {
    dialog.querySelector('h2').textContent = title;
    dialog.querySelector('p').textContent = message;
    dialog.showModal();
  };
  function showStep(current, focus = true) {
    steps.forEach((section, i) => { section.hidden = current !== i; });
    indicators.forEach((indicator, i) => {
      indicator.dataset.state = i < current ? 'done' : i === current ? 'current' : 'pending';
      indicator.querySelector('span').textContent = i < current ? '✓' : i + 1;
      if (i === current) indicator.setAttribute('aria-current', 'step');
      else indicator.removeAttribute('aria-current');
    });
    container.querySelector('.login-signup').hidden = current === 2;
    if (focus) steps[current].querySelector('h1').focus();
    window.scrollTo(0, 0);
  }
  showStep(0, false);

  const address = organization.elements.address;
  const addressResult = container.querySelector('.signup-address-result');
  address.addEventListener('input', () => { addressResult.hidden = true; });
  container.querySelector('[data-address-search]').addEventListener('click', () => {
    const query = address.value.trim();
    if (!query) {
      address.reportValidity();
      address.focus();
      return;
    }
    addressResult.textContent = sampleAddress.includes(query) || query.includes(sampleAddress)
      ? `예시 시설 주소를 찾았어요 · ${sampleAddress}`
      : '일치하는 예시 시설이 없어요. 입력한 주소로 계속할 수 있어요.';
    addressResult.hidden = false;
  });
  organization.addEventListener('submit', event => {
    event.preventDefault();
    showStep(1);
  });
  container.querySelector('[data-signup-back]').addEventListener('click', () => showStep(0));

  const email = account.elements.email;
  const codeField = account.querySelector('[data-code-field]');
  const code = account.querySelector('#signup-code');
  const status = account.querySelector('[role="status"]');
  const error = account.querySelector('[role="alert"]');
  const send = account.querySelector('[data-send-code]');
  let sentTo = '';
  let verifiedEmail = '';
  let submitting = false;
  const showError = message => {
    error.textContent = message;
    error.hidden = false;
  };
  account.addEventListener('input', () => { error.hidden = true; });
  email.addEventListener('input', () => {
    sentTo = verifiedEmail = '';
    code.value = '';
    codeField.hidden = true;
    status.textContent = '';
    send.textContent = '인증번호 보내기';
  });
  send.addEventListener('click', () => {
    if (!email.reportValidity()) return;
    error.hidden = true;
    sentTo = email.value.trim();
    verifiedEmail = '';
    code.value = '';
    codeField.hidden = false;
    status.textContent = `체험용 인증번호 ${demoCode}를 입력해 주세요.`;
    send.textContent = '다시 보내기';
    code.focus();
  });
  account.querySelector('[data-verify-code]').addEventListener('click', () => {
    if (email.value.trim() !== sentTo || code.value.trim() !== demoCode) {
      showError('인증번호를 다시 확인해 주세요.');
      code.focus();
      return;
    }
    verifiedEmail = sentTo;
    error.hidden = true;
    codeField.hidden = true;
    status.textContent = '인증을 마쳤어요.';
    account.elements.password.focus();
  });

  const agreeAll = account.querySelector('[data-agree-all]');
  const checkboxes = [...account.querySelectorAll('[data-agreement]')];
  agreeAll.addEventListener('change', () => checkboxes.forEach(box => { box.checked = agreeAll.checked; }));
  checkboxes.forEach(box => box.addEventListener('change', () => {
    agreeAll.checked = checkboxes.every(item => item.checked);
    agreeAll.indeterminate = !agreeAll.checked && checkboxes.some(item => item.checked);
  }));
  account.querySelectorAll('[data-agreement-details]').forEach(button => {
    button.addEventListener('click', () => showDialog(...agreements[Number(button.dataset.agreementDetails)]));
  });
  account.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    error.hidden = true;
    if (!register && (!verifiedEmail || verifiedEmail !== email.value.trim())) {
      showError('이메일 인증을 먼저 완료해 주세요.');
      send.focus();
      return;
    }
    const { password, confirm } = account.elements;
    if (!/[a-z]/i.test(password.value) || !/\d/.test(password.value)) {
      showError('비밀번호에 영문과 숫자를 함께 써 주세요.');
      password.focus();
      return;
    }
    if (password.value !== confirm.value) {
      showError('비밀번호가 서로 달라요.');
      confirm.focus();
      return;
    }
    if (register) {
      submitting = true;
      signupButton.disabled = true;
      try {
        const fields = organization.elements;
        await register({
          orgName: fields.organizationName.value.trim(),
          type: typeCodes[organizationTypes.indexOf(fields.organizationType.value)],
          address: fields.address.value.trim(),
          phone: fields.organizationPhone.value.trim(),
          email: email.value.trim(),
          password: password.value,
        });
      } catch (failure) {
        showError(failure.message);
        return;
      } finally {
        submitting = false;
        signupButton.disabled = false;
      }
    }
    account.reset();
    organization.reset();
    showStep(2);
  });
  container.querySelector('[data-invite]').addEventListener('click', () => showDialog('다른 담당자 초대', '실제 초대 링크는 가입 API 연결 후 만들 수 있어요.'));
}
