import { sb } from '../supabase.js';
import { logAudit } from './audit.js';
import { employees } from './employees.js';
import { entries, entryRow, deleteEntry, saveEdit } from './dashboard.js';
import { showToast, fmtDate, initials, colorIdx, esc, AV_BG, AV_FG, REASON_LABEL, BAR_COLORS } from './utils.js';

let selectedEmpId = null;
let onBack = null;
let getEmployees = null;

export function initProfile(backCb, getEmpsCb) {
  onBack = backCb;
  getEmployees = getEmpsCb;

  document.getElementById('back-btn').addEventListener('click', () => onBack?.());
  document.getElementById('print-btn').addEventListener('click', printProfile);
  document.getElementById('save-profile-btn').addEventListener('click', saveProfileInfo);
  document.getElementById('prof-flag-btn').addEventListener('click', toggleFlag);
  document.getElementById('delete-emp-btn').addEventListener('click', deleteEmployee);
  document.getElementById('save-notes-btn').addEventListener('click', saveNotes);
  document.getElementById('prof-edit-name').addEventListener('input', updateAvatarPreview);

  document.getElementById('save-edit-btn').addEventListener('click', async () => {
    const ok = await saveEdit(editingId, getEmployees);
    if (ok) closeEditModal();
  });
  document.getElementById('close-edit-btn').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeEditModal(); });

  // Delegate clicks for emp-link, edit-btn, del-btn inside log lists
  document.getElementById('log-list').addEventListener('click', handleLogClick);
  document.getElementById('prof-log-list').addEventListener('click', handleProfileLogClick);
}

let editingId = null;

function handleLogClick(e) {
  const empLink = e.target.closest('.emp-link');
  if (empLink) { showProfile(empLink.dataset.empid); return; }
  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) { openEditModal(editBtn.dataset.editid); return; }
  const delBtn = e.target.closest('.del-btn');
  if (delBtn) { deleteEntry(delBtn.dataset.delid, getEmployees); return; }
}

function handleProfileLogClick(e) {
  const editBtn = e.target.closest('.edit-btn');
  if (editBtn) { openEditModal(editBtn.dataset.editid); return; }
  const delBtn = e.target.closest('.del-btn');
  if (delBtn) { deleteEntry(delBtn.dataset.delid, getEmployees).then(() => renderProfile()); return; }
}

export function showProfile(empId) {
  selectedEmpId = empId;
  renderProfile();
}

