import { sb } from '../supabase.js';
import { logAudit } from './audit.js';
import { showToast, fmtDate, initials, colorIdx, esc, AV_BG, AV_FG, DEPTS } from './utils.js';

export let employees = [];

let empViewMode = 'list';
let onShowProfile = null;

export function setProfileCallback(cb) { onShowProfile = cb; }

export async function loadEmployees() {
  const { data, error } = await sb.from('employees').select('*').order('name', { ascending: true });
  if (error) { showToast('Error loading employees', 'error'); return; }
  employees = data || [];
}

export async function ensureEmployee(name, dept) {
  const norm = name.toLowerCase().trim();
  if (employees.find(e => e.name.toLowerCase().trim() === norm)) return;
  const emp = { id: Date.now() + 'e', name: name.trim(), dept, flagged: false, notes: '' };
  const { error } = await sb.from('employees').insert([emp]);
  if (!error) employees.push(emp);
}

export function initEmployees(getEntries) {
  document.getElementById('emp-search-input').addEventListener('input', () => renderEmployees(getEntries()));

  document.getElementById('emp-vtog-list').addEventListener('click', function () {
    empViewMode = 'list';
    this.classList.add('active');
    document.getElementById('emp-vtog-dept').classList.remove('active');
    renderEmployees(getEntries());
  });
  document.getElementById('emp-vtog-dept').addEventListener('click', function () {
    empViewMode = 'dept';
    this.classList.add('active');
    document.getElementById('emp-vtog-list').classList.remove('active');
    renderEmployees(getEntries());
  });

  document.getElementById('add-emp-btn').addEventListener('click', openAddEmpModal);
  document.getElementById('close-add-emp-btn').addEventListener('click', closeAddEmpModal);
  document.getElementById('add-emp-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeAddEmpModal(); });
  document.getElementById('save-emp-btn').addEventListener('click', saveNewEmployee);
  document.getElementById('ae-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveNewEmployee(); });
}

export function renderEmployees(entries) {
  // Employee metrics
  const depts = new Set(employees.map(e => e.dept));
  document.getElementById('emp-m-total').textContent   = employees.length;
  document.getElementById('emp-m-dept').textContent    = depts.size;
  document.getElementById('emp-m-flagged').textContent = employees.filter(e => e.flagged).length;
  const q = (document.getElementById('emp-search-input').value || '').toLowerCase().trim();
  let list = employees.filter(e => !q || e.name.toLowerCase().includes(q) || e.dept.toLowerCase().includes(q));
  const el = document.getElementById('emp-list');
  if (!list.length) { el.innerHTML = '<div class="log-empty">No employees found</div>'; return; }

  if (empViewMode === 'list') {
    list = list.slice().sort((a, b) => {
      if (a.flagged && !b.flagged) return -1;
      if (!a.flagged && b.flagged) return 1;
      return a.name.localeCompare(b.name);
    });
    el.innerHTML = list.map(emp => empRow(emp, entries)).join('');
  } else {
    const groups = {};
    DEPTS.forEach(d => { groups[d] = []; });
    list.forEach(emp => { const d = emp.dept || 'General'; if (!groups[d]) groups[d] = []; groups[d].push(emp); });
    let html = '';
    DEPTS.forEach(dept => {
      const grp = groups[dept]; if (!grp?.length) return;
      grp.sort((a, b) => a.name.localeCompare(b.name));
      html += `<div class="group-header">${esc(dept)}<span class="group-count">${grp.length}</span></div>` + grp.map(emp => empRow(emp, entries)).join('');
    });
    el.innerHTML = html || '<div class="log-empty">No employees found</div>';
  }

  el.querySelectorAll('.emp-row').forEach(row => {
    row.addEventListener('click', () => onShowProfile?.(row.dataset.empid));
  });
}

function empRow(emp, entries) {
  const empEnt = entries.filter(e => e.name.toLowerCase().trim() === emp.name.toLowerCase().trim());
  const ci = colorIdx(emp.name);
  const last = empEnt.length ? fmtDate(empEnt[0].date) : '—';
  return `<div class="emp-row" data-empid="${esc(emp.id)}">
    <div class="avatar" style="background:${AV_BG[ci]};color:${AV_FG[ci]}">${initials(emp.name)}</div>
    <div class="emp-info">
      <div class="emp-name-row">${esc(emp.name)}${emp.flagged ? ' <span class="badge-flag">⚑ Flagged</span>' : ''}</div>
      <div class="emp-sub">${esc(emp.dept)} · Last: ${last}</div>
    </div>
    <div class="emp-stat"><div class="emp-count">${empEnt.length}</div><div class="emp-count-lbl">call-offs</div></div>
    <span class="emp-chevron">›</span>
  </div>`;
}

function openAddEmpModal() {
  document.getElementById('ae-name').value = '';
  document.getElementById('ae-dept').value = 'Produce';
  document.getElementById('add-emp-modal').classList.add('show');
  setTimeout(() => document.getElementById('ae-name').focus(), 50);
}
function closeAddEmpModal() { document.getElementById('add-emp-modal').classList.remove('show'); }

async function saveNewEmployee() {
  const name = document.getElementById('ae-name').value.trim();
  if (!name) { document.getElementById('ae-name').focus(); return; }
  if (employees.find(e => e.name.toLowerCase().trim() === name.toLowerCase().trim())) {
    showToast('Employee already exists', 'error'); return;
  }
  const btn = document.getElementById('save-emp-btn');
  btn.disabled = true; btn.textContent = 'Adding…';
  const emp = { id: Date.now() + 'e', name, dept: document.getElementById('ae-dept').value, flagged: false, notes: '' };
  const { error } = await sb.from('employees').insert([emp]);
  if (error) { showToast('Error adding employee', 'error'); }
  else {
    employees.push(emp);
    employees.sort((a, b) => a.name.localeCompare(b.name));
    await logAudit('add', 'employee', name, 'Added to ' + emp.dept);
    closeAddEmpModal();
    renderEmployees([]);
    showToast(name + ' added ✓', 'success');
  }
  btn.disabled = false; btn.textContent = 'Add employee';
}