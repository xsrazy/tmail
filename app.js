'use strict';

/* ---------- constants ---------- */
const DOMAINS = [
  'myrobs.store',
  'myrobs.web.id',
  'sharecanva.com',
  'sharecanva.web.id',
  'xsrazy.my.id',
  'deletecon.tech',
  'kanpann.tech',
  'rawaron.tech',
  'terpo.tech',
];
const RESERVED = ['email', 'support', 'gtb', 'github', 'me', 'canva', 'admin', 'info', 'contact', 'hello', 'mail'];
const LS = { saved: 'tmail.saved', tabs: 'tmail.tabs', active: 'tmail.active', mute: 'tmail.mute' };

/* ---------- state ---------- */
let saved = loadJSON(LS.saved, []);
let tabs = loadJSON(LS.tabs, []);
let active = localStorage.getItem(LS.active) || null;
let muted = localStorage.getItem(LS.mute) === '1';
let currentMessages = [];
let selectedId = null;
let knownIds = null; // null = baseline not set yet for active address
let pollTimer = null;
let lastQrAddr = null;

/* ---------- dom ---------- */
const $ = (id) => document.getElementById(id);
const els = {
  currentAddress: $('currentAddress'), copyAddrBtn: $('copyAddrBtn'), qrBtn: $('qrBtn'),
  qrPanel: $('qrPanel'), qrBox: $('qrBox'), tabs: $('tabs'), addrForm: $('addrForm'),
  nameInput: $('nameInput'), domainSelect: $('domainSelect'), randomBtn: $('randomBtn'),
  inboxList: $('inboxList'), inboxCount: $('inboxCount'), refreshBtn: $('refreshBtn'),
  clearBtn: $('clearBtn'), updatedNote: $('updatedNote'), reservedWarn: $('reservedWarn'),
  readerEmpty: $('readerEmpty'), reader: $('reader'), rSubject: $('rSubject'),
  rFrom: $('rFrom'), rTime: $('rTime'), otpBlock: $('otpBlock'), otpCode: $('otpCode'),
  copyOtpBtn: $('copyOtpBtn'), rBody: $('rBody'), deleteMsgBtn: $('deleteMsgBtn'),
  savedList: $('savedList'), muteBtn: $('muteBtn'), toast: $('toast'),
};

/* ---------- helpers ---------- */
function loadJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : fallback; }
  catch { return fallback; }
}
function persist() {
  localStorage.setItem(LS.saved, JSON.stringify(saved));
  localStorage.setItem(LS.tabs, JSON.stringify(tabs));
  if (active) localStorage.setItem(LS.active, active); else localStorage.removeItem(LS.active);
}
function cleanName(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').replace(/^[._-]+|[._-]+$/g, '').slice(0, 30);
}
function splitAddr(addr) {
  const i = String(addr || '').lastIndexOf('@');
  return i < 0 ? { local: addr, domain: '' } : { local: addr.slice(0, i), domain: addr.slice(i + 1) };
}
function isValidAddr(addr) {
  const { local, domain } = splitAddr(addr || '');
  return /^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]$/.test(local) && DOMAINS.includes(domain);
}
function randomName() {
  const a = ['ceria', 'kilat', 'senja', 'lincah', 'santai', 'berani', 'lembut', 'tangkas', 'cerah', 'gesit', 'ramah', 'sigap'];
  const b = ['melati', 'kopi', 'ombak', 'pelangi', 'bintang', 'awan', 'sungai', 'rimba', 'surya', 'bayu', 'citra', 'wangi'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return pick(a) + '.' + pick(b) + Math.floor(10 + Math.random() * 89);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 60 * 1000) return 'baru saja';
  if (d < 60 * 60 * 1000) return Math.floor(d / 60000) + ' mnt lalu';
  if (d < 24 * 60 * 60 * 1000) return Math.floor(d / 3600000) + ' jam lalu';
  return new Date(ts).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' });
}
function fullTime(ts) {
  return new Date(ts).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta', weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) + ' WIB';
}
let toastTimer = null;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 2400);
}
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* abaikan */ }
    ta.remove();
  }
  toast(okMsg || 'Disalin');
}

