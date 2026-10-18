export type WorkspaceRunLoginSelectors = {
  emailSelector?: string
  passwordSelector?: string
  submitSelector?: string
  successSelector?: string
}

export type WorkspaceRunLoginFailureReason =
  | 'no-password-field'
  | 'no-email-field'
  | 'no-submit'
  | 'not-visible'
  | 'password-not-set'
  | 'login-error'

export type WorkspaceRunLoginResult =
  | { ok: true }
  | { ok: false; reason: WorkspaceRunLoginFailureReason }

export function buildWorkspaceRunLoginExpression(
  config: WorkspaceRunLoginSelectors,
  email: string,
  password: string
): string {
  const payload = JSON.stringify({ config, email, password })
  return `(() => {
    const input = ${payload};
    const config = input.config || {};
    const email = input.email;
    const password = input.password;
    const visible = (el) => {
      if (!el || !el.isConnected) return false;
      if (el.hidden || el.getAttribute('aria-hidden') === 'true' || el.disabled) return false;
      let node = el;
      while (node && node.nodeType === 1) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        node = node.parentElement;
      }
      return true;
    };
    const firstVisible = (nodes) => {
      for (const node of nodes) {
        if (visible(node)) return node;
      }
      return null;
    };
    const query = (scope, selector) => {
      try { return Array.from(scope.querySelectorAll(selector)); }
      catch { return []; }
    };
    const pick = (scope, selector) => {
      if (!selector) return { element: null, hidden: false };
      const matches = query(scope, selector);
      if (matches.length === 0) return { element: null, hidden: false };
      const element = firstVisible(matches);
      return { element, hidden: !element };
    };
    const passwordScope = document;
    const passwordPick = config.passwordSelector
      ? pick(passwordScope, config.passwordSelector)
      : { element: firstVisible(query(passwordScope, 'input[type="password"]')), hidden: query(passwordScope, 'input[type="password"]').length > 0 && !firstVisible(query(passwordScope, 'input[type="password"]')) };
    if (!passwordPick.element) {
      return JSON.stringify({ ok: false, reason: passwordPick.hidden ? 'not-visible' : 'no-password-field' });
    }
    const passwordEl = passwordPick.element;
    const form = passwordEl.form || passwordEl.closest('form');
    const scope = form || document;
    const emailSelectors = [
      'input[type="email"]',
      'input[autocomplete="username"]',
      'input[name*="email" i]',
      'input[name*="user" i]',
      'input[id*="email" i]',
      'input[id*="user" i]'
    ];
    let emailEl = null;
    let emailHidden = false;
    if (config.emailSelector) {
      const picked = pick(scope, config.emailSelector);
      emailEl = picked.element;
      emailHidden = picked.hidden;
    } else {
      for (const selector of emailSelectors) {
        emailEl = firstVisible(query(scope, selector));
        if (emailEl) break;
      }
      if (!emailEl) {
        const texts = query(scope, 'input[type="text"]');
        const passwordIndex = Array.prototype.indexOf.call(scope.querySelectorAll('input'), passwordEl);
        emailEl = texts.find((node) => visible(node) && Array.prototype.indexOf.call(scope.querySelectorAll('input'), node) < passwordIndex) || null;
      }
    }
    if (!emailEl) {
      return JSON.stringify({ ok: false, reason: emailHidden ? 'not-visible' : 'no-email-field' });
    }
    let submitEl = null;
    let submitHidden = false;
    if (config.submitSelector) {
      const picked = pick(scope, config.submitSelector);
      submitEl = picked.element;
      submitHidden = picked.hidden;
    } else {
      submitEl = firstVisible(query(scope, 'button[type="submit"], input[type="submit"]'));
      if (!submitEl) {
        const pattern = /^(log ?in|sign ?in|continue|submit)$/i;
        const buttons = query(scope, 'button');
        submitEl = buttons.find((button) => visible(button) && pattern.test((button.textContent || '').trim())) || null;
      }
    }
    if (!submitEl) {
      return JSON.stringify({ ok: false, reason: submitHidden ? 'not-visible' : 'no-submit' });
    }
    const setValue = (el, value) => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value');
      if (setter && setter.set) setter.set.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    setValue(emailEl, email);
    setValue(passwordEl, password);
    if (form && typeof form.requestSubmit === 'function') form.requestSubmit(submitEl);
    else submitEl.click();
    return JSON.stringify({ ok: true });
  })()`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseWorkspaceRunLoginResult(value: string): WorkspaceRunLoginResult {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) {
      return { ok: false, reason: 'login-error' }
    }
    if (parsed.ok === true) {
      return { ok: true }
    }
    if (
      parsed.reason === 'no-password-field' ||
      parsed.reason === 'no-email-field' ||
      parsed.reason === 'no-submit' ||
      parsed.reason === 'not-visible'
    ) {
      return { ok: false, reason: parsed.reason }
    }
  } catch {
    // The page returned something that is not the login result.
  }
  return { ok: false, reason: 'login-error' }
}

export function workspaceRunLoginWaitSelector(config: WorkspaceRunLoginSelectors): string {
  return config.emailSelector?.trim() || 'input[type="password"]'
}
