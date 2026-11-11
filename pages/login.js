export function renderLogin(container, { authenticate } = {}) {
  container.innerHTML = `
    <header class="login-header">
      <a class="login-brand" href="#landing"><span class="landing-brand-mark"><img src="./nubi-logo.png" width="46" height="46" alt=""></span><strong>Nubi</strong></a>
      <p class="login-signup"><span>처음이신가요?</span><a href="#signup">기관 가입하기</a></p>
    </header>
    <main class="login-main">
      <section class="login-card" aria-labelledby="login-title">
        <h1 id="login-title">다시 오셨네요</h1>
        <p class="login-description">기관 담당자 계정으로 로그인해 주세요.</p>
        <form class="login-form">
          <div class="login-field"><label for="login-email">이메일</label><input id="login-email" name="email" type="email" autocomplete="username" placeholder="이메일을 입력해주세요" required maxlength="254"></div>
          <div class="login-field"><label for="login-password">비밀번호</label><div class="login-password"><input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="비밀번호를 입력해 주세요" required><button type="button" class="login-eye" aria-label="비밀번호 표시" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>
          <div class="login-options"><label><input name="rememberMe" type="checkbox" checked> 로그인 유지</label><a href="#login/reset">비밀번호 찾기</a></div>
          <p class="login-error" role="alert" hidden></p>
          <button class="login-submit" type="submit">로그인</button>
        </form>
        <div class="login-divider"><span>또는</span></div>
        <button class="login-invite" type="button" data-login-help="invite"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 13 4-4m-6 2-2 2a4 4 0 0 0 6 6l3-3m-6-8 3-3a4 4 0 0 1 6 6l-2 2"/></svg><span><strong>초대 링크를 받았나요?</strong><small>같은 기관 담당자가 보낸 링크로 들어오면 바로 합류해요.</small></span></button>
      </section>
    </main>
    <dialog class="login-help" aria-labelledby="login-help-title"><h2 id="login-help-title"></h2><p></p><form method="dialog"><button class="pill" type="submit">확인</button></form></dialog>`;

  const form = container.querySelector('.login-form');
  const password = form.elements.password;
  const eye = container.querySelector('.login-eye');
  const error = container.querySelector('.login-error');
  const submit = container.querySelector('.login-submit');
  const dialog = container.querySelector('dialog');
  let submitting = false;
  eye.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    eye.setAttribute('aria-pressed', String(visible));
    eye.setAttribute('aria-label', visible ? '비밀번호 숨기기' : '비밀번호 표시');
  });
  form.addEventListener('input', () => { error.hidden = true; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    error.hidden = true;
    const request = {
      email: form.elements.email.value.trim(),
      password: password.value,
      rememberMe: form.elements.rememberMe.checked,
    };
    if (!authenticate) {
      error.textContent = '로그인 연결을 준비하고 있어요. 연결이 완료되면 기관 계정으로 이용할 수 있어요.';
      error.hidden = false;
      return;
    }
    submitting = true;
    submit.disabled = true;
    submit.textContent = '로그인 중…';
    form.setAttribute('aria-busy', 'true');
    try {
      const response = await authenticate(request);
      if (!container.isConnected || container.hidden) return;
      if (!response?.success) {
        error.textContent = response?.error?.message || '이메일과 비밀번호를 확인해 주세요.';
        error.hidden = false;
        return;
      }
      location.hash = 'support';
    } catch {
      error.textContent = '로그인하지 못했어요. 잠시 후 다시 시도해 주세요.';
      error.hidden = false;
    } finally {
      submitting = false;
      submit.disabled = false;
      submit.textContent = '로그인';
      form.removeAttribute('aria-busy');
    }
  });
  const help = {
    invite: ['초대 링크로 합류하기', '같은 기관 담당자가 보내 준 초대 링크를 열어 주세요.'],
  };
  for (const button of container.querySelectorAll('[data-login-help]')) {
    button.addEventListener('click', () => {
      const [title, message] = help[button.dataset.loginHelp];
      dialog.querySelector('h2').textContent = title;
      dialog.querySelector('p').textContent = message;
      dialog.showModal();
    });
  }
}