/* ---------- sound (WebAudio) ---------- */
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('pointerdown', ensureAudio, { passive: true });
document.addEventListener('keydown', ensureAudio);
function beep() {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime;
  [[880, 0], [1318.5, 0.14]].forEach(([freq, off]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + off);
    gain.gain.exponentialRampToValueAtTime(0.055, t0 + off + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.22);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0 + off);
    osc.stop(t0 + off + 0.25);
  });
}

/* ---------- html sanitize ---------- */
function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  doc.querySelectorAll('script, style, iframe, object, embed, form, link, meta, base, noscript, title').forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((n) => {
    [...n.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const val = attr.value.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
      if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction' || name === 'xlink:href') n.removeAttribute(attr.name);
      else if ((name === 'href' || name === 'src' || name === 'action') && (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html'))) n.removeAttribute(attr.name);
    });
    if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener noreferrer'); }
  });
  return doc.body.innerHTML;
}

/* ---------- rendering ---------- */
function renderTabs() {
  els.tabs.innerHTML = '';
  tabs.forEach((addr) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (addr === active ? ' active' : '');
    b.title = addr;
    const label = document.createElement('span');
    label.textContent = addr;
    const x = document.createElement('span');
    x.className = 'tab-x';
    x.textContent = '×';
    x.title = 'Tutup tab';
    x.addEventListener('click', (e) => { e.stopPropagation(); closeTab(addr); });
    b.appendChild(label); b.appendChild(x);
    b.addEventListener('click', () => switchTo(addr));
    els.tabs.appendChild(b);
  });
}
function renderSaved() {
  if (!saved.length) {
    els.savedList.innerHTML = '<div class="empty">Belum ada alamat tersimpan.</div>';
    return;
  }
  els.savedList.innerHTML = '';
  saved.forEach((addr) => {
    const row = document.createElement('div');
    row.className = 'saved-row';
    const a = document.createElement('span');
    a.className = 'saved-addr'; a.textContent = addr;
    const open = document.createElement('button');
    open.className = 'btn btn-teal btn-sm'; open.type = 'button'; open.textContent = 'Buka';
    open.addEventListener('click', () => openAddress(addr));
    const cp = document.createElement('button');
    cp.className = 'btn btn-soft btn-sm'; cp.type = 'button'; cp.textContent = 'Salin';
    cp.addEventListener('click', () => copyText(addr, 'Alamat disalin'));
    const del = document.createElement('button');
    del.className = 'btn btn-danger-soft btn-sm'; del.type = 'button'; del.textContent = 'Hapus';
    del.addEventListener('click', () => removeSaved(addr));
    row.append(a, open, cp, del);
    els.savedList.appendChild(row);
  });
}
function renderHeader() {
  els.currentAddress.textContent = active || 'belum ada alamat';
  const { local } = splitAddr(active || '');
  els.reservedWarn.classList.toggle('hidden', !(active && RESERVED.includes(local)));
  if (!els.qrPanel.classList.contains('hidden') && lastQrAddr !== active) renderQr();
}
function renderQr() {
  if (!active || typeof qrcode === 'undefined') return;
  lastQrAddr = active;
  try {
    const qr = qrcode(0, 'M');
    qr.addData(active);
    qr.make();
    els.qrBox.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 12, scalable: true });
  } catch {
    els.qrBox.textContent = 'QR tidak tersedia';
  }
}
function renderInbox() {
  els.inboxCount.textContent = String(currentMessages.length);
  els.inboxCount.classList.toggle('hidden', currentMessages.length === 0);
  if (!active) { els.inboxList.innerHTML = '<div class="empty">Bikin alamat dulu di atas.</div>'; return; }
  if (!currentMessages.length) {
    els.inboxList.innerHTML = '<div class="empty">Inbox kosong. Kasih alamat ini ke situs yang mau kamu daftari, emailnya bakal muncul di sini.</div>';
    return;
  }
  els.inboxList.innerHTML = '';
  currentMessages.forEach((m) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'msg-row' + (m.id === selectedId ? ' selected' : '');
    const when = relTime(m.received_at);
    row.innerHTML =
      '<div class="msg-top"><span class="msg-from">' + esc(m.sender || '(tanpa pengirim)') + '</span>' +
      '<span class="msg-time" title="' + esc(fullTime(m.received_at)) + '">' + esc(when) + '</span></div>' +
      '<div class="msg-subject">' + esc(m.subject || '(tanpa subjek)') + '</div>' +
      (m.snippet ? '<div class="msg-snippet">' + esc(m.snippet) + '</div>' : '') +
      '<div class="msg-tools"></div>';
    const tools = row.querySelector('.msg-tools');
    if (m.otp) {
      const chip = document.createElement('span');
      chip.className = 'otp-chip';
      chip.textContent = 'OTP ' + m.otp;
      chip.title = 'Klik buat menyalin kode OTP';
      chip.addEventListener('click', (e) => { e.stopPropagation(); copyText(String(m.otp), 'Kode OTP disalin'); });
      tools.appendChild(chip);
    }
    const del = document.createElement('span');
    del.className = 'row-del';
    del.textContent = 'hapus';
    del.title = 'Hapus email ini';
    del.addEventListener('click', (e) => { e.stopPropagation(); deleteMessage(m.id); });
    tools.appendChild(del);
    row.addEventListener('click', () => openMessage(m.id));
    els.inboxList.appendChild(row);
  });
}
function showReaderEmpty() {
  selectedId = null;
  els.reader.classList.add('hidden');
  els.readerEmpty.classList.remove('hidden');
}

