// ============================================================
// DOMPET KU v3.0 — DATABASE LAYER (GitHub JSON)
// ============================================================

const DB = (() => {
  let _data = null;
  let _sha = null; // GitHub file SHA for updates

  // ── Helpers ──────────────────────────────────────────────
  const cfg = () => _data?.config?.github || {};
  const apiBase = () => `https://api.github.com/repos/${cfg().repo}/contents/${cfg().dbPath || 'data/db.json'}`;
  const headers = () => ({
    'Authorization': `token ${cfg().token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3+json'
  });

  // ── Load from GitHub ──────────────────────────────────────
  async function pull() {
    try {
      const r = await fetch(apiBase() + `?ref=${cfg().branch || 'main'}&t=${Date.now()}`, { headers: headers() });
      if (!r.ok) throw new Error(`GitHub ${r.status}: ${r.statusText}`);
      const j = await r.json();
      _sha = j.sha;
      const decoded = JSON.parse(atob(j.content.replace(/\n/g, '')));
      _data = decoded;
      _saveLocal();
      return { ok: true };
    } catch (e) {
      console.warn('GitHub pull failed, using local:', e.message);
      return { ok: false, error: e.message };
    }
  }

  // ── Push to GitHub ────────────────────────────────────────
  async function push() {
    try {
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(_data, null, 2))));
      const body = {
        message: `Dompet Ku update ${new Date().toISOString()}`,
        content,
        branch: cfg().branch || 'main'
      };
      if (_sha) body.sha = _sha;
      const r = await fetch(apiBase(), {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(body)
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.message || `GitHub ${r.status}`);
      }
      const j = await r.json();
      _sha = j.content.sha;
      _saveLocal();
      return { ok: true };
    } catch (e) {
      console.error('GitHub push failed:', e.message);
      return { ok: false, error: e.message };
    }
  }

  // ── Local cache ───────────────────────────────────────────
  function _saveLocal() {
    try { localStorage.setItem('dompetku_v3_data', JSON.stringify(_data)); } catch (_) {}
    try { if (_sha) localStorage.setItem('dompetku_v3_sha', _sha); } catch (_) {}
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem('dompetku_v3_data');
      if (!raw) return false;
      _data = JSON.parse(raw);
      _sha = localStorage.getItem('dompetku_v3_sha') || null;
      return true;
    } catch (_) { return false; }
  }

  // ── Setup check ───────────────────────────────────────────
  function isSetup() {
    return !!(cfg().repo && cfg().token);
  }

  function isFirstRun() {
    return !localStorage.getItem('dompetku_v3_data');
  }

  // ── Init fresh DB ─────────────────────────────────────────
  function initFresh(setupData) {
    const now = new Date().toISOString().slice(0, 10);
    const period = now.slice(0, 7);
    _data = {
      meta: { version: '3.0.0', created: now, currency: 'IDR', dateFormat: 'DD/MM/YYYY', activePeriod: period },
      config: {
        appName: setupData.appName || 'Dompet Ku',
        ownerName: setupData.ownerName || '',
        github: {
          repo: setupData.repo || '',
          token: setupData.token || '',
          branch: 'main',
          dbPath: 'data/db.json'
        },
        whatsapp: {
          enabled: false,
          provider: 'fonnte',
          apiKey: setupData.waKey || '',
          number: setupData.waNumber || '',
          templates: {
            daily: '📊 *RINGKASAN HARIAN*\n{tanggal}\n\n💰 Masuk: {pemasukan}\n💸 Keluar: {pengeluaran}\n💵 Saldo: {saldo}\n\nTop Pengeluaran:\n{top_kategori}\n\n{pesan_motivasi}',
            weekly: '📈 *RINGKASAN MINGGUAN*\nMinggu {minggu_ke}, {bulan}\n\n💰 Masuk: {pemasukan}\n💸 Keluar: {pengeluaran}\n💵 Saldo: {saldo}\n\nKategori Terbesar:\n{top_kategori}\n\n{pesan_motivasi}',
            monthly: '📋 *LAPORAN BULANAN*\nPeriode: {periode}\n\n💰 Pemasukan: {pemasukan}\n💸 Pengeluaran: {pengeluaran}\n💵 Saving Rate: {saving_rate}%\n\n📊 Per Jatah:\n{detail_jatah}\n\n{pesan_motivasi}',
            budgetWarning: '⚠️ *JATAH HAMPIR HABIS*\n\nJatah *{nama_jatah}* sudah {persen}% terpakai!\n💰 Alokasi: {alokasi}\n💸 Terpakai: {terpakai}\n💵 Sisa: {sisa}\n\nBijak ya dalam belanja 🙏',
            debtReminder: '🔔 *REMINDER UTANG*\n\nHai! Utang ke *{nama_pihak}* jatuh tempo {hari} hari lagi.\n\n📅 Jatuh Tempo: {jatuh_tempo}\n💰 Sisa: {sisa}\n\nJangan lupa ya! 💪'
          },
          schedule: {
            dailyEnabled: true, dailyTime: '08:00',
            weeklyEnabled: true, weeklyDay: '1', weeklyTime: '07:00',
            monthlyEnabled: true, monthlyDay: '1', monthlyTime: '07:00',
            budgetWarningEnabled: true, budgetWarningThreshold: 80,
            debtReminderEnabled: true, debtReminderDays: [7, 3, 1]
          }
        },
        display: { warningThreshold: 80, dangerThreshold: 100 }
      },
      accounts: setupData.accounts || [],
      categories: setupData.useDefaultCategories !== false ? DEFAULT_CATEGORIES : [],
      transactions: [],
      allocations: [],
      debts: [],
      reminders: []
    };
    _saveLocal();
  }

  // ── Getters/Setters ───────────────────────────────────────
  const get = () => _data;
  const set = (newData) => { _data = newData; };

  function getAccounts() { return _data?.accounts || []; }
  function getCategories() { return _data?.categories || []; }
  function getTransactions() { return _data?.transactions || []; }
  function getAllocations() { return _data?.allocations || []; }
  function getDebts() { return _data?.debts || []; }
  function getConfig() { return _data?.config || {}; }
  function getMeta() { return _data?.meta || {}; }

  function save(section, newArr) {
    if (!_data) return;
    _data[section] = newArr;
    _saveLocal();
  }

  function saveMeta(key, val) {
    if (!_data) return;
    _data.meta[key] = val;
    _saveLocal();
  }

  function saveConfig(path, val) {
    if (!_data) return;
    const parts = path.split('.');
    let obj = _data.config;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = val;
    _saveLocal();
  }

  // ── Sync allocations from transactions ───────────────────
  function syncAllocations() {
    if (!_data) return;
    const period = _data.meta.activePeriod;
    const periodTrx = _data.transactions.filter(t =>
      t.tanggal && t.tanggal.startsWith(period) && t.tipe === 'Pengeluaran'
    );

    _data.allocations = _data.allocations.map(alloc => {
      const terpakai = periodTrx
        .filter(t => (alloc.kategoriInclude || []).includes(t.kategori))
        .reduce((s, t) => s + (t.nominal || 0), 0);
      const sisa = (alloc.alokasi || 0) - terpakai;
      const progress = alloc.alokasi > 0 ? Math.round((terpakai / alloc.alokasi) * 100) : 0;
      let status = 'Aman';
      const warn = _data.config.display?.warningThreshold || 80;
      if (progress >= 100) status = 'Over';
      else if (progress >= warn) status = 'Warning';
      return { ...alloc, terpakai, sisa, progress, status };
    });
    _saveLocal();
  }

  // ── Reset ─────────────────────────────────────────────────
  function hardReset() {
    localStorage.removeItem('dompetku_v3_data');
    localStorage.removeItem('dompetku_v3_sha');
    _data = null;
    _sha = null;
  }

  return {
    pull, push, loadLocal, isSetup, isFirstRun, initFresh,
    get, set, save, saveMeta, saveConfig, syncAllocations,
    getAccounts, getCategories, getTransactions, getAllocations, getDebts, getConfig, getMeta,
    hardReset
  };
})();
