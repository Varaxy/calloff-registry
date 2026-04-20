import { sb } from '../supabase.js';
import { logAudit } from './audit.js';
import { showToast, todayStr, fmtDate, isThisWeek, initials, colorIdx, esc, AV_BG, AV_FG, REASON_LABEL, REASON_CLASS } from './utils.js';

export let entries = [];

let activeFilter  = 'all';
let dashViewMode  = 'list';
let onEntryChange = null;

export function setEntryChangeCallback(cb) { onEntryChange = cb; }

export async function loadEntries() {
  const { data, error } = await sb.from('calloffs').select('*').order('timestamp', { ascending: false });
  if (error) { showToast('Error loading entries', 'error'); return; }
  entries = data || [];
}

export function initDashboard(getEmployees) {
  document.getElementById('f-date').value = todayStr();
  document.getElementById('log-btn').addEventListener('click', () => addEntry(getEmployees));

  // Filter pills
  document.querySelectorAll('[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      activeFilter = pill.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderDashboard(getEmployees());
    });
  });

  // View toggle
  document.getElementById('dash-vtog-list').addEventListener('click', function () {
    dashViewMode = 'list';
    document.getElementById('dash-vtog-list').classList.add('active');
    document.getElementById('dash-vtog-day').classList.remove('active');
    renderDashboard(getEmployees());
  });
  document.getElementById('dash-vtog-day').addEventListener('click', function () {
    dashViewMode = 'day';
    document.getElementById('dash-vtog-day').classList.add('active');
    document.getElementById('dash-vtog-list').classList.remove('active');
    renderDashboard(getEmployees());
  });

  // Employee autofill
  document.getElementById('f-name').addEventListener('change', function () {
    const emp = getEmployees().find(e => e.name.toLowerCase().trim() === this.value.toLowerCase().trim());
    if (emp) document.getElementById('f-dept').value = emp.dept;
  });

  // Export CSV
  document.getElementById('export-btn').addEventListener('click', exportCSV);
}

export function renderDashboard(employees) {
  const unique = {};
  entries.forEach(e => { unique[e.name.toLowerCase().trim()] = 1; });
  document.getElementById('m-total').textContent  = entries.length;
  document.getElementById('m-week').textContent   = entries.filter(e => isThisWeek(e.date)).length;
  document.getElementById('m-noshow').textContent = entries.filter(e => e.reason === 'noshow').length;
  document.getElementById('m-people').textContent = Object.keys(unique).length;

  const dl = employees.map(e => `<option value="${esc(e.name)}">`).join('');
  document.getElementById('emp-names-list').innerHTML  = dl;
  document.getElementById('emp-names-list2').innerHTML = dl;

  let list = entries;
  if (activeFilter === 'week') list = entries.filter(e => isThisWeek(e.date));
  else if (activeFilter !== 'all') list = entries.filter(e => e.reason === activeFilter);

  const emptyEl = document.getElementById('log-empty');
  const listEl  = document.getElementById('log-list');
  if (!list.length) { emptyEl.style.display = 'block'; listEl.innerHTML = ''; return; }
  emptyEl.style.display = 'none';

  if (dashViewMode === 'list') {
    listEl.innerHTML = list.map(e => entryRow(e, true, employees)).join('');
  } else {
    const groups = {}, order = [];
    list.forEach(e => {
      if (!groups[e.date]) { groups[e.date] = []; order.push(e.date); }
      groups[e.date].push(e);
    });
    const unique = [...new Set(order)].sort().reverse();
    listEl.innerHTML = unique.map(date => {
      const grp = groups[date];
      return `<div class="group-header">${fmtDate(date)}<span class="group-count">${grp.length}</span></div>`
        + grp.map(e => entryRow(e, true, employees)).join('');
    }).join('');
  }
}

