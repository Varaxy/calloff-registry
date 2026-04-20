import { sb } from '../supabase.js';
import { esc } from './utils.js';

export let auditLogs = [];

const AUDIT_ICONS   = { add:'✅', edit:'✏️', delete:'🗑️', flag:'⚑', note:'📝', auth:'🔐', profile:'👤', status:'🔄' };
const AUDIT_CLASSES = { add:'a-add', edit:'a-edit', delete:'a-delete', flag:'a-flag', note:'a-note', auth:'a-auth', profile:'a-edit', status:'a-edit' };
const AUDIT_LABELS  = { add:'Added', edit:'Edited', delete:'Deleted', flag:'Flagged', note:'Notes updated', auth:'Auth event', profile:'Profile updated', status:'Status updated' };

let currentUser = null;
export function setAuditUser(user) { currentUser = user; }

export async function loadAuditLogs() {
  const { data, error } = await sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(300);
  if (error) return;
  auditLogs = data || [];
}

export async function logAudit(action, targetType, targetName, details) {
  const entry = {
    user_email:  currentUser?.email || 'unknown',
    action, target_type: targetType,
    target_name: targetName || '',
    details:     details || ''
  };
  const { data, error } = await sb.from('audit_log').insert([entry]).select();
  if (!error && data?.[0]) auditLogs.unshift(data[0]);
}

let auditFilter = 'all';

export function initAudit() {
  document.querySelectorAll('[data-auditfilter]').forEach(pill => {
    pill.addEventListener('click', () => {
      auditFilter = pill.dataset.auditfilter;
      document.querySelectorAll('[data-auditfilter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderAuditLog();
    });
  });
}

export function renderAuditLog() {
  let list = auditLogs;
  if (auditFilter === 'entry')    list = auditLogs.filter(a => a.target_type === 'entry');
  if (auditFilter === 'employee') list = auditLogs.filter(a => a.target_type === 'employee');
  if (auditFilter === 'timeoff')  list = auditLogs.filter(a => a.target_type === 'timeoff');
  if (auditFilter === 'auth')     list = auditLogs.filter(a => a.target_type === 'session');

  const emptyEl = document.getElementById('audit-empty');
  const listEl  = document.getElementById('audit-list');
  if (!list.length) { emptyEl.style.display = 'block'; listEl.innerHTML = ''; return; }
  emptyEl.style.display = 'none';
  listEl.innerHTML = list.map(a => {
    const iconCls = AUDIT_CLASSES[a.action] || 'a-note';
    const icon    = AUDIT_ICONS[a.action]   || '•';
    const label   = AUDIT_LABELS[a.action]  || a.action;
    const when    = a.created_at
      ? new Date(a.created_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
      : '';
    return `<div class="audit-row">
      <div class="audit-icon ${iconCls}">${icon}</div>
      <div class="audit-body">
        <div class="audit-action">${label} <strong>${esc(a.target_name)}</strong></div>
        ${a.details ? `<div class="audit-details">${esc(a.details)}</div>` : ''}
        <div class="audit-meta"><span>${esc(a.user_email)}</span><span>${when}</span></div>
      </div>
    </div>`;
  }).join('');
}