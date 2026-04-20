    const IDLE_TIMEOUT = 30 * 60 * 1000;
const WARN_BEFORE  = 2  * 60 * 1000;

let idleTimer = null, warnTimer = null, countdownInterval = null;
let onSignOutCb = null;

export function startInactivityWatch(onSignOut) {
  onSignOutCb = onSignOut;
  ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(ev => {
    document.addEventListener(ev, resetInactivity, { passive: true });
  });
  resetInactivity();

  document.getElementById('inactivity-stay').addEventListener('click', resetInactivity);
  document.getElementById('inactivity-signout').addEventListener('click', () => onSignOutCb?.());
}

export function stopInactivityWatch() {
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);
  if (countdownInterval) clearInterval(countdownInterval);
}

export function resetInactivity() {
  document.getElementById('inactivity-warning').classList.remove('show');
  if (countdownInterval) clearInterval(countdownInterval);
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);
  updateIdleIndicator('active');
  warnTimer = setTimeout(showWarning, IDLE_TIMEOUT - WARN_BEFORE);
  idleTimer = setTimeout(() => onSignOutCb?.(), IDLE_TIMEOUT);
}

function showWarning() {
  document.getElementById('inactivity-warning').classList.add('show');
  updateIdleIndicator('warning');
  let secs = Math.floor(WARN_BEFORE / 1000);
  updateCountdown(secs);
  countdownInterval = setInterval(() => {
    secs--;
    updateCountdown(secs);
    if (secs <= 0) { clearInterval(countdownInterval); onSignOutCb?.(); }
  }, 1000);
}

function updateCountdown(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  document.getElementById('inactivity-countdown').textContent = `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function updateIdleIndicator(state) {
  const dot = document.getElementById('idle-dot');
  const lbl = document.getElementById('idle-label');
  if (!dot || !lbl) return;
  if (state === 'active') { dot.style.background = 'var(--green)'; lbl.textContent = 'Active'; }
  else { dot.style.background = 'var(--amber)'; lbl.textContent = 'Idle'; }
}