/* ---------- data ---------- */
async function loadInbox(manual) {
  if (!active) return;
  const addr = active;
  if (manual) els.refreshBtn.textContent = 'Memuat...';
  try {
    const res = await fetch('/api/inbox?addr=' + encodeURIComponent(addr), { cache: 'no-store' });
    const data = await res.json();
    if (addr !== active) return; // tab switched mid-flight: stale response, ignore
    if (!data.ok) throw new Error('bad');
    const msgs = data.messages || [];
    const ids = new Set(msgs.map((m) => m.id));
    if (knownIds !== null) {
      const hasNew = msgs.some((m) => !knownIds.has(m.id));
      if (hasNew) { beep(); toast('Ada email baru masuk'); }
    }
    knownIds = ids;
    const changed = JSON.stringify(msgs.map((m) => m.id)) !== JSON.stringify(currentMessages.map((m) => m.id));
    currentMessages = msgs;
    if (changed) {
      if (selectedId && !ids.has(selectedId)) showReaderEmpty();
      renderInbox();
    }
    els.updatedNote.textContent = 'Diperbarui ' + new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    if (manual) toast('Gagal memuat inbox, coba lagi');
  } finally {
    if (manual) els.refreshBtn.textContent = 'Refresh';
  }
}
async function openMessage(id) {
  selectedId = id;
  const addr = active;
  renderInbox();
  try {
    const res = await fetch('/api/message?id=' + id + '&addr=' + encodeURIComponent(addr), { cache: 'no-store' });
    const data = await res.json();
    if (addr !== active || selectedId !== id) return; // switched away mid-flight
    if (!data.ok) { toast('Email tidak ditemukan'); showReaderEmpty(); return; }
    const m = data.message;
    els.rSubject.textContent = m.subject || '(tanpa subjek)';
    els.rFrom.textContent = m.sender || '(tanpa pengirim)';
    els.rTime.textContent = fullTime(m.received_at);
    if (m.otp) {
      els.otpCode.textContent = String(m.otp);
      els.otpBlock.classList.remove('hidden');
      els.copyOtpBtn.onclick = () => copyText(String(m.otp), 'Kode OTP disalin');
    } else {
      els.otpBlock.classList.add('hidden');
    }
    if (m.body_html && m.body_html.trim()) els.rBody.innerHTML = sanitizeHtml(m.body_html);
    else els.rBody.innerHTML = '<div style="white-space:pre-wrap">' + esc(m.body_text || '(email kosong)') + '</div>';
    els.deleteMsgBtn.onclick = () => deleteMessage(m.id);
    els.readerEmpty.classList.add('hidden');
    els.reader.classList.remove('hidden');
    if (window.innerWidth < 960) els.reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    toast('Gagal membuka email');
  }
}
async function deleteMessage(id) {
  if (!confirm('Hapus email ini?')) return;
  try {
    await fetch('/api/message?id=' + id + '&addr=' + encodeURIComponent(active), { method: 'DELETE' });
    if (selectedId === id) showReaderEmpty();
    knownIds = null;
    await loadInbox(false);
    toast('Email dihapus');
  } catch { toast('Gagal menghapus email'); }
}