async function addEntry(getEmployees) {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { document.getElementById('f-name').focus(); return; }
  const btn = document.getElementById('log-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const now = Date.now();
  const entry = {
    id: now.toString(), name,
    dept:      document.getElementById('f-dept').value,
    reason:    document.getElementById('f-reason').value,
    date:      document.getElementById('f-date').value || todayStr(),
    shift:     document.getElementById('f-shift').value,
    logged_by: document.getElementById('f-loggedby').value.trim() || 'Manager',
    logged_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    notes:     document.getElementById('f-notes').value.trim(),
    timestamp: now
  };
  const { error } = await sb.from('calloffs').insert([entry]);
  if (error) { showToast('Error saving: ' + error.message, 'error'); }
  else {
    entries.unshift(entry);
    await onEntryChange?.(name, entry.dept);
    await logAudit('add', 'entry', name, REASON_LABEL[entry.reason] + ' · ' + fmtDate(entry.date) + ' · ' + entry.shift + ' shift');
    renderDashboard(getEmployees());
    checkRepeatOffender(name);
    document.getElementById('f-name').value  = '';
    document.getElementById('f-notes').value = '';
    document.getElementById('f-date').value  = todayStr();
    showToast('Call-off logged ✓', 'success');
  }
  btn.disabled = false; btn.textContent = 'Log call-off';
}

export async function deleteEntry(id, getEmployees) {
  if (!confirm('Remove this entry?')) return;
  const entry = entries.find(e => e.id === id);
  const { error } = await sb.from('calloffs').delete().eq('id', id);
  if (error) { showToast('Error deleting', 'error'); return; }
  entries = entries.filter(e => e.id !== id);
  if (entry) await logAudit('delete', 'entry', entry.name, REASON_LABEL[entry.reason] + ' · ' + fmtDate(entry.date));
  renderDashboard(getEmployees());
  showToast('Entry removed', 'success');
}

export async function saveEdit(id, getEmployees) {
  const upd = {
    name:      document.getElementById('e-name').value.trim(),
    dept:      document.getElementById('e-dept').value,
    reason:    document.getElementById('e-reason').value,
    date:      document.getElementById('e-date').value,
    shift:     document.getElementById('e-shift').value,
    logged_by: document.getElementById('e-loggedby').value.trim(),
    notes:     document.getElementById('e-notes').value.trim()
  };
  if (!upd.name) return false;
  const { error } = await sb.from('calloffs').update(upd).eq('id', id);
  if (error) { showToast('Error saving', 'error'); return false; }
  const idx = entries.findIndex(e => e.id === id);
  if (idx !== -1) Object.assign(entries[idx], upd);
  await logAudit('edit', 'entry', upd.name, 'Entry updated · ' + fmtDate(upd.date));
  renderDashboard(getEmployees());
  showToast('Entry updated ✓', 'success');
  return true;
}

function checkRepeatOffender(name) {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const cnt = entries.filter(e => e.name.toLowerCase().trim() === name.toLowerCase().trim() && e.timestamp >= cutoff).length;
  if (cnt >= 3) {
    document.getElementById('repeat-msg').textContent = `${name} has ${cnt} call-offs in the last 30 days.`;
    const el = document.getElementById('repeat-alert');
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 8000);
  }
}

export function entryRow(e, withLink, employees) {
  const ci = colorIdx(e.name);
  let nameHtml = esc(e.name);
  if (withLink) {
    const emp = employees?.find(x => x.name.toLowerCase().trim() === e.name.toLowerCase().trim());
    if (emp) nameHtml = `<span class="emp-link" data-empid="${esc(emp.id)}">${esc(e.name)}</span>`;
  }
  return `<div class="log-row">
    <div class="avatar" style="background:${AV_BG[ci]};color:${AV_FG[ci]}">${initials(e.name)}</div>
    <div class="log-body">
      <div class="log-name">${nameHtml} <span class="badge ${REASON_CLASS[e.reason]}">${REASON_LABEL[e.reason]}</span></div>
      <div class="log-meta">
        <span>${fmtDate(e.date)}</span><span>${esc(e.shift)} shift</span>
        <span>${esc(e.dept)}</span><span>Logged by ${esc(e.logged_by)} at ${esc(e.logged_at)}</span>
      </div>
      ${e.notes ? `<div class="log-notes">&ldquo;${esc(e.notes)}&rdquo;</div>` : ''}
    </div>
    <div class="row-actions no-print">
      <button class="edit-btn" data-editid="${e.id}">Edit</button>
      <button class="del-btn" data-delid="${e.id}">Remove</button>
    </div>
  </div>`;
}

function exportCSV() {
  if (!entries.length) { showToast('No entries to export.', 'error'); return; }
  const rows = [['Name','Department','Reason','Date','Shift','Logged By','Logged At','Notes'].join(',')];
  entries.forEach(e => {
    rows.push([e.name, e.dept, REASON_LABEL[e.reason], e.date, e.shift, e.logged_by, e.logged_at, e.notes || '']
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
  a.download = 'calloffs-' + todayStr() + '.csv';
  a.click();
  showToast('CSV exported ✓', 'success');
}