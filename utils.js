// ============================================================
// DOMPET KU v3.0 — UTILITIES
// ============================================================

const Utils = (() => {

  function formatRupiah(n, short = false) {
    const num = parseFloat(n) || 0;
    if (short) {
      if (Math.abs(num) >= 1_000_000) return 'Rp ' + (num / 1_000_000).toFixed(1).replace('.0','') + 'jt';
      if (Math.abs(num) >= 1_000) return 'Rp ' + (num / 1_000).toFixed(0) + 'rb';
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  }

  function formatDate(dateStr, opts = {}) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
      if (opts.short) return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (opts.long) return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (opts.monthYear) return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (_) { return dateStr; }
  }

  function formatMonthYear(ym) {
    if (!ym) return '';
    try {
      const d = new Date(ym + '-01T00:00:00');
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } catch (_) { return ym; }
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function currentPeriod() {
    return new Date().toISOString().slice(0, 7);
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date(); now.setHours(0,0,0,0);
    return Math.round((target - now) / 86400000);
  }

  function uid(prefix = 'ID') {
    return prefix + Date.now() + Math.random().toString(36).slice(2, 7);
  }

  function showToast(msg, type = 'info', dur = 3500) {
    document.querySelectorAll('.dk-toast').forEach(el => el.remove());
    const colors = {
      success: { bg: 'rgba(52,211,153,.15)', border: '#34d399', text: '#34d399' },
      error:   { bg: 'rgba(248,113,113,.15)', border: '#f87171', text: '#f87171' },
      warning: { bg: 'rgba(251,191,36,.15)', border: '#fbbf24', text: '#fbbf24' },
      info:    { bg: 'rgba(167,139,250,.15)', border: '#a78bfa', text: '#a78bfa' }
    };
    const c = colors[type] || colors.info;
    const el = document.createElement('div');
    el.className = 'dk-toast';
    el.style.cssText = `position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:9999;background:${c.bg};border:1px solid ${c.border};color:${c.text};padding:10px 18px;border-radius:10px;font-size:13px;font-weight:500;max-width:320px;text-align:center;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,.4);animation:fadeInDown .25s ease`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.style.opacity = '0', dur - 300);
    setTimeout(() => el.remove(), dur);
  }

  function showLoading(msg = 'Memuat...') {
    let el = document.getElementById('dk-loading');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dk-loading';
      el.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;backdrop-filter:blur(4px)';
      el.innerHTML = `<div style="width:36px;height:36px;border:3px solid #333;border-top-color:#a78bfa;border-radius:50%;animation:spin 1s linear infinite"></div><div id="dk-loading-msg" style="color:#a0a0a0;font-size:13px">${msg}</div>`;
      document.body.appendChild(el);
    } else {
      document.getElementById('dk-loading-msg').textContent = msg;
    }
  }

  function hideLoading() {
    document.getElementById('dk-loading')?.remove();
  }

  function confirm(msg, onYes, onNo) {
    let el = document.getElementById('dk-confirm');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'dk-confirm';
    el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(4px)';
    el.innerHTML = `
      <div style="background:#1a1a1a;border:1px solid #333;border-radius:16px;padding:24px;width:100%;max-width:320px;text-align:center">
        <div style="font-size:14px;color:#f0f0f0;margin-bottom:20px;line-height:1.6">${msg}</div>
        <div style="display:flex;gap:10px">
          <button id="dk-confirm-no" style="flex:1;padding:10px;background:transparent;border:1px solid #333;border-radius:10px;color:#a0a0a0;font-size:13px;cursor:pointer">Batal</button>
          <button id="dk-confirm-yes" style="flex:1;padding:10px;background:#7c3aed;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:500;cursor:pointer">Ya, Lanjutkan</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.getElementById('dk-confirm-yes').onclick = () => { el.remove(); onYes && onYes(); };
    document.getElementById('dk-confirm-no').onclick = () => { el.remove(); onNo && onNo(); };
  }

  function sanitize(str) {
    return String(str || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function tipeColor(tipe) {
    if (tipe === 'Pemasukan') return '#34d399';
    if (tipe === 'Pengeluaran') return '#f87171';
    return '#60a5fa';
  }

  function progressColor(pct, warn = 80) {
    if (pct >= 100) return '#f87171';
    if (pct >= warn) return '#fbbf24';
    return '#34d399';
  }

  function catIcon(kategori) {
    const db = DB.getCategories();
    const c = db.find(x => x.nama === kategori);
    return c?.icon || '📌';
  }

  function catColor(kategori) {
    const db = DB.getCategories();
    const c = db.find(x => x.nama === kategori);
    return c?.warna || '#6B7280';
  }

  return {
    formatRupiah, formatDate, formatMonthYear, today, currentPeriod,
    daysUntil, uid, showToast, showLoading, hideLoading, confirm,
    sanitize, tipeColor, progressColor, catIcon, catColor
  };
})();
