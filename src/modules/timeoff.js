import { sb } from '../supabase.js';
import { logAudit } from './audit.js';
import { showToast, todayStr, fmtDate, initials, colorIdx, esc, AV_BG, AV_FG, TO_TYPE_LABEL, TO_TYPE_CLASS, TO_STATUS_CLASS } from './utils.js';

export let timeoffRequests = [];
let selectedFile = null;
let toFilter = 'all';
const thumbCache = {};

export async function loadTimeOff() {
  const { data, error } = await sb.from('timeoff_requests').select('*').order('timestamp', { ascending: false });
  if (error) { showToast('Error loading time-off requests', 'error'); return; }
  timeoffRequests = data || [];
}

export function initTimeOff(getEmployees) {
  document.getElementById('to-from').value = todayStr();
  document.getElementById('to-to').value   = todayStr();
  document.getElementById('to-btn').addEventListener('click', () => addTimeOff(getEmployees));

  document.getElementById('to-image-camera').addEventListener('change', e => handleFileSelect(e));
  document.getElementById('to-image-library').addEventListener('change', e => handleFileSelect(e));
  document.getElementById('clear-upload-btn').addEventListener('click', clearUpload);

  document.getElementById('to-name').addEventListener('change', function () {
    const emp = getEmployees().find(e => e.name.toLowerCase().trim() === this.value.toLowerCase().trim());
    if (emp) document.getElementById('to-dept').value = emp.dept;
  });

  document.querySelectorAll('[data-tofilter]').forEach(pill => {
    pill.addEventListener('click', () => {
      toFilter = pill.dataset.tofilter;
      document.querySelectorAll('[data-tofilter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderTimeOff();
    });
  });

  document.getElementById('to-list').addEventListener('click', handleToListClick);
  document.getElementById('img-viewer-close').addEventListener('click', closeImgViewer);
  document.getElementById('img-viewer').addEventListener('click', e => { if (e.target === e.currentTarget) closeImgViewer(); });
}

function handleFileSelect(e) {
  const file = e.target.files[0]; if (!file) return;
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('upload-preview-img').src = ev.target.result;
    document.getElementById('upload-preview-name').textContent = file.name;
    document.getElementById('upload-preview').style.display = 'flex';
    document.getElementById('upload-area').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function clearUpload() {
  selectedFile = null;
  document.getElementById('to-image-camera').value  = '';
  document.getElementById('to-image-library').value = '';
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-area').style.display    = 'block';
}

async function addTimeOff(getEmployees) {
  const name = document.getElementById('to-name').value.trim();
  if (!name) { document.getElementById('to-name').focus(); return; }
  const btn = document.getElementById('to-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const now = Date.now();
  let imagePath = '';
  if (selectedFile) {
    const ext  = selectedFile.name.split('.').pop();
    const path = `requests/${now}.${ext}`;
    const { error: upErr } = await sb.storage.from('timeoff-requests').upload(path, selectedFile);
    if (upErr) { showToast('Image upload failed: ' + upErr.message, 'error'); btn.disabled = false; btn.textContent = 'Log request'; return; }
    imagePath = path;
  }
  const req = {
    id: now.toString(), name,
    dept:      document.getElementById('to-dept').value,
    type:      document.getElementById('to-type').value,
    date_from: document.getElementById('to-from').value,
    date_to:   document.getElementById('to-to').value,
    status:    'pending',
    notes:     document.getElementById('to-notes').value.trim(),
    logged_by: document.getElementById('to-loggedby').value.trim() || 'Manager',
    image_path: imagePath,
    timestamp: now
  };
  const { error } = await sb.from('timeoff_requests').insert([req]);
  if (error) { showToast('Error saving request', 'error'); }
  else {
    timeoffRequests.unshift(req);
    await logAudit('add', 'timeoff', name, TO_TYPE_LABEL[req.type] + ' · ' + fmtDate(req.date_from) + (req.date_from !== req.date_to ? ' – ' + fmtDate(req.date_to) : ''));
    renderTimeOff();
    document.getElementById('to-name').value  = '';
    document.getElementById('to-notes').value = '';
    document.getElementById('to-from').value  = todayStr();
    document.getElementById('to-to').value    = todayStr();
    clearUpload();
    showToast('Request logged ✓', 'success');
  }
  btn.disabled = false; btn.textContent = 'Log request';
}

function handleToListClick(e) {
  const approveBtn = e.target.closest('[data-approve]');
  if (approveBtn) { updateToStatus(approveBtn.dataset.approve, 'approved'); return; }
  const denyBtn = e.target.closest('[data-deny]');
  if (denyBtn) { updateToStatus(denyBtn.dataset.deny, 'denied'); return; }
  const pendingBtn = e.target.closest('[data-pending]');
  if (pendingBtn) { updateToStatus(pendingBtn.dataset.pending, 'pending'); return; }
  const delBtn = e.target.closest('[data-todel]');
  if (delBtn) { deleteTimeOff(delBtn.dataset.todel); return; }
  const imgEl = e.target.closest('[data-imgpath]');
  if (imgEl) { viewImage(imgEl.dataset.imgpath); return; }
}

async function updateToStatus(id, newStatus) {
  const req = timeoffRequests.find(r => r.id === id); if (!req) return;
  const { error } = await sb.from('timeoff_requests').update({ status: newStatus }).eq('id', id);
  if (error) { showToast('Error updating status', 'error'); return; }
  req.status = newStatus;
  await logAudit('status', 'timeoff', req.name, 'Request ' + newStatus);
  renderTimeOff();
  showToast('Marked as ' + newStatus, 'success');
}

async function deleteTimeOff(id) {
  if (!confirm('Remove this request?')) return;
  const req = timeoffRequests.find(r => r.id === id);
  if (req?.image_path) await sb.storage.from('timeoff-requests').remove([req.image_path]);
  const { error } = await sb.from('timeoff_requests').delete().eq('id', id);
  if (error) { showToast('Error deleting', 'error'); return; }
  timeoffRequests = timeoffRequests.filter(r => r.id !== id);
  if (req) await logAudit('delete', 'timeoff', req.name, 'Request removed');
  renderTimeOff();
  showToast('Request removed', 'success');
}

async function viewImage(path) {
  const { data, error } = await sb.storage.from('timeoff-requests').createSignedUrl(path, 60);
  if (error || !data) { showToast('Could not load image', 'error'); return; }
  document.getElementById('img-viewer-img').src = data.signedUrl;
  document.getElementById('img-viewer').classList.add('show');
}
function closeImgViewer() {
  document.getElementById('img-viewer').classList.remove('show');
  document.getElementById('img-viewer-img').src = '';
}

export function renderTimeOff() {
  let list = timeoffRequests;
  if (toFilter !== 'all') list = timeoffRequests.filter(r => r.status === toFilter);
  const emptyEl = document.getElementById('to-empty');
  const listEl  = document.getElementById('to-list');
  if (!list.length) { emptyEl.style.display = 'block'; listEl.innerHTML = ''; return; }
  emptyEl.style.display = 'none';
  listEl.innerHTML = list.map(r => {
    const ci = colorIdx(r.name);
    const dateRange = r.date_from === r.date_to ? fmtDate(r.date_from) : fmtDate(r.date_from) + ' – ' + fmtDate(r.date_to);
    const imgHtml = r.image_path
      ? `<img class="img-thumb" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" data-imgpath="${esc(r.image_path)}" title="View image" data-cached="${esc(r.image_path)}">`
      : `<div class="img-placeholder"><svg width="20" height="20" stroke="currentColor" fill="none" stroke-width="1.5"><use href="#ic-file"/></svg></div>`;
    return `<div class="timeoff-row">
      <div class="avatar" style="background:${AV_BG[ci]};color:${AV_FG[ci]}">${initials(r.name)}</div>
      <div class="timeoff-body">
        <div class="timeoff-name">${esc(r.name)}
          <span class="badge ${TO_TYPE_CLASS[r.type]}">${TO_TYPE_LABEL[r.type]}</span>
          <span class="badge ${TO_STATUS_CLASS[r.status]}">${r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span>
        </div>
        <div class="timeoff-meta"><span>${dateRange}</span><span>${esc(r.dept)}</span><span>Logged by ${esc(r.logged_by)}</span></div>
        ${r.notes ? `<div class="timeoff-notes">&ldquo;${esc(r.notes)}&rdquo;</div>` : ''}
      </div>
      ${imgHtml}
      <div class="timeoff-actions">
        ${r.status !== 'approved' ? `<button class="status-btn" style="color:var(--green)" data-approve="${r.id}"><svg width="11" height="11" style="margin-right:3px;vertical-align:-1px"><use href="#ic-check"/></svg>Approve</button>` : ''}
        ${r.status !== 'denied'   ? `<button class="status-btn" style="color:var(--red)"   data-deny="${r.id}"><svg width="11" height="11" style="margin-right:3px;vertical-align:-1px"><use href="#ic-x"/></svg>Deny</button>` : ''}
        ${r.status !== 'pending'  ? `<button class="status-btn" data-pending="${r.id}"><svg width="11" height="11" style="margin-right:3px;vertical-align:-1px"><use href="#ic-refresh"/></svg>Pending</button>` : ''}
        <button class="del-btn" data-todel="${r.id}"><svg width="11" height="11" style="margin-right:3px;vertical-align:-1px"><use href="#ic-trash"/></svg>Remove</button>
      </div>
    </div>`;
  }).join('');

  // Load thumbnails
  listEl.querySelectorAll('img[data-cached]').forEach(img => loadThumb(img, img.dataset.cached));
}

async function loadThumb(img, path) {
  if (thumbCache[path]) { img.src = thumbCache[path]; return; }
  const { data, error } = await sb.storage.from('timeoff-requests').createSignedUrl(path, 300);
  if (!error && data) { thumbCache[path] = data.signedUrl; img.src = data.signedUrl; }
}