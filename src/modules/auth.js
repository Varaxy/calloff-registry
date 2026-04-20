import { sb } from '../supabase.js';
import { showScreen, showToast } from './utils.js';

export async function signIn() {
  const email = document.getElementById('a-email').value.trim();
  const pass  = document.getElementById('a-pass').value;
  const errEl = document.getElementById('auth-error');
  const btn   = document.getElementById('login-btn');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = 'Please enter your email and password.'; return; }
  btn.disabled = true; btn.textContent = 'Signing in…';
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    errEl.textContent = 'Invalid email or password.';
    btn.disabled = false; btn.textContent = 'Sign In';
  }
}

export async function signOut() {
  await sb.auth.signOut();
}

export function initAuth() {
  document.getElementById('login-btn').addEventListener('click', signIn);
  document.getElementById('a-pass').addEventListener('keydown', e => { if (e.key === 'Enter') signIn(); });
  document.getElementById('a-email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('a-pass').focus(); });
  document.getElementById('signout-btn').addEventListener('click', signOut);
}