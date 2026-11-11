const endpoint = document.querySelector('meta[name="nubi-api-origin"]')?.content.trim();
export const apiEnabled = Boolean(endpoint);
const baseUrl = `${endpoint?.replace(/\/+$/, '') ?? ''}/api/v1`;
const storageKey = 'nubi:auth';
let session = null;
let persistent = false;
let refreshInFlight;

try {
  const saved = localStorage.getItem(storageKey);
  persistent = saved !== null;
  session = JSON.parse(saved ?? sessionStorage.getItem(storageKey) ?? 'null');
} catch {
  session = null;
}

export function setSession(tokens, remember = persistent) {
  session = tokens;
  persistent = remember;
  localStorage.removeItem(storageKey);
  sessionStorage.removeItem(storageKey);
  if (tokens) (remember ? localStorage : sessionStorage).setItem(storageKey, JSON.stringify(tokens));
}

export function getSession() {
  return session;
}

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function send(path, { method = 'GET', body, signal, token, responseType } = {}) {
  const headers = new Headers({ Accept: responseType === 'pdf' ? 'application/pdf, application/json' : 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, {
    method, headers, signal, body: isForm || body === undefined ? body : JSON.stringify(body),
  });
  if (response.ok && responseType === 'pdf' && response.headers.get('Content-Type')?.startsWith('application/pdf')) return response.blob();
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.success === false) {
    throw new ApiError(json?.error?.message || '요청을 처리하지 못했어요.', response.status, json?.error?.code);
  }
  if (response.status === 204) return null;
  if (json?.success !== true) throw new ApiError('서버 응답을 읽을 수 없어요.', response.status);
  return json.data;
}

export async function apiRequest(path, { auth = true, ...options } = {}) {
  const accessToken = auth ? session?.accessToken : null;
  try {
    return await send(path, { ...options, token: accessToken });
  } catch (error) {
    if (error.status !== 401 || !auth || !session?.refreshToken) throw error;
    if (session.accessToken === accessToken) {
      refreshInFlight ??= refreshSession().finally(() => { refreshInFlight = null; });
      await refreshInFlight;
    }
    return send(path, { ...options, token: session?.accessToken });
  }
}

async function refreshSession() {
  const previous = session;
  try {
    const tokens = await send('/auth/refresh', { method: 'POST', body: { refreshToken: previous.refreshToken } });
    if (session === previous) setSession(tokens);
  } catch (error) {
    if (session === previous && [400, 401, 403].includes(error.status)) setSession(null);
    throw error;
  }
}