export function renderProfile() {
  const emp = employees.find(e => e.id === selectedEmpId);
  if (!emp) { onBack?.(); return; }

  const empEnt = entries
    .filter(e => e.name.toLowerCase().trim() === emp.name.toLowerCase().trim())
    .sort((a, b) => b.timestamp - a.timestamp);

  const now = new Date();
  const thisMonth = empEnt.filter(e => {
    const d = new Date(e.date + 'T12:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const ci = colorIdx(emp.name);
  const av = document.getElementById('prof-avatar');
  av.textContent = initials(emp.name); av.style.background = AV_BG[ci]; av.style.color = AV_FG[ci];

  document.getElementById('prof-edit-name').value = emp.name;
  document.getElementById('prof-edit-dept').value = emp.dept;
  document.getElementById('prof-total').textContent  = empEnt.length;
  document.getElementById('prof-month').textContent  = thisMonth;
  document.getElementById('prof-noshow').textContent = empEnt.filter(e => e.reason === 'noshow').length;
  document.getElementById('prof-notes').value        = emp.notes || '';
  document.getElementById('print-emp-name').textContent = emp.name;
  document.getElementById('print-emp-meta').textContent = emp.dept + ' · Printed ' +
    new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const flagBtn = document.getElementById('prof-flag-btn');
  flagBtn.textContent = emp.flagged ? '⚑ Remove flag' : '⚐ Flag employee';
  flagBtn.className   = 'btn-sm' + (emp.flagged ? ' danger' : '');

  const total = empEnt.length || 1;
  document.getElementById('prof-breakdown').innerHTML =
    ['illness','family','none','noshow','early','late'].map(r => {
      const cnt = empEnt.filter(e => e.reason === r).length;
      if (!cnt) return '';
      const pct = Math.round((cnt / total) * 100);
      return `<div class="breakdown-row">
        <span class="breakdown-lbl">${REASON_LABEL[r]}</span>
        <div class="breakdown-bar-wrap"><div class="breakdown-bar" style="width:${pct}%;background:${BAR_COLORS[r]}"></div></div>
        <span class="breakdown-count">${cnt}</span>
      </div>`;
    }).join('');

  const emptyEl = document.getElementById('prof-log-empty');
  const listEl  = document.getElementById('prof-log-list');
  if (!empEnt.length) { emptyEl.style.display = 'block'; listEl.innerHTML = ''; return; }
  emptyEl.style.display = 'none';
  listEl.innerHTML = empEnt.map(e => entryRow(e, false, [])).join('');
}

function updateAvatarPreview() {
  const name = document.getElementById('prof-edit-name').value.trim() || '?';
  const ci = colorIdx(name), av = document.getElementById('prof-avatar');
  av.textContent = initials(name); av.style.background = AV_BG[ci]; av.style.color = AV_FG[ci];
}

async function saveProfileInfo() {
  const emp = employees.find(e => e.id === selectedEmpId); if (!emp) return;
  const newName = document.getElementById('prof-edit-name').value.trim();
  const newDept = document.getElementById('prof-edit-dept').value;
  if (!newName) { document.getElementById('prof-edit-name').focus(); return; }
  const btn = document.getElementById('save-profile-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = await sb.from('employees').update({ name: newName, dept: newDept }).eq('id', emp.id);
  if (error) { showToast('Error saving profile', 'error'); }
  else {
    const changes = [];
    if (newName !== emp.name) {
      changes.push(`Name: ${emp.name} → ${newName}`);
      await sb.from('calloffs').update({ name: newName }).ilike('name', emp.name);
      entries.forEach(e => { if (e.name.toLowerCase().trim() === emp.name.toLowerCase().trim()) e.name = newName; });
    }
    if (newDept !== emp.dept) changes.push(`Dept: ${emp.dept} → ${newDept}`);
    emp.name = newName; emp.dept = newDept;
    await logAudit('profile', 'employee', newName, changes.length ? changes.join(', ') : 'Profile saved');
    showToast('Profile saved ✓', 'success');
  }
  btn.disabled = false; btn.textContent = 'Save profile';
}

async function toggleFlag() {
  const emp = employees.find(e => e.id === selectedEmpId); if (!emp) return;
  const newFlag = !emp.flagged;
  const { error } = await sb.from('employees').update({ flagged: newFlag }).eq('id', emp.id);
  if (error) { showToast('Error updating flag', 'error'); return; }
  emp.flagged = newFlag;
  await logAudit('flag', 'employee', emp.name, newFlag ? 'Flagged employee' : 'Removed flag');
  const fb = document.getElementById('prof-flag-btn');
  fb.textContent = newFlag ? '⚑ Remove flag' : '⚐ Flag employee';
  fb.className   = 'btn-sm' + (newFlag ? ' danger' : '');
  showToast(newFlag ? 'Employee flagged ⚑' : 'Flag removed', 'success');
}

async function saveNotes() {
  const emp = employees.find(e => e.id === selectedEmpId); if (!emp) return;
  const notes = document.getElementById('prof-notes').value;
  const { error } = await sb.from('employees').update({ notes }).eq('id', emp.id);
  if (error) { showToast('Error saving notes', 'error'); return; }
  emp.notes = notes;
  await logAudit('note', 'employee', emp.name, 'Manager notes updated');
  showToast('Notes saved ✓', 'success');
}

async function deleteEmployee() {
  const emp = employees.find(e => e.id === selectedEmpId); if (!emp) return;
  const hasEnt = entries.some(e => e.name.toLowerCase().trim() === emp.name.toLowerCase().trim());
  if (!confirm(`Delete ${emp.name}?` + (hasEnt ? ' Call-off history will remain.' : ''))) return;
  const { error } = await sb.from('employees').delete().eq('id', emp.id);
  if (error) { showToast('Error deleting', 'error'); return; }
  await logAudit('delete', 'employee', emp.name, 'Employee removed');
  employees.splice(employees.findIndex(e => e.id === emp.id), 1);
  showToast(emp.name + ' removed', 'success');
  onBack?.();
}

function printProfile() {
  const emp = employees.find(e => e.id === selectedEmpId);
  const notes = emp?.notes || '';
  const pc = document.getElementById('print-notes-card');
  const pt = document.getElementById('print-notes-text');
  if (notes) { pt.textContent = notes; pc.style.display = 'block'; }
  else { pc.style.display = 'none'; }
  window.print();
}

function openEditModal(id) {
  const e = entries.find(x => x.id === id); if (!e) return;
  editingId = id;
  document.getElementById('e-name').value     = e.name;
  document.getElementById('e-dept').value     = e.dept;
  document.getElementById('e-reason').value   = e.reason;
  document.getElementById('e-date').value     = e.date;
  document.getElementById('e-shift').value    = e.shift;
  document.getElementById('e-loggedby').value = e.logged_by;
  document.getElementById('e-notes').value    = e.notes || '';
  document.getElementById('edit-modal').classList.add('show');
}
function closeEditModal() { document.getElementById('edit-modal').classList.remove('show'); editingId = null; }