/* ---------- address actions ---------- */
function openAddress(addr) {
  if (!isValidAddr(addr)) { toast('Alamat tidak valid'); return; }
  if (!tabs.includes(addr)) tabs.push(addr);
  if (!saved.includes(addr)) saved.push(addr);
  persist();
  switchTo(addr);
}
function switchTo(addr) {
  active = addr;
  knownIds = null;
  currentMessages = [];
  selectedId = null;
  persist();
  renderTabs(); renderSaved(); renderHeader(); renderInbox(); showReaderEmpty();
  loadInbox(false);
}
function closeTab(addr) {
  tabs = tabs.filter((a) => a !== addr);
  if (active === addr) {
    active = tabs.length ? tabs[tabs.length - 1] : null;
    knownIds = null; currentMessages = []; selectedId = null;
    persist();
    renderTabs(); renderSaved(); renderHeader(); renderInbox(); showReaderEmpty();
    if (active) loadInbox(false);
  } else { persist(); renderTabs(); }
}
function removeSaved(addr) {
  saved = saved.filter((a) => a !== addr);
  persist(); renderSaved();
  if (tabs.includes(addr)) closeTab(addr);
  toast('Alamat dihapus dari Email Saya');
}

/* ---------- events ---------- */
els.addrForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = cleanName(els.nameInput.value);
  if (!name) { toast('Isi nama dulu, atau klik Nama acak'); els.nameInput.focus(); return; }
  openAddress(name + '@' + els.domainSelect.value);
  els.nameInput.value = '';
});
els.randomBtn.addEventListener('click', () => {
  const name = randomName();
  els.nameInput.value = name;
  openAddress(name + '@' + els.domainSelect.value);
});
els.copyAddrBtn.addEventListener('click', () => { if (active) copyText(active, 'Alamat disalin'); });
els.qrBtn.addEventListener('click', () => {
  const willShow = els.qrPanel.classList.contains('hidden');
  els.qrPanel.classList.toggle('hidden', !willShow);
  if (willShow) { renderQr(); els.qrBtn.textContent = 'Tutup QR'; }
  else els.qrBtn.textContent = 'Kode QR';
});
els.refreshBtn.addEventListener('click', () => loadInbox(true));
els.clearBtn.addEventListener('click', async () => {
  if (!active || !currentMessages.length) { toast('Inbox sudah kosong'); return; }
  if (!confirm('Hapus semua email di inbox ' + active + '?')) return;
  try {
    await fetch('/api/inbox?addr=' + encodeURIComponent(active), { method: 'DELETE' });
    knownIds = null; showReaderEmpty();
    await loadInbox(false);
    toast('Inbox dibersihkan');
  } catch { toast('Gagal membersihkan inbox'); }
});
els.muteBtn.addEventListener('click', () => {
  muted = !muted;
  localStorage.setItem(LS.mute, muted ? '1' : '0');
  updateMuteBtn();
  if (!muted) { ensureAudio(); beep(); }
  toast(muted ? 'Suara notifikasi mati' : 'Suara notifikasi nyala');
});
function updateMuteBtn() {
  els.muteBtn.textContent = muted ? '🔇' : '🔊';
  els.muteBtn.title = muted ? 'Suara notifikasi: mati' : 'Suara notifikasi: nyala';
}

/* ---------- init ---------- */
DOMAINS.forEach((d) => {
  const o = document.createElement('option');
  o.value = d; o.textContent = '@' + d;
  els.domainSelect.appendChild(o);
});
tabs = tabs.filter(isValidAddr);
saved = saved.filter(isValidAddr);
if (!active || !tabs.includes(active)) active = tabs.length ? tabs[tabs.length - 1] : null;
updateMuteBtn();
if (!active) {
  openAddress(randomName() + '@' + DOMAINS[0]);
} else {
  persist();
  renderTabs(); renderSaved(); renderHeader(); renderInbox(); showReaderEmpty();
  loadInbox(false);
}
pollTimer = setInterval(() => { if (!document.hidden) loadInbox(false); }, 10000);
