export const REASON_LABEL = {
  illness: 'Personal illness', family: 'Family emergency',
  none: 'No reason given', noshow: 'No show',
  early: 'Left early', late: 'Arrived late'
};
export const REASON_CLASS = {
  illness: 'r-illness', family: 'r-family', none: 'r-none',
  noshow: 'r-noshow', early: 'r-early', late: 'r-late'
};
export const BAR_COLORS = {
  illness: '#d97706', family: '#2563eb', none: '#6b7280',
  noshow: '#dc2626', early: '#6b21a8', late: '#0f5e6b'
};
export const TO_TYPE_LABEL = {
  vacation: 'Vacation', personal: 'Personal day', medical: 'Medical', other: 'Other'
};
export const TO_TYPE_CLASS = {
  vacation: 't-vacation', personal: 't-personal', medical: 't-medical', other: 't-other'
};
export const TO_STATUS_CLASS = {
  pending: 's-pending', approved: 's-approved', denied: 's-denied'
};
export const AV_BG = ['#dbeafe','#d1fae5','#fef3c7','#fce7f3','#ede9fe','#ffedd5'];
export const AV_FG = ['#1e40af','#065f46','#92400e','#9d174d','#4c1d95','#9a3412'];
export const DEPTS = ['Produce','Bakery','Deli','Dairy','Meat','Frozen','General'];

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(ds) {
  if (!ds) return '';
  return new Date(ds + 'T12:00:00').toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

export function isThisYear(ds) {
  if (!ds) return false;
  return new Date(ds + 'T12:00:00').getFullYear() === new Date().getFullYear();
}

export function isThisWeek(ds) {
  if (!ds) return false;
  const d = new Date(ds + 'T12:00:00'), now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

export function initials(n) {
  const parts = n.trim().split(' ');
  let r = '';
  for (let i = 0; i < parts.length && r.length < 2; i++)
    if (parts[i]) r += parts[i][0].toUpperCase();
  return r || '?';
}

export function colorIdx(n) {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % AV_BG.length;
  return h;
}

export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

export function showScreen(name) {
  const auth    = document.getElementById('auth-screen');
  const loading = document.getElementById('loading-screen');
  const app     = document.getElementById('app');

  auth.style.display    = 'none';
  loading.style.display = 'none';
  app.style.display     = 'none';

  if (name === 'auth')    auth.style.display    = 'flex';
  if (name === 'loading') loading.style.display = 'flex';
  if (name === 'app')     app.style.display     = 'flex';
}