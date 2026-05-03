// ============================================================
// DOMPET KU v3.0 — PAGES (Alloc, Debts, Accounts, Cats, Settings, WA, Reports)
// ============================================================

// ── ALLOCATIONS ──────────────────────────────────────────
function renderAllocations() {
  const period = DB.getMeta().activePeriod;
  DB.syncAllocations();
  const allocs = DB.getAllocations().filter(a => a.bulan?.startsWith(period) || !a.bulan);
  const totalAlokasi = allocs.reduce((s, a) => s + (a.alokasi || 0), 0);
  const totalTerpakai = allocs.reduce((s, a) => s + (a.terpakai || 0), 0);

  document.getElementById('alloc-total').textContent = Utils.formatRupiah(totalAlokasi);
  document.getElementById('alloc-terpakai').textContent = Utils.formatRupiah(totalTerpakai);
  document.getElementById('alloc-sisa').textContent = Utils.formatRupiah(totalAlokasi - totalTerpakai);

  const el = document.getElementById('alloc-list');
  if (allocs.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🎯</div><p>Belum ada jatah untuk periode ini</p></div>`;
    return;
  }

  const warn = DB.getConfig().display?.warningThreshold || 80;
  el.innerHTML = allocs.map(a => {
    const pct = Math.min(a.progress || 0, 100);
    const color = Utils.progressColor(pct, warn);
    const chipClass = pct >= 100 ? 'chip-red' : pct >= warn ? 'chip-yellow' : 'chip-green';
    const katList = (a.kategoriInclude || []).slice(0, 3).join(', ') + ((a.kategoriInclude || []).length > 3 ? ' +' + ((a.kategoriInclude||[]).length - 3) : '');

    return `<div class="card" style="${pct >= 100 ? 'border-color:rgba(248,113,113,.3)' : pct >= warn ? 'border-color:rgba(251,191,36,.25)' : ''}">
      <div class="row-between mb4">
        <div class="row" style="gap:8px">
          <div class="dot" style="background:${a.warna || color}"></div>
          <span class="fw500">${Utils.sanitize(a.nama)}</span>
        </div>
        <div class="row" style="gap:6px">
          <span class="chip ${chipClass}">${pct}%</span>
          <div class="icon-btn" onclick="showEditAllocModal('${a.id}')" style="width:28px;height:28px;font-size:12px">✏️</div>
        </div>
      </div>
      <div class="text-xs text-muted mb4">${Utils.sanitize(katList)}</div>
      <div class="row-between text-xs" style="margin-bottom:6px">
        <span style="color:${color}">${Utils.formatRupiah(a.terpakai)} terpakai</span>
        <span class="text-muted">dari ${Utils.formatRupiah(a.alokasi)}</span>
      </div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;background:${color}"></div></div>
      ${pct >= 100 ? `<div class="text-xs text-red mt4">Over ${Utils.formatRupiah(Math.abs(a.sisa))}</div>` :
        `<div class="text-xs text-muted mt4">Sisa ${Utils.formatRupiah(a.sisa)}</div>`}
    </div>`;
  }).join('');
}

function showAllocModal(id = null) {
  const existing = id ? DB.getAllocations().find(a => a.id === id) : null;
  const cats = DB.getCategories().filter(c => c.tipe.startsWith('Pengeluaran') && c.status === 'Aktif');
  const selectedKats = existing?.kategoriInclude || [];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-alloc';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-handle"></div>
      <div class="row-between mb12">
        <div class="modal-title">${existing ? 'Edit' : 'Tambah'} Jatah</div>
        ${existing ? `<button class="btn btn-danger btn-sm" onclick="deleteAlloc('${id}')">Hapus</button>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Nama Jatah</label>
        <input id="alloc-nama" class="inp" placeholder="cth: Pengeluaran Dasar" value="${Utils.sanitize(existing?.nama||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Budget Alokasi (Rp)</label>
        <input id="alloc-budget" class="inp inp-lg" type="number" min="0" placeholder="0" value="${existing?.alokasi||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Warna</label>
        <input id="alloc-warna" class="inp" type="color" value="${existing?.warna||'#a78bfa'}" style="height:44px;padding:4px">
      </div>
      <div class="form-group">
        <label class="form-label">Warning di (%)</label>
        <input id="alloc-warn" class="inp" type="number" min="1" max="100" value="${existing?.warningLevel||80}">
      </div>
      <div class="form-group">
        <label class="form-label">Kategori yang masuk jatah ini (pilih beberapa)</label>
        <div id="alloc-kat-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
          ${cats.map(c => `<span class="filter-tag ${selectedKats.includes(c.nama)?'active':''}" onclick="toggleAllocKat(this,'${Utils.sanitize(c.nama)}')">${c.icon} ${Utils.sanitize(c.nama)}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost btn-full" onclick="closeAllocModal()">Batal</button>
        <button class="btn btn-primary btn-full" onclick="saveAlloc('${id||''}')">Simpan</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) closeAllocModal(); };
}

function showEditAllocModal(id) { showAllocModal(id); }

function toggleAllocKat(el, nama) { el.classList.toggle('active'); }

function closeAllocModal() { document.getElementById('modal-alloc')?.remove(); }

async function saveAlloc(editId) {
  const nama = document.getElementById('alloc-nama')?.value?.trim();
  const budget = parseFloat(document.getElementById('alloc-budget')?.value) || 0;
  const warna = document.getElementById('alloc-warna')?.value || '#a78bfa';
  const warningLevel = parseInt(document.getElementById('alloc-warn')?.value) || 80;
  const kats = [...document.querySelectorAll('#alloc-kat-list .filter-tag.active')].map(el => el.textContent.trim().replace(/^.+\s/, ''));

  if (!nama) { Utils.showToast('Nama jatah wajib diisi!', 'error'); return; }

  const period = DB.getMeta().activePeriod;
  let allocs = DB.getAllocations();

  if (editId) {
    allocs = allocs.map(a => a.id === editId ? { ...a, nama, alokasi: budget, warna, warningLevel, kategoriInclude: kats } : a);
  } else {
    const katsFull = [...document.querySelectorAll('#alloc-kat-list .filter-tag.active')].map(el => {
      const full = el.textContent.trim();
      return full.replace(/^\S+\s/, '');
    });
    allocs.push({ id: Utils.uid('ALLOC'), bulan: period, nama, alokasi: budget, terpakai: 0, sisa: budget, progress: 0, status: 'Aman', warna, warningLevel, kategoriInclude: kats });
  }

  DB.save('allocations', allocs);
  DB.syncAllocations();
  closeAllocModal();
  Utils.showLoading('Menyimpan...');
  await DB.push();
  Utils.hideLoading();
  Utils.showToast('Jatah tersimpan ✓', 'success');
  renderAllocations();
}

async function deleteAlloc(id) {
  Utils.confirm('Hapus jatah ini?', async () => {
    DB.save('allocations', DB.getAllocations().filter(a => a.id !== id));
    closeAllocModal();
    Utils.showLoading('Menghapus...');
    await DB.push();
    Utils.hideLoading();
    Utils.showToast('Jatah dihapus', 'success');
    renderAllocations();
  });
}

// ── DEBTS / PIUTANG ──────────────────────────────────────
function renderDebts() {
  const debts = DB.getDebts();
  const utang = debts.filter(d => d.tipe === 'Utang' && d.status === 'Aktif');
  const piutang = debts.filter(d => d.tipe === 'Piutang' && d.status === 'Aktif');

  document.getElementById('debt-total-utang').textContent = Utils.formatRupiah(utang.reduce((s, d) => s + d.sisa, 0));
  document.getElementById('debt-total-piutang').textContent = Utils.formatRupiah(piutang.reduce((s, d) => s + d.sisa, 0));

  const renderGroup = (items, label) => {
    if (items.length === 0) return `<div class="text-xs text-muted" style="text-align:center;padding:12px">Tidak ada ${label} aktif</div>`;
    return items.map(d => {
      const days = Utils.daysUntil(d.tanggalJatuhTempo);
      const chipClass = days !== null && days <= 7 ? 'chip-red' : days !== null && days <= 30 ? 'chip-yellow' : 'chip-blue';
      const daysLabel = days === null ? '' : days < 0 ? 'Terlambat!' : days === 0 ? 'Hari ini!' : `${days} hari lagi`;
      const pct = d.totalNominal > 0 ? Math.round((d.terbayar / d.totalNominal) * 100) : 0;
      return `<div class="card" style="margin-bottom:10px;cursor:pointer" onclick="showDebtModal('${d.id}')">
        <div class="row-between mb4">
          <div>
            <div class="fw500">${Utils.sanitize(d.namaPihak)}</div>
            <div class="text-xs text-muted">${Utils.formatDate(d.tanggalMulai,{short:true})} → ${Utils.formatDate(d.tanggalJatuhTempo,{short:true})}</div>
          </div>
          <div style="text-align:right">
            <div class="fw500 ${d.tipe==='Utang'?'text-red':'text-green'}">${Utils.formatRupiah(d.sisa)}</div>
            ${daysLabel ? `<span class="chip ${chipClass}" style="font-size:10px">${daysLabel}</span>` : ''}
          </div>
        </div>
        ${d.keterangan ? `<div class="text-xs text-muted mb4">${Utils.sanitize(d.keterangan)}</div>` : ''}
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;background:${d.tipe==='Utang'?'var(--blue)':'var(--green)'}"></div></div>
        <div class="text-xs text-muted mt4">Terbayar ${Utils.formatRupiah(d.terbayar)} dari ${Utils.formatRupiah(d.totalNominal)}</div>
      </div>`;
    }).join('');
  };

  document.getElementById('debt-utang-list').innerHTML = renderGroup(utang, 'utang');
  document.getElementById('debt-piutang-list').innerHTML = renderGroup(piutang, 'piutang');

  const lunas = debts.filter(d => d.status === 'Lunas');
  document.getElementById('debt-lunas-count').textContent = lunas.length;
}

function showDebtModal(id = null) {
  const existing = id ? DB.getDebts().find(d => d.id === id) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-debt';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-handle"></div>
      <div class="row-between mb12">
        <div class="modal-title">${existing ? 'Detail' : 'Tambah'} Utang/Piutang</div>
        ${existing ? `<button class="btn btn-danger btn-sm" onclick="deleteDebt('${id}')">Hapus</button>` : ''}
      </div>
      <div class="tabs mb12" id="debt-tabs">
        <button class="tab ${!existing||existing.tipe==='Utang'?'active out':''}" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active','out','in'));this.classList.add('active','out')">Utang (saya bayar)</button>
        <button class="tab ${existing?.tipe==='Piutang'?'active in':''}" onclick="this.parentElement.querySelectorAll('.tab').forEach(t=>t.classList.remove('active','out','in'));this.classList.add('active','in')">Piutang (orang bayar ke saya)</button>
      </div>
      <div class="form-group">
        <label class="form-label">Nama Pihak</label>
        <input id="debt-nama" class="inp" placeholder="Nama orang/bank" value="${Utils.sanitize(existing?.namaPihak||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Total Nominal (Rp)</label>
        <input id="debt-total" class="inp inp-lg" type="number" min="0" value="${existing?.totalNominal||''}">
      </div>
      ${existing ? `
      <div class="form-group">
        <label class="form-label">Sudah Terbayar (Rp)</label>
        <input id="debt-terbayar" class="inp" type="number" min="0" value="${existing.terbayar||0}">
      </div>` : ''}
      <div class="form-group">
        <label class="form-label">Tanggal Mulai</label>
        <input id="debt-mulai" class="inp" type="date" value="${existing?.tanggalMulai||Utils.today()}">
      </div>
      <div class="form-group">
        <label class="form-label">Jatuh Tempo</label>
        <input id="debt-tempo" class="inp" type="date" value="${existing?.tanggalJatuhTempo||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Cicilan per Bulan (opsional)</label>
        <input id="debt-cicilan" class="inp" type="number" min="0" value="${existing?.cicilanPerBulan||''}">
      </div>
      <div class="form-group">
        <label class="form-label">Keterangan</label>
        <input id="debt-ket" class="inp" placeholder="Catatan..." value="${Utils.sanitize(existing?.keterangan||'')}">
      </div>
      ${existing ? `
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="debt-status" class="inp">
          <option ${existing.status==='Aktif'?'selected':''}>Aktif</option>
          <option ${existing.status==='Lunas'?'selected':''}>Lunas</option>
        </select>
      </div>` : ''}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost btn-full" onclick="closeDebtModal()">Batal</button>
        <button class="btn btn-primary btn-full" onclick="saveDebt('${id||''}')">Simpan</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) closeDebtModal(); };
}

function closeDebtModal() { document.getElementById('modal-debt')?.remove(); }

async function saveDebt(editId) {
  const tipeEl = document.querySelector('#debt-tabs .tab.active');
  const tipe = tipeEl?.classList.contains('in') ? 'Piutang' : 'Utang';
  const namaPihak = document.getElementById('debt-nama')?.value?.trim();
  const totalNominal = parseFloat(document.getElementById('debt-total')?.value) || 0;
  const terbayar = parseFloat(document.getElementById('debt-terbayar')?.value) || 0;
  const tanggalMulai = document.getElementById('debt-mulai')?.value;
  const tanggalJatuhTempo = document.getElementById('debt-tempo')?.value;
  const cicilanPerBulan = parseFloat(document.getElementById('debt-cicilan')?.value) || 0;
  const keterangan = document.getElementById('debt-ket')?.value || '';
  const status = document.getElementById('debt-status')?.value || 'Aktif';

  if (!namaPihak) { Utils.showToast('Nama pihak wajib!', 'error'); return; }
  if (!totalNominal) { Utils.showToast('Nominal wajib!', 'error'); return; }

  const sisa = totalNominal - terbayar;
  const debtData = { tipe, namaPihak, totalNominal, terbayar, sisa, tanggalMulai, tanggalJatuhTempo, cicilanPerBulan, keterangan, status: status || (sisa <= 0 ? 'Lunas' : 'Aktif'), reminderDays: 7 };

  let debts = DB.getDebts();
  if (editId) {
    debts = debts.map(d => d.id === editId ? { ...d, ...debtData } : d);
  } else {
    debtData.id = Utils.uid('DEBT');
    debtData.created = new Date().toISOString();
    debts.push(debtData);
  }

  DB.save('debts', debts);
  closeDebtModal();
  Utils.showLoading('Menyimpan...');
  await DB.push();
  Utils.hideLoading();
  Utils.showToast('Utang/Piutang tersimpan ✓', 'success');
  renderDebts();
}

async function deleteDebt(id) {
  Utils.confirm('Hapus utang/piutang ini?', async () => {
    DB.save('debts', DB.getDebts().filter(d => d.id !== id));
    closeDebtModal();
    Utils.showLoading('Menghapus...');
    await DB.push();
    Utils.hideLoading();
    Utils.showToast('Dihapus', 'success');
    renderDebts();
  });
}

// ── ACCOUNTS ─────────────────────────────────────────────
function renderAccounts() {
  const accounts = DB.getAccounts();
  const el = document.getElementById('acc-list');

  if (accounts.length === 0) {
    el.innerHTML = `<div class="empty-state"><div class="icon">🏦</div><p>Belum ada akun</p></div>`;
    return;
  }

  el.innerHTML = accounts.map(a => {
    const typeEmoji = a.tipe === 'Bank' ? '🏦' : a.tipe === 'Cash' ? '💵' : a.tipe === 'E-wallet' ? '📱' : '💎';
    return `<div class="card" style="margin-bottom:10px;cursor:pointer" onclick="showAccModal('${a.id}')">
      <div class="row-between">
        <div class="row" style="gap:10px">
          <div class="avatar" style="background:${hexToRgba(a.warna||'#3B82F6',.12)}">${typeEmoji}</div>
          <div>
            <div class="fw500">${Utils.sanitize(a.nama)}</div>
            <div class="text-xs text-muted">${a.tipe} · <span style="color:${a.status==='Aktif'?'var(--green)':'var(--red)'}">${a.status}</span></div>
          </div>
        </div>
        <div style="text-align:right">
          <div class="fw500">${Utils.formatRupiah(a.saldoSekarang)}</div>
          <div class="text-xs text-muted">Awal: ${Utils.formatRupiah(a.saldoAwal)}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function showAddAccountModal() { showAccModal(); }

function showAccModal(id = null) {
  const existing = id ? DB.getAccounts().find(a => a.id === id) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-acc';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-handle"></div>
      <div class="row-between mb12">
        <div class="modal-title">${existing ? 'Edit' : 'Tambah'} Akun</div>
        ${existing ? `<button class="btn btn-danger btn-sm" onclick="deleteAcc('${id}')">Hapus</button>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Nama Akun</label>
        <input id="acc-nama" class="inp" placeholder="cth: BCA Tabungan" value="${Utils.sanitize(existing?.nama||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Tipe</label>
        <select id="acc-tipe" class="inp">
          <option ${existing?.tipe==='Bank'?'selected':''}>Bank</option>
          <option ${existing?.tipe==='Cash'?'selected':''}>Cash</option>
          <option ${existing?.tipe==='E-wallet'?'selected':''}>E-wallet</option>
          <option ${existing?.tipe==='Investasi'?'selected':''}>Investasi</option>
          <option ${existing?.tipe==='Lainnya'?'selected':''}>Lainnya</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Saldo ${existing ? 'Sekarang' : 'Awal'} (Rp)</label>
        <input id="acc-saldo" class="inp inp-lg" type="number" min="0" value="${existing ? existing.saldoSekarang : ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Warna Identitas</label>
        <input id="acc-warna" class="inp" type="color" value="${existing?.warna||'#3B82F6'}" style="height:44px;padding:4px">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="acc-status" class="inp">
          <option ${!existing||existing.status==='Aktif'?'selected':''}>Aktif</option>
          <option ${existing?.status==='Nonaktif'?'selected':''}>Nonaktif</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost btn-full" onclick="closeAccModal()">Batal</button>
        <button class="btn btn-primary btn-full" onclick="saveAcc('${id||''}')">Simpan</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) closeAccModal(); };
}

function closeAccModal() { document.getElementById('modal-acc')?.remove(); }

async function saveAcc(editId) {
  const nama = document.getElementById('acc-nama')?.value?.trim();
  const tipe = document.getElementById('acc-tipe')?.value;
  const saldo = parseFloat(document.getElementById('acc-saldo')?.value) || 0;
  const warna = document.getElementById('acc-warna')?.value || '#3B82F6';
  const status = document.getElementById('acc-status')?.value || 'Aktif';

  if (!nama) { Utils.showToast('Nama akun wajib!', 'error'); return; }

  let accounts = DB.getAccounts();
  if (editId) {
    accounts = accounts.map(a => a.id === editId ? { ...a, nama, tipe, saldoSekarang: saldo, warna, status } : a);
  } else {
    accounts.push({ id: Utils.uid('ACC'), nama, tipe, saldoAwal: saldo, saldoSekarang: saldo, warna, status, created: new Date().toISOString() });
  }

  DB.save('accounts', accounts);
  closeAccModal();
  Utils.showLoading('Menyimpan...');
  await DB.push();
  Utils.hideLoading();
  Utils.showToast('Akun tersimpan ✓', 'success');
  renderAccounts();
  renderDashboard();
}

async function deleteAcc(id) {
  Utils.confirm('Hapus akun ini? Transaksi terkait tidak ikut terhapus.', async () => {
    DB.save('accounts', DB.getAccounts().filter(a => a.id !== id));
    closeAccModal();
    Utils.showLoading('Menghapus...');
    await DB.push();
    Utils.hideLoading();
    Utils.showToast('Akun dihapus', 'success');
    renderAccounts();
  });
}

// ── CATEGORIES ───────────────────────────────────────────
function renderCategories() {
  const cats = DB.getCategories();
  const groups = {};
  cats.forEach(c => {
    if (!groups[c.tipe]) groups[c.tipe] = [];
    groups[c.tipe].push(c);
  });

  const el = document.getElementById('cat-list');
  el.innerHTML = Object.entries(groups).map(([tipe, items]) => `
    <div style="margin-bottom:12px">
      <div class="label mb8">${tipe}</div>
      ${items.map(c => `<div class="card-sm row-between" style="margin-bottom:6px;cursor:pointer" onclick="showCatModal('${c.id}')">
        <div class="row" style="gap:8px">
          <span style="font-size:18px">${c.icon}</span>
          <span class="text-sm fw500">${Utils.sanitize(c.nama)}</span>
        </div>
        <div class="row" style="gap:6px">
          <div style="width:14px;height:14px;border-radius:50%;background:${c.warna}"></div>
          <span class="chip ${c.status==='Aktif'?'chip-green':'chip-gray'}" style="font-size:10px">${c.status}</span>
        </div>
      </div>`).join('')}
    </div>`).join('');
}

function showCatModal(id = null) {
  const existing = id ? DB.getCategories().find(c => c.id === id) : null;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modal-cat';
  modal.innerHTML = `
    <div class="modal-box">
      <div class="modal-handle"></div>
      <div class="row-between mb12">
        <div class="modal-title">${existing ? 'Edit' : 'Tambah'} Kategori</div>
        ${existing ? `<button class="btn btn-danger btn-sm" onclick="deleteCat('${id}')">Hapus</button>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Nama Kategori</label>
        <input id="cat-nama" class="inp" placeholder="cth: Belanja Bulanan" value="${Utils.sanitize(existing?.nama||'')}">
      </div>
      <div class="form-group">
        <label class="form-label">Tipe</label>
        <select id="cat-tipe" class="inp">
          <option ${existing?.tipe==='Pengeluaran Dasar'?'selected':''}>Pengeluaran Dasar</option>
          <option ${existing?.tipe==='Pengeluaran Lain'?'selected':''}>Pengeluaran Lain</option>
          <option ${existing?.tipe==='Pemasukan'?'selected':''}>Pemasukan</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Icon (emoji)</label>
        <input id="cat-icon" class="inp" placeholder="🛒" value="${existing?.icon||'📌'}">
      </div>
      <div class="form-group">
        <label class="form-label">Warna</label>
        <input id="cat-warna" class="inp" type="color" value="${existing?.warna||'#6B7280'}" style="height:44px;padding:4px">
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select id="cat-status" class="inp">
          <option ${!existing||existing.status==='Aktif'?'selected':''}>Aktif</option>
          <option ${existing?.status==='Nonaktif'?'selected':''}>Nonaktif</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-ghost btn-full" onclick="closeCatModal()">Batal</button>
        <button class="btn btn-primary btn-full" onclick="saveCat('${id||''}')">Simpan</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if (e.target === modal) closeCatModal(); };
}

function closeCatModal() { document.getElementById('modal-cat')?.remove(); }

async function saveCat(editId) {
  const nama = document.getElementById('cat-nama')?.value?.trim();
  const tipe = document.getElementById('cat-tipe')?.value;
  const icon = document.getElementById('cat-icon')?.value?.trim() || '📌';
  const warna = document.getElementById('cat-warna')?.value || '#6B7280';
  const status = document.getElementById('cat-status')?.value || 'Aktif';

  if (!nama) { Utils.showToast('Nama kategori wajib!', 'error'); return; }

  let cats = DB.getCategories();
  if (editId) {
    cats = cats.map(c => c.id === editId ? { ...c, nama, tipe, icon, warna, status } : c);
  } else {
    cats.push({ id: Utils.uid('CAT'), nama, tipe, icon, warna, status });
  }

  DB.save('categories', cats);
  closeCatModal();
  Utils.showLoading('Menyimpan...');
  await DB.push();
  Utils.hideLoading();
  Utils.showToast('Kategori tersimpan ✓', 'success');
  renderCategories();
}

async function deleteCat(id) {
  Utils.confirm('Hapus kategori ini?', async () => {
    DB.save('categories', DB.getCategories().filter(c => c.id !== id));
    closeCatModal();
    await DB.push();
    Utils.showToast('Kategori dihapus', 'success');
    renderCategories();
  });
}

// ── WHATSAPP PAGE ─────────────────────────────────────────
function renderWAPage() {
  const cfg = DB.getConfig().whatsapp;
  const sch = cfg?.schedule || {};

  document.getElementById('wa-status').textContent = cfg?.enabled ? '● Aktif' : '● Nonaktif';
  document.getElementById('wa-status').style.color = cfg?.enabled ? 'var(--green)' : 'var(--text3)';

  const toggles = [
    ['wa-tog-daily', 'dailyEnabled'], ['wa-tog-weekly', 'weeklyEnabled'],
    ['wa-tog-monthly', 'monthlyEnabled'], ['wa-tog-budget', 'budgetWarningEnabled'],
    ['wa-tog-debt', 'debtReminderEnabled']
  ];
  toggles.forEach(([elId, key]) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.className = `toggle ${sch[key] !== false ? 'on' : 'off'}`;
    el.innerHTML = '<div class="toggle-thumb"></div>';
  });

  document.getElementById('wa-daily-time').value = sch.dailyTime || '08:00';
  document.getElementById('wa-weekly-time').value = sch.weeklyTime || '07:00';
  document.getElementById('wa-weekly-day').value = sch.weeklyDay || '1';
  document.getElementById('wa-budget-threshold').value = sch.budgetWarningThreshold || 80;
  renderWATemplatePreview();
}

function renderWATemplatePreview() {
  const key = document.getElementById('wa-tpl-select')?.value || 'daily';
  const cfg = DB.getConfig().whatsapp;
  const tpl = cfg?.templates?.[key] || '';
  document.getElementById('wa-tpl-text').value = tpl;

  const previewVars = {
    tanggal: Utils.formatDate(Utils.today(), {long:true}), pemasukan: 'Rp 0', pengeluaran: 'Rp 85.000',
    saldo: '-Rp 85.000', top_kategori: '1. Makanan: Rp 50.000\n2. Transport: Rp 35.000',
    pesan_motivasi: 'Tetap semangat! 💪', minggu_ke: '1', bulan: 'Mei 2026',
    periode: Utils.formatMonthYear(DB.getMeta().activePeriod), saving_rate: '0',
    detail_jatah: '• Pengeluaran Dasar: 70%', nama_jatah: 'Pengeluaran Dasar',
    persen: '85', alokasi: 'Rp 700.000', terpakai: 'Rp 595.000', sisa: 'Rp 105.000',
    nama_pihak: 'Om Adi', hari: '7', jatuh_tempo: '30 Sep 2026'
  };
  let preview = tpl;
  Object.entries(previewVars).forEach(([k, v]) => { preview = preview.replaceAll(`{${k}}`, v); });
  document.getElementById('wa-preview').textContent = preview;
}

async function saveWASchedule() {
  const sch = {
    dailyEnabled: document.getElementById('wa-tog-daily')?.classList.contains('on'),
    dailyTime: document.getElementById('wa-daily-time')?.value || '08:00',
    weeklyEnabled: document.getElementById('wa-tog-weekly')?.classList.contains('on'),
    weeklyDay: document.getElementById('wa-weekly-day')?.value || '1',
    weeklyTime: document.getElementById('wa-weekly-time')?.value || '07:00',
    monthlyEnabled: document.getElementById('wa-tog-monthly')?.classList.contains('on'),
    monthlyDay: '1', monthlyTime: '07:00',
    budgetWarningEnabled: document.getElementById('wa-tog-budget')?.classList.contains('on'),
    budgetWarningThreshold: parseInt(document.getElementById('wa-budget-threshold')?.value) || 80,
    debtReminderEnabled: document.getElementById('wa-tog-debt')?.classList.contains('on'),
    debtReminderDays: [7, 3, 1]
  };
  DB.saveConfig('whatsapp.schedule', sch);
  Utils.showLoading('Menyimpan...');
  await DB.push();
  Utils.hideLoading();
  Utils.showToast('Jadwal notifikasi tersimpan ✓', 'success');
}

async function saveWATemplate() {
  const key = document.getElementById('wa-tpl-select')?.value;
  const tpl = document.getElementById('wa-tpl-text')?.value;
  DB.saveConfig(`whatsapp.templates.${key}`, tpl);
  Utils.showLoading('Menyimpan...');
  await DB.push();
  Utils.hideLoading();
  Utils.showToast('Template tersimpan ✓', 'success');
  renderWATemplatePreview();
}

async function sendWATest() {
  const key = document.getElementById('wa-tpl-select')?.value || 'daily';
  Utils.showLoading('Mengirim...');
  let r;
  if (key === 'daily') r = await WA.sendDaily();
  else if (key === 'weekly') r = await WA.sendWeekly();
  else if (key === 'monthly') r = await WA.sendMonthly();
  else r = await WA.sendCustom(document.getElementById('wa-tpl-text')?.value || 'Test dari Dompet Ku');
  Utils.hideLoading();
  if (r.ok) Utils.showToast('Pesan terkirim! 🎉', 'success');
  else Utils.showToast('Gagal kirim: ' + r.error, 'error');
}

// ── SETTINGS ─────────────────────────────────────────────
function renderSettings() {
  const cfg = DB.getConfig();
  const meta = DB.getMeta();

  document.getElementById('set-app-name').value = cfg.appName || 'Dompet Ku';
  document.getElementById('set-owner').value = cfg.ownerName || '';
  document.getElementById('set-period').value = meta.activePeriod || Utils.currentPeriod();
  document.getElementById('set-warn-threshold').value = cfg.display?.warningThreshold || 80;
  document.getElementById('set-repo').value = cfg.github?.repo || '';
  document.getElementById('set-token').value = cfg.github?.token || '';
  document.getElementById('set-branch').value = cfg.github?.branch || 'main';
  document.getElementById('set-wa-key').value = cfg.whatsapp?.apiKey || '';
  document.getElementById('set-wa-num').value = cfg.whatsapp?.number || '';
  document.getElementById('set-wa-enabled').className = `toggle ${cfg.whatsapp?.enabled ? 'on' : 'off'}`;
  document.getElementById('set-wa-enabled').innerHTML = '<div class="toggle-thumb"></div>';
}

async function saveSettings() {
  DB.saveConfig('appName', document.getElementById('set-app-name')?.value?.trim() || 'Dompet Ku');
  DB.saveConfig('ownerName', document.getElementById('set-owner')?.value?.trim() || '');
  DB.saveConfig('display.warningThreshold', parseInt(document.getElementById('set-warn-threshold')?.value) || 80);
  DB.saveConfig('github.repo', document.getElementById('set-repo')?.value?.trim() || '');
  DB.saveConfig('github.token', document.getElementById('set-token')?.value?.trim() || '');
  DB.saveConfig('github.branch', document.getElementById('set-branch')?.value?.trim() || 'main');
  DB.saveConfig('whatsapp.apiKey', document.getElementById('set-wa-key')?.value?.trim() || '');
  DB.saveConfig('whatsapp.number', document.getElementById('set-wa-num')?.value?.trim() || '');
  DB.saveConfig('whatsapp.enabled', document.getElementById('set-wa-enabled')?.classList.contains('on'));
  DB.saveMeta('activePeriod', document.getElementById('set-period')?.value || Utils.currentPeriod());

  Utils.showLoading('Menyimpan pengaturan...');
  const r = await DB.push();
  Utils.hideLoading();
  if (r.ok) Utils.showToast('Pengaturan tersimpan ✓', 'success');
  else Utils.showToast('Tersimpan lokal (GitHub gagal: ' + r.error + ')', 'warning');
  renderSettings();
}

async function testGithubConnection() {
  const repo = document.getElementById('set-repo')?.value?.trim();
  const token = document.getElementById('set-token')?.value?.trim();
  if (!repo || !token) { Utils.showToast('Isi repo dan token dulu!', 'error'); return; }
  Utils.showLoading('Menguji koneksi...');
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { 'Authorization': `token ${token}` }
    });
    Utils.hideLoading();
    if (r.ok) Utils.showToast('GitHub terhubung ✓', 'success');
    else Utils.showToast('Gagal: ' + r.status + ' ' + r.statusText, 'error');
  } catch (e) {
    Utils.hideLoading();
    Utils.showToast('Error: ' + e.message, 'error');
  }
}

async function syncNow() {
  Utils.showLoading('Sinkronisasi...');
  const r = await DB.pull();
  Utils.hideLoading();
  if (r.ok) { DB.syncAllocations(); renderAll(); Utils.showToast('Sinkronisasi berhasil ✓', 'success'); }
  else Utils.showToast('Sinkronisasi gagal: ' + r.error, 'error');
}

// ── REPORTS ──────────────────────────────────────────────
function renderReports() {
  const period = DB.getMeta().activePeriod;
  const trx = DB.getTransactions().filter(t => t.tanggal?.startsWith(period));
  const pemasukan = trx.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
  const pengeluaran = trx.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);
  const savingRate = pemasukan > 0 ? Math.round(((pemasukan - pengeluaran) / pemasukan) * 100) : 0;

  document.getElementById('rep-period').textContent = Utils.formatMonthYear(period);
  document.getElementById('rep-pemasukan').textContent = Utils.formatRupiah(pemasukan);
  document.getElementById('rep-pengeluaran').textContent = Utils.formatRupiah(pengeluaran);
  document.getElementById('rep-saving').textContent = savingRate + '%';
  document.getElementById('rep-saving').style.color = savingRate >= 20 ? 'var(--green)' : savingRate >= 0 ? 'var(--yellow)' : 'var(--red)';

  const katMap = {};
  trx.filter(t => t.tipe === 'Pengeluaran').forEach(t => {
    katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal;
  });
  const topKat = Object.entries(katMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const catEl = document.getElementById('rep-top-kat');
  catEl.innerHTML = topKat.length === 0 ?
    '<div class="text-xs text-muted">Tidak ada pengeluaran</div>' :
    topKat.map(([k, v]) => {
      const pct = pengeluaran > 0 ? Math.round((v / pengeluaran) * 100) : 0;
      return `<div style="margin-bottom:10px">
        <div class="row-between text-sm mb4">
          <span>${Utils.catIcon(k)} ${Utils.sanitize(k)}</span>
          <span>${Utils.formatRupiah(v)} (${pct}%)</span>
        </div>
        <div class="progress-wrap"><div class="progress-bar" style="width:${pct}%;background:${Utils.catColor(k)||'var(--accent)'}"></div></div>
      </div>`;
    }).join('');
}