export function renderPasswordReset(container) {
  const demoCode = '123456';
  container.innerHTML = `
    <header class="login-header"><a class="login-brand" href="#landing"><strong>Nubi</strong></a><a class="pill" href="#login">로그인으로 돌아가기</a></header>
    <main class="login-main">
      <section class="login-card" aria-labelledby="login-title">
        <h1 id="login-title">비밀번호 찾기</h1>
        <p class="login-description">가입한 이메일을 인증한 뒤 새 비밀번호를 설정해 주세요.</p>
        <form class="login-form">
          <div class="login-field"><label for="reset-email">이메일</label><input id="reset-email" type="email" autocomplete="email" placeholder="이메일을 입력해주세요" required maxlength="254"></div>
          <div class="login-field" id="reset-code-field" hidden><label for="reset-code">인증번호</label><input id="reset-code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="인증번호 6자리" disabled required></div>
          <fieldset id="reset-password-fields" class="reset-fields" hidden disabled>
            <legend>새 비밀번호 설정</legend>
            <div class="login-field"><label for="reset-password">새 비밀번호</label><input id="reset-password" type="password" autocomplete="new-password" minlength="8" required placeholder="8자 이상 입력해 주세요"></div>
            <div class="login-field"><label for="reset-confirm">새 비밀번호 확인</label><input id="reset-confirm" type="password" autocomplete="new-password" required></div>
          </fieldset>
          <p class="login-description" role="status"></p>
          <p class="login-error" role="alert" hidden></p>
          <button class="login-submit reset-submit" type="submit">인증번호 받기</button>
        </form>
        <a class="pill reset-submit" href="#login" hidden>로그인으로 돌아가기</a>
      </section>
    </main>`;
  const form = container.querySelector('form');
  const email = form.elements['reset-email'];
  const code = form.elements['reset-code'];
  const fields = form.querySelector('fieldset');
  const password = form.elements['reset-password'];
  const confirm = form.elements['reset-confirm'];
  const status = form.querySelector('[role="status"]');
  const error = form.querySelector('[role="alert"]');
  const submit = form.querySelector('button');
  let step = 'email';

  form.addEventListener('input', event => {
    error.hidden = true;
    if (step === 'code' && event.target === email) {
      step = 'email';
      code.value = '';
      code.disabled = true;
      code.parentElement.hidden = true;
      status.textContent = '';
      submit.textContent = '인증번호 받기';
    }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    error.hidden = true;
    if (step === 'email') {
      step = 'code';
      code.disabled = false;
      code.parentElement.hidden = false;
      status.textContent = `체험용 인증번호는 ${demoCode}예요. 실제 이메일은 발송되지 않아요.`;
      submit.textContent = '인증번호 확인';
      code.focus();
      return;
    }
    if (step === 'code') {
      if (code.value !== demoCode) {
        error.textContent = '인증번호를 다시 확인해 주세요.';
        error.hidden = false;
        code.focus();
        return;
      }
      step = 'password';
      email.readOnly = true;
      code.disabled = true;
      code.parentElement.hidden = true;
      fields.disabled = false;
      fields.hidden = false;
      status.textContent = '체험용 이메일 인증을 마쳤어요.';
      submit.textContent = '비밀번호 재설정';
      password.focus();
      return;
    }
    if (password.value !== confirm.value) {
      error.textContent = '새 비밀번호가 서로 달라요.';
      error.hidden = false;
      confirm.focus();
      return;
    }
    form.reset();
    form.hidden = true;
    container.querySelector('h1').textContent = '재설정 체험을 마쳤어요';
    container.querySelector('.login-card > p').textContent = '실제 계정 비밀번호는 변경되지 않았어요.';
    const back = container.querySelector('.login-card > a');
    back.hidden = false;
    back.focus();
  });
}
