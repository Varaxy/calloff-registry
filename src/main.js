import './style.css';
import { sb } from './supabase.js';
import { showScreen, showToast } from './modules/utils.js';
import { initAuth, signOut } from './modules/auth.js';
import { loadEntries, initDashboard, renderDashboard, setEntryChangeCallback, entries } from './modules/dashboard.js';
import { loadEmployees, initEmployees, renderEmployees, ensureEmployee, employees } from './modules/employees.js';
import { loadAuditLogs, initAudit, renderAuditLog, logAudit, setAuditUser } from './modules/audit.js';
import { loadTimeOff, initTimeOff, renderTimeOff } from './modules/timeoff.js';
import { initProfile, showProfile, renderProfile } from './modules/profile.js';
import { startInactivityWatch, stopInactivityWatch } from './modules/inactivity.js';

let currentView = 'dashboard';
let prevView    = 'dashboard';

let appStarted = false;

// ── VIEWS ─────────────────────────────────
function showView(view, empId) {
  if (view !== 'profile') prevView = view;
  currentView = view;

  ['dashboard','employees','profile','timeoff','audit'].forEach(v => {
    document.getElementById('view-' + v).style.display = v === view ? '' : 'none';
  });

  const activeTop = view === 'profile' ? 'employees' : view;
  ['dashboard','employees','timeoff','audit'].forEach(t => {
    document.getElementById('tab-'  + t)?.classList.toggle('active', t === activeTop);
    document.getElementById('bnav-' + t)?.classList.toggle('active', t === activeTop);
  });

  if (view === 'dashboard') renderDashboard(employees);
  if (view === 'employees') renderEmployees(entries);
  if (view === 'profile')   { showProfile(empId); }
  if (view === 'timeoff')   renderTimeOff();
  if (view === 'audit')     renderAuditLog();

  window.scrollTo(0, 0);
}

// ── INIT ─────────────────────────────────
(async function init() {
  showScreen('loading');

  initAuth();

  // Nav tabs (desktop)
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // Profile callback wired to employees module
  initEmployees(() => entries);
  initProfile(() => showView(prevView), () => employees);
  initAudit();
  initDashboard(() => employees);
  initTimeOff(() => employees);

  // Wire employee profile navigation from employees list
  import('./modules/employees.js').then(({ setProfileCallback }) => {
    setProfileCallback(empId => showView('profile', empId));
  });

  // Wire entry change (auto-create employee on new call-off)
  setEntryChangeCallback(async (name, dept) => {
    await ensureEmployee(name, dept);
    renderEmployees(employees);
  });

  // Handle tab visibility change — recover from loading state if session still exists
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const currentScreen = document.getElementById('loading-screen').style.display;
      if (currentScreen === 'flex' || currentScreen === '') {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          showScreen('app');
          showView(currentView);
        } else {
          showScreen('auth');
        }
      }
    }
  });

  // Check existing session
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await startApp(session.user);
  } else {
    showScreen('auth');
    document.getElementById('a-email').focus();
  }

  // Auth state listener
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && !appStarted) {
      await startApp(session.user);
    } else if (event === 'SIGNED_OUT') {
      appStarted = false;
      stopInactivityWatch();
      showScreen('auth');
    }
  });
})();

// ── START APP ────────────────────────────
async function startApp(user) {
  if (appStarted) return;
  appStarted = true;
  showScreen('loading');
  setAuditUser(user);
  document.getElementById('user-email').textContent = user.email;

  await Promise.all([loadEntries(), loadEmployees(), loadAuditLogs(), loadTimeOff()]);
  await logAudit('auth', 'session', user.email, 'Signed in');

  startInactivityWatch(() => signOut());

  showScreen('app');
  showView('dashboard');
}