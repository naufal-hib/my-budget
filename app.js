// ============================================================
// DOMPET KU v3.0 — MAIN APP
// ============================================================

// ── State ──────────────────────────────────────────────────
let currentPage = 'dash';
let currentFilter = { tipe: 'all', kategori: 'all', akun: 'all', bulan: '' };
let trxEditId = null;

// ── Init ──────────────────────────────────────────────────
async function initApp() {
  const localOk = DB.loadLocal();

  if (DB.isFirstRun() || !localOk) {
    showOnboarding();
    return;
  }

  hideOnboarding();
  updatePeriod();

  if (DB.isSetup()) {
    Utils.showLoading('Sinkronisasi data...');
    const r = await DB.pull();
    Utils.hideLoading();
    if (!r.ok) Utils.showToast('Mode offline — data dari cache', 'warning');
  }

  DB.syncAllocations();
  renderAll();
  WA.checkReminders();
}

function renderAll() {
  renderDashboard();
  if (currentPage === 'trx') renderTransactions();
  if (currentPage === 'alloc') renderAllocations();
  if (currentPage === 'debts') renderDebts();
  if (currentPage === 'wa') renderWAPage();
  if (currentPage === 'settings') renderSettings();
}

function updatePeriod() {
  const meta = DB.getMeta();
  if (!meta.activePeriod) {
    DB.saveMeta('activePeriod', Utils.currentPeriod());
  }
  currentFilter.bulan = meta.activePeriod || Utils.currentPeriod();
}

// ── Navigation ───────────────────────────────────────────
function goTo(page) {
  currentPage = page;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const screenEl = document.getElementById('screen-' + page);
  if (screenEl) screenEl.classList.add('active');

  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');

  const fab = document.getElementById('main-fab');
  const showFab = ['dash','trx','alloc','debts'].includes(page);
  if (fab) fab.style.display = showFab ? 'flex' : 'none';

  if (page === 'dash') renderDashboard();
  if (page === 'trx') renderTransactions();
  if (page === 'alloc') renderAllocations();
  if (page === 'debts') renderDebts();
  if (page === 'accounts') renderAccounts();
  if (page === 'categories') renderCategories();
  if (page === 'wa') renderWAPage();
  if (page === 'settings') renderSettings();
  if (page === 'reports') renderReports();
}

function fabAction() {
  const page = currentPage;
  if (['dash','trx'].includes(page)) showTrxModal();
  else if (page === 'alloc') showAllocModal();
  else if (page === 'debts') showDebtModal();
  else showTrxModal();
}

// ── DASHBOARD ────────────────────────────────────────────
function renderDashboard() {
  const period = DB.getMeta().activePeriod || Utils.currentPeriod();
  const trx = DB.getTransactions().filter(t => t.tanggal?.startsWith(period));
  const accounts = DB.getAccounts().filter(a => a.status === 'Aktif');

  const totalAset = accounts.reduce((s, a) => s + (a.saldoSekarang || 0), 0);
  const pemasukan = trx.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
  const pengeluaran = trx.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);
  const totalUtang = DB.getDebts().filter(d => d.status === 'Aktif' && d.tipe === 'Utang').reduce((s, d) => s + d.sisa, 0);

  const R = Utils.formatRupiah;
  const Rs = (n) => Utils.formatRupiah(n, true);

  // Hero
  document.getElementById('dash-total-aset').textContent = R(totalAset);
  document.getElementById('dash-pemasukan').textContent = '+' + Rs(pemasukan);
  document.getElementById('dash-pengeluaran').textContent = '-' + Rs(pengeluaran);
  document.getElementById('dash-utang').textContent = Rs(totalUtang);
  document.getElementById('dash-period').textContent = Utils.formatMonthYear(period);

  // Accounts scroll
  const accEl = document.getElementById('dash-accounts');
  if (accounts.length === 0) {
    accEl.innerHTML = `<div class="card-ghost" style="min-width:150px;text-align:center;padding:20px 14px" onclick="goTo('accounts')"><div style="font-size:24px">🏦</div><div class="text-xs text-muted mt4">Tambah Akun</div></div>`;
  } else {
    accEl.innerHTML = accounts.map(a => {
      const typeEmoji = a.tipe === 'Bank' ? '🏦' : a.tipe === 'Cash' ? '💵' : a.tipe === 'E-wallet' ? '📱' : '💎';
      const borderColor = a.warna || '#333';
      return `<div class="acct-scroll-item" style="background:${hexToRgba(borderColor,.08)};border:1px solid ${hexToRgba(borderColor,.2)}" onclick="goTo('accounts')">
        <div class="text-xs" style="color:${borderColor};margin-bottom:5px">${typeEmoji} ${Utils.sanitize(a.nama)}</div>
        <div style="font-size:15px;font-weight:600">${Rs(a.saldoSekarang)}</div>
        <div class="text-xs text-muted mt4">${a.tipe}</div>
      </div>`;
    }).join('') + `<div class="acct-scroll-item card-ghost" style="min-width:100px;display:flex;flex-direction:column;align-items:center;justify-content:center" onclick="showAddAccountModal()">
      <div style="font-size:22px;color:var(--text3)">+</div>
      <div class="text-xs text-muted">Tambah</div>
    </div>`;
  }

  // Jatah mini
  const allocs = DB.getAllocations().filter(a => a.bulan?.startsWith(period) || !a.bulan).slice(0, 4);
  const allocEl = document.getElementById('dash-alloc-mini');
  if (allocs.length === 0) {
    allocEl.innerHTML = `<div class="text-xs text-muted" style="text-align:center;padding:12px">Belum ada jatah — <span class="text-accent" style="cursor:pointer" onclick="goTo('alloc')">Atur sekarang →</span></div>`;
  } else {
    allocEl.innerHTML = allocs.map(a => {
      const pct = Math.min(a.progress || 0, 100);
      const color = Utils.progressColor(pct, DB.getConfig().display?.warningThreshold || 80);
      return `<div style="margin-bottom:10px">
        <div class="row-between mb4">
          <span class="text-sm">${Utils.sanitize(a.nama)}</span>
          <span class="text-xs" style="color:${color}">${Rs(a.terpakai || 0)} / ${Rs(a.alokasi || 0)}</span>
        </div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
    }).join('');
  }

  // Recent transactions
  const recent = DB.getTransactions().slice(-10).reverse().slice(0, 5);
  const recentEl = document.getElementById('dash-recent-trx');
  if (recent.length === 0) {
    recentEl.innerHTML = `<div class="empty-state"><div class="icon">📝</div><p>Belum ada transaksi</p></div>`;
  } else {
    recentEl.innerHTML = recent.map(t => buildTrxItem(t)).join('');
  }

  // Active debts
  const activeDebts = DB.getDebts().filter(d => d.status === 'Aktif' && d.tipe === 'Utang').slice(0, 2);
  const debtEl = document.getElementById('dash-debts');
  if (activeDebts.length === 0) {
    debtEl.style.display = 'none';
  } else {
    debtEl.style.display = '';
    document.getElementById('dash-debts-list').innerHTML = activeDebts.map(d => {
      const days = Utils.daysUntil(d.tanggalJatuhTempo);
      const chipClass = days <= 7 ? 'chip-red' : days <= 30 ? 'chip-yellow' : 'chip-blue';
      const daysLabel = days < 0 ? 'Terlambat!' : days === 0 ? 'Hari ini!' : `${days} hari`;
      const pct = d.totalNominal > 0 ? Math.round((d.terbayar / d.totalNominal) * 100) : 0;
      return `<div style="margin-bottom:10px">
        <div class="row-between mb4">
          <div>
            <div class="text-sm fw500">${Utils.sanitize(d.namaPihak)}</div>
            <div class="text-xs text-muted">Jatuh tempo ${Utils.formatDate(d.tanggalJatuhTempo, {short:true})}</div>
          </div>
          <div style="text-align:right">
            <div class="text-sm text-red fw500">${Utils.formatRupiah(d.sisa)}</div>
            <span class="chip ${chipClass}">${daysLabel}</span>
          </div>
        </div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;background:var(--blue)"></div></div>
      </div>`;
    }).join('');
  }
}

// ── TRANSACTIONS ─────────────────────────────────────────
function renderTransactions() {
  const period = currentFilter.bulan || DB.getMeta().activePeriod;
  let trx = DB.getTransactions().filter(t => t.tanggal?.startsWith(period));

  if (currentFilter.tipe !== 'all') trx = trx.filter(t => t.tipe === currentFilter.tipe);
  if (currentFilter.kategori !== 'all') trx = trx.filter(t => t.kategori === currentFilter.kategori);
  if (currentFilter.akun !== 'all') trx = trx.filter(t => t.akun === currentFilter.akun || t.akunTujuan === currentFilter.akun);

  trx = trx.slice().reverse();

  const pemasukan = trx.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
  const pengeluaran = trx.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);

  document.getElementById('trx-pemasukan').textContent = Utils.formatRupiah(pemasukan, true);
  document.getElementById('trx-pengeluaran').textContent = Utils.formatRupiah(pengeluaran, true);
  document.getElementById('trx-count').textContent = trx.length + ' transaksi';
  document.getElementById('trx-period-label').textContent = Utils.formatMonthYear(period);

  const listEl = document.getElementById('trx-list');
  if (trx.length === 0) {
    listEl.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Tidak ada transaksi</p></div>`;
  } else {
    listEl.innerHTML = trx.map(t => buildTrxItem(t, true)).join('');
  }

  renderTrxFilters();
}

function buildTrxItem(t, withEdit = false) {
  const icon = Utils.catIcon(t.kategori);
  const color = Utils.catColor(t.kategori);
  const amtColor = t.tipe === 'Pemasukan' ? 'text-green' : t.tipe === 'Transfer' ? 'text-blue' : 'text-red';
  const amtPrefix = t.tipe === 'Pemasukan' ? '+' : t.tipe === 'Transfer' ? '⇄' : '-';
  const editBtn = withEdit ? `<div class="icon-btn" onclick="event.stopPropagation();editTrx('${t.id}')" style="width:28px;height:28px;font-size:13px;flex-shrink:0">✏️</div>` : '';

  return `<div class="trx-item" onclick="${withEdit ? `editTrx('${t.id}')` : ''}">
    <div class="avatar" style="background:${hexToRgba(color,.12)}">${icon}</div>
    <div style="flex:1;min-width:0">
      <div class="text-sm fw500" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${Utils.sanitize(t.keterangan || t.kategori)}</div>
      <div class="text-xs text-muted">${Utils.sanitize(t.kategori)} · ${Utils.sanitize(t.akun)}${t.akunTujuan ? ' → '+Utils.sanitize(t.akunTujuan):''}</div>
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div class="text-sm fw600 ${amtColor}">${amtPrefix}${Utils.formatRupiah(t.nominal)}</div>
      <div class="text-xs text-muted">${Utils.formatDate(t.tanggal, {short:true})}</div>
    </div>
    ${editBtn}
  </div>`;
}

function renderTrxFilters() {
  const types = ['all','Pemasukan','Pengeluaran','Transfer'];
  const typesEl = document.getElementById('filter-tipe');
  typesEl.innerHTML = types.map(t => `<span class="filter-tag ${currentFilter.tipe===t?'active':''}" onclick="setFilter('tipe','${t}')">${t === 'all' ? 'Semua' : t}</span>`).join('');

  const cats = ['all', ...new Set(DB.getTransactions().map(t => t.kategori))];
  const catEl = document.getElementById('filter-kategori');
  catEl.innerHTML = cats.map(c => `<span class="filter-tag ${currentFilter.kategori===c?'active':''}" onclick="setFilter('kategori','${c}')">${c === 'all' ? 'Semua Kategori' : Utils.sanitize(c)}</span>`).join('');
}

function setFilter(key, val) {
  currentFilter[key] = val;
  renderTransactions();
}

function changePeriod(dir) {
  const [y, m] = (currentFilter.bulan || Utils.currentPeriod()).split('-').map(Number);
  const d = new Date(y, m - 1 + dir, 1);
  const newP = d.toISOString().slice(0, 7);
  currentFilter.bulan = newP;
  if (currentPage === 'trx') renderTransactions();
  if (currentPage === 'dash') { DB.saveMeta('activePeriod', newP); renderDashboard(); }
}

// ── TRANSACTION MODAL ────────────────────────────────────
function showTrxModal(id = null) {
  trxEditId = id;
  const editing = !!id;
  const trx = editing ? DB.getTransactions().find(t => t.id === id) : null;

  const accounts = DB.getAccounts().filter(a => a.status === 'Aktif');
  const categories = DB.getCategories().filter(c => c.status === 'Aktif');
  const catOut = categories.filter(c => c.tipe.startsWith('Pengeluaran'));
  const catIn = categories.filter(c => c.tipe === 'Pemasukan');

  const accOptions = accounts.map(a => `<option value="${Utils.sanitize(a.nama)}" ${trx?.akun===a.nama?'selected':''}>${Utils.sanitize(a.nama)}</option>`).join('');
  const catOutOpts = catOut.map(c => `<option value="${Utils.sanitize(c.nama)}" ${trx?.kategori===c.nama?'selected':''}>${c.icon} ${Utils.sanitize(c.nama)}</option>`).join('');
  const catInOpts = catIn.map(c => `<option value="${Utils.sanitize(c.nama)}" ${trx?.kategori===c.nama?'selected':''}>${c.icon} ${Utils.sanitize(c.nama)}</option>`).join('');

  const tipeNow = trx?.tipe || 'Pengeluaran';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-trx';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-handle"></div>
      <div class="row-between mb12">
        <div class="modal-title">${editing ? 'Edit' : 'Tambah'} Transaksi</div>
        ${editing ? `<button class="btn btn-danger btn-sm" onclick="deleteTrx('${id}')">Hapus</button>` : ''}
      </div>
      <div class="tabs mb12" id="trx-tabs">
        <button class="tab ${tipeNow==='Pengeluaran'?'active out':''}" onclick="switchTrxTab('Pengeluaran',this)">Pengeluaran</button>
        <button class="tab ${tipeNow==='Pemasukan'?'active in':''}" onclick="switchTrxTab('Pemasukan',this)">Pemasukan</button>
        <button class="tab ${tipeNow==='Transfer'?'active tf':''}" onclick="switchTrxTab('Transfer',this)">Transfer</button>
      </div>
      <div class="form-group">
        <label class="form-label">Nominal (Rp)</label>
        <input id="trx-nominal" class="inp inp-lg" type="number" min="0" placeholder="0" value="${trx?.nominal||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Tanggal</label>
        <input id="trx-tanggal" class="inp" type="date" value="${trx?.tanggal||Utils.today()}">
      </div>
      <div class="form-group" id="trx-cat-wrap">
        <label class="form-label">Kategori</label>
        <select id="trx-kategori" class="inp">
          <optgroup label="Pengeluaran Dasar">${catOutOpts}</optgroup>
          <optgroup label="Pemasukan">${catInOpts}</optgroup>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Dari Akun</label>
        <select id="trx-akun" class="inp">${accOptions}</select>
      </div>
      <div class="form-group" id="trx-akun-tujuan-wrap" style="display:${tipeNow==='Transfer'?'':'none'}">
        <label class="form-label">Ke Akun</label>
        <select id="trx-akun-tujuan" class="inp">${accOptions}</select>
      </div>
      <div class="form-group">
        <label class="form-label">Keterangan (opsional)</label>
        <input id="trx-ket" class="inp" type="text" placeholder="Catatan singkat..." value="${Utils.sanitize(trx?.keterangan||'')}">
      </div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-ghost btn-full" onclick="closeTrxModal()">Batal</button>
        <button class="btn btn-primary btn-full" onclick="saveTrx()">Simpan</button>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) closeTrxModal(); };
  setTimeout(() => document.getElementById('trx-nominal')?.focus(), 100);
}

function switchTrxTab(tipe, btn) {
  document.querySelectorAll('#trx-tabs .tab').forEach(t => { t.classList.remove('active','out','in','tf'); });
  const cls = tipe === 'Pengeluaran' ? 'out' : tipe === 'Pemasukan' ? 'in' : 'tf';
  btn.classList.add('active', cls);
  document.getElementById('trx-akun-tujuan-wrap').style.display = tipe === 'Transfer' ? '' : 'none';
  const catWrap = document.getElementById('trx-cat-wrap');
  catWrap.style.display = tipe === 'Transfer' ? 'none' : '';
}

function closeTrxModal() { document.getElementById('modal-trx')?.remove(); }

async function saveTrx() {
  const tipeEl = document.querySelector('#trx-tabs .tab.active');
  const tipe = tipeEl?.textContent?.trim() || 'Pengeluaran';
  const nominal = parseFloat(document.getElementById('trx-nominal')?.value) || 0;
  const tanggal = document.getElementById('trx-tanggal')?.value;
  const kategori = document.getElementById('trx-kategori')?.value || 'Transfer';
  const akun = document.getElementById('trx-akun')?.value;
  const akunTujuan = document.getElementById('trx-akun-tujuan')?.value || '';
  const ket = document.getElementById('trx-ket')?.value || '';

  if (!nominal || nominal <= 0) { Utils.showToast('Nominal harus diisi!', 'error'); return; }
  if (!tanggal) { Utils.showToast('Tanggal harus diisi!', 'error'); return; }
  if (!akun) { Utils.showToast('Pilih akun!', 'error'); return; }

  const trxData = {
    tipe, nominal, tanggal, kategori: tipe === 'Transfer' ? 'Transfer' : kategori,
    akun, akunTujuan, keterangan: ket,
    created: new Date().toISOString()
  };

  let transactions = DB.getTransactions();
  let accounts = DB.getAccounts();

  if (trxEditId) {
    const old = transactions.find(t => t.id === trxEditId);
    if (old) reverseAccountBalance(accounts, old);
    transactions = transactions.map(t => t.id === trxEditId ? { ...t, ...trxData } : t);
  } else {
    trxData.id = Utils.uid('TRX');
    transactions.push(trxData);
  }

  applyAccountBalance(accounts, trxData);
  DB.save('transactions', transactions);
  DB.save('accounts', accounts);
  DB.syncAllocations();
  closeTrxModal();

  Utils.showLoading('Menyimpan...');
  const r = await DB.push();
  Utils.hideLoading();
  if (r.ok) Utils.showToast('Transaksi tersimpan ✓', 'success');
  else Utils.showToast('Tersimpan lokal (GitHub gagal)', 'warning');

  renderAll();
}

function editTrx(id) { showTrxModal(id); }

async function deleteTrx(id) {
  Utils.confirm('Hapus transaksi ini?', async () => {
    let transactions = DB.getTransactions();
    let accounts = DB.getAccounts();
    const trx = transactions.find(t => t.id === id);
    if (trx) reverseAccountBalance(accounts, trx);
    transactions = transactions.filter(t => t.id !== id);
    DB.save('transactions', transactions);
    DB.save('accounts', accounts);
    DB.syncAllocations();
    closeTrxModal();
    Utils.showLoading('Menghapus...');
    await DB.push();
    Utils.hideLoading();
    Utils.showToast('Transaksi dihapus', 'success');
    renderAll();
  });
}

function applyAccountBalance(accounts, trx) {
  const idx = accounts.findIndex(a => a.nama === trx.akun);
  if (idx === -1) return;
  if (trx.tipe === 'Pemasukan') accounts[idx].saldoSekarang = (accounts[idx].saldoSekarang || 0) + trx.nominal;
  else if (trx.tipe === 'Pengeluaran') accounts[idx].saldoSekarang = (accounts[idx].saldoSekarang || 0) - trx.nominal;
  else if (trx.tipe === 'Transfer') {
    accounts[idx].saldoSekarang = (accounts[idx].saldoSekarang || 0) - trx.nominal;
    const idx2 = accounts.findIndex(a => a.nama === trx.akunTujuan);
    if (idx2 !== -1) accounts[idx2].saldoSekarang = (accounts[idx2].saldoSekarang || 0) + trx.nominal;
  }
}

function reverseAccountBalance(accounts, trx) {
  const reversed = { ...trx, tipe: trx.tipe === 'Pemasukan' ? 'Pengeluaran' : trx.tipe === 'Pengeluaran' ? 'Pemasukan' : 'Transfer', akunTujuan: trx.akun, akun: trx.akunTujuan || trx.akun };
  if (trx.tipe === 'Transfer') {
    const idx = accounts.findIndex(a => a.nama === trx.akun);
    if (idx !== -1) accounts[idx].saldoSekarang = (accounts[idx].saldoSekarang || 0) + trx.nominal;
    const idx2 = accounts.findIndex(a => a.nama === trx.akunTujuan);
    if (idx2 !== -1) accounts[idx2].saldoSekarang = (accounts[idx2].saldoSekarang || 0) - trx.nominal;
  } else {
    applyAccountBalance(accounts, reversed);
  }
}

// ── HELPERS ──────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── ONBOARDING ───────────────────────────────────────────
let setupStep = 0;
const TOTAL_SETUP_STEPS = 4;

function showOnboarding() {
  document.getElementById('onboarding').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  goSetupStep(0);
}

function hideOnboarding() {
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
}

function goSetupStep(n) {
  setupStep = n;
  document.querySelectorAll('.setup-step').forEach((el, i) => {
    el.classList.toggle('active', i === n);
  });
  document.querySelectorAll('.setup-dot').forEach((el, i) => {
    el.classList.toggle('done', i <= n);
  });
}

async function finishSetup() {
  const repo = document.getElementById('setup-repo')?.value?.trim();
  const token = document.getElementById('setup-token')?.value?.trim();
  const name = document.getElementById('setup-name')?.value?.trim();
  const waKey = document.getElementById('setup-wa-key')?.value?.trim();
  const waNum = document.getElementById('setup-wa-num')?.value?.trim();

  if (!repo || !token) { Utils.showToast('Repo dan token GitHub wajib diisi!', 'error'); return; }

  const accounts = [];
  const accInputs = document.querySelectorAll('.setup-acc-row');
  accInputs.forEach(row => {
    const nama = row.querySelector('.acc-nama')?.value?.trim();
    const tipe = row.querySelector('.acc-tipe')?.value;
    const saldo = parseFloat(row.querySelector('.acc-saldo')?.value) || 0;
    const warna = row.querySelector('.acc-warna')?.value || '#3B82F6';
    if (nama) accounts.push({ id: Utils.uid('ACC'), nama, tipe, saldoAwal: saldo, saldoSekarang: saldo, warna, status: 'Aktif' });
  });

  DB.initFresh({ repo, token, ownerName: name, waKey, waNumber: waNum, accounts, useDefaultCategories: true });

  Utils.showLoading('Membuat database...');

  if (waKey && waNum) {
    DB.saveConfig('whatsapp.enabled', true);
    DB.saveConfig('whatsapp.number', waNum);
  }

  const r = await DB.push();
  Utils.hideLoading();

  if (r.ok) {
    Utils.showToast('Setup berhasil! Selamat datang 🎉', 'success');
  } else {
    Utils.showToast('GitHub gagal, tapi data tersimpan lokal', 'warning');
  }

  DB.syncAllocations();
  hideOnboarding();
  document.getElementById('app').style.display = 'flex';
  currentPage = 'dash';
  goTo('dash');
}

function addSetupAccRow() {
  const container = document.getElementById('setup-acc-list');
  const row = document.createElement('div');
  row.className = 'setup-acc-row card-sm row';
  row.style.cssText = 'gap:8px;margin-bottom:8px;align-items:center;flex-wrap:wrap';
  row.innerHTML = `
    <input class="inp acc-nama" placeholder="Nama akun" style="flex:2;min-width:100px">
    <select class="inp acc-tipe" style="flex:1;min-width:80px">
      <option>Bank</option><option>Cash</option><option>E-wallet</option><option>Investasi</option>
    </select>
    <input class="inp acc-saldo" type="number" placeholder="Saldo awal" style="flex:2;min-width:100px">
    <input class="inp acc-warna" type="color" value="#3B82F6" style="width:36px;height:36px;padding:2px;flex-shrink:0">
    <button class="btn btn-danger btn-sm" onclick="this.closest('.setup-acc-row').remove()" style="flex-shrink:0">✕</button>`;
  container.appendChild(row);
}

// ── RESET & IMPORT ───────────────────────────────────────
function showResetOptions() {
  Utils.confirm(
    '⚠️ Reset akan menghapus SEMUA data lokal dan memulai dari awal. Data di GitHub tidak tersentuh kecuali kamu setup ulang.<br><br>Yakin lanjutkan?',
    () => {
      DB.hardReset();
      Utils.showToast('Data lokal dihapus. Silakan setup ulang.', 'info');
      setTimeout(() => location.reload(), 1200);
    }
  );
}

function exportJSON() {
  const data = DB.get();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dompetku-backup-${Utils.today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Utils.showToast('Export berhasil!', 'success');
}

function importJSON() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!imported.meta || !imported.config) throw new Error('Format tidak valid');
      Utils.confirm('Import akan MENGGANTI semua data yang ada. Lanjutkan?', async () => {
        DB.set(imported);
        DB.syncAllocations();
        Utils.showLoading('Menyimpan...');
        await DB.push();
        Utils.hideLoading();
        Utils.showToast('Import berhasil!', 'success');
        renderAll();
      });
    } catch (err) {
      Utils.showToast('File tidak valid: ' + err.message, 'error');
    }
  };
  inp.click();
}
