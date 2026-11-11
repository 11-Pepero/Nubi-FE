import { apiRequest, getSession, setSession } from './api-client.js';

export async function signIn({ email, password, rememberMe }) {
  try {
    const tokens = await apiRequest('/auth/login', { method: 'POST', auth: false, body: { email, password } });
    setSession(tokens, rememberMe);
    return { success: true };
  } catch (error) {
    return { success: false, error: { message: error.message } };
  }
}

export async function signUp(body) {
  const tokens = await apiRequest('/auth/signup', { method: 'POST', auth: false, body });
  setSession(tokens, false);
}

export async function signOut() {
  try {
    if (getSession()) await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    setSession(null);
  }
}
