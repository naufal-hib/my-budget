// ============================================================
// DOMPET KU v3.0 — WHATSAPP MODULE (Fonnte)
// ============================================================

const WA = (() => {

  async function send(message, number) {
    const cfg = DB.getConfig().whatsapp;
    const apiKey = cfg?.apiKey;
    const target = number || cfg?.number;
    if (!apiKey || !target) return { ok: false, error: 'API key atau nomor belum diisi' };
    try {
      const r = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, message, countryCode: '62' })
      });
      const j = await r.json();
      return j.status ? { ok: true } : { ok: false, error: j.reason || 'Gagal kirim' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function buildMessage(templateKey, vars = {}) {
    const cfg = DB.getConfig().whatsapp;
    let tpl = cfg?.templates?.[templateKey] || '';
    Object.entries(vars).forEach(([k, v]) => {
      tpl = tpl.replaceAll(`{${k}}`, v);
    });
    return tpl;
  }

  function getMotivasi(saldo) {
    if (saldo >= 0) {
      const pos = ['Alhamdulillah, keuangan hari ini positif! 🌟', 'Bagus! Tetap konsisten ya 💪', 'Luar biasa! Terus jaga pengeluaran 🎯'];
      return pos[Math.floor(Math.random() * pos.length)];
    }
    const neg = ['Tenang, besok bisa lebih baik! 🙏', 'Evaluasi pengeluaran hari ini ya 📝', 'Yuk lebih bijak besok! 💡'];
    return neg[Math.floor(Math.random() * neg.length)];
  }

  async function sendDaily() {
    const period = DB.getMeta().activePeriod;
    const todayStr = Utils.today();
    const trxToday = DB.getTransactions().filter(t => t.tanggal === todayStr);
    const pemasukan = trxToday.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
    const pengeluaran = trxToday.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);
    const saldo = pemasukan - pengeluaran;

    const katMap = {};
    trxToday.filter(t => t.tipe === 'Pengeluaran').forEach(t => {
      katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal;
    });
    const top = Object.entries(katMap).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map((e, i) => `${i + 1}. ${e[0]}: ${Utils.formatRupiah(e[1])}`).join('\n') || 'Tidak ada';

    const msg = buildMessage('daily', {
      tanggal: Utils.formatDate(todayStr, { long: true }),
      pemasukan: Utils.formatRupiah(pemasukan),
      pengeluaran: Utils.formatRupiah(pengeluaran),
      saldo: Utils.formatRupiah(saldo),
      top_kategori: top,
      pesan_motivasi: getMotivasi(saldo)
    });
    return await send(msg);
  }

  async function sendWeekly() {
    const now = new Date();
    const trxWeek = DB.getTransactions().filter(t => {
      const d = new Date(t.tanggal + 'T00:00:00');
      return (now - d) <= 7 * 86400000;
    });
    const pemasukan = trxWeek.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
    const pengeluaran = trxWeek.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);

    const katMap = {};
    trxWeek.filter(t => t.tipe === 'Pengeluaran').forEach(t => {
      katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal;
    });
    const top = Object.entries(katMap).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map((e, i) => `${i + 1}. ${e[0]}: ${Utils.formatRupiah(e[1])}`).join('\n') || 'Tidak ada';

    const weekNum = Math.ceil(now.getDate() / 7);
    const bulan = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const msg = buildMessage('weekly', {
      minggu_ke: weekNum, bulan,
      pemasukan: Utils.formatRupiah(pemasukan),
      pengeluaran: Utils.formatRupiah(pengeluaran),
      saldo: Utils.formatRupiah(pemasukan - pengeluaran),
      top_kategori: top,
      pesan_motivasi: getMotivasi(pemasukan - pengeluaran)
    });
    return await send(msg);
  }

  async function sendMonthly() {
    const period = DB.getMeta().activePeriod;
    const trx = DB.getTransactions().filter(t => t.tanggal?.startsWith(period));
    const pemasukan = trx.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
    const pengeluaran = trx.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);
    const savingRate = pemasukan > 0 ? Math.round(((pemasukan - pengeluaran) / pemasukan) * 100) : 0;

    const allocLines = DB.getAllocations()
      .filter(a => a.bulan?.startsWith(period) || !a.bulan)
      .map(a => `• ${a.nama}: ${Utils.formatRupiah(a.terpakai)} / ${Utils.formatRupiah(a.alokasi)} (${a.progress}%)`)
      .join('\n') || 'Belum ada jatah';

    const msg = buildMessage('monthly', {
      periode: Utils.formatMonthYear(period),
      pemasukan: Utils.formatRupiah(pemasukan),
      pengeluaran: Utils.formatRupiah(pengeluaran),
      saving_rate: savingRate,
      detail_jatah: allocLines,
      pesan_motivasi: getMotivasi(pemasukan - pengeluaran)
    });
    return await send(msg);
  }

  async function sendBudgetWarning(alloc) {
    const msg = buildMessage('budgetWarning', {
      nama_jatah: alloc.nama,
      persen: alloc.progress,
      alokasi: Utils.formatRupiah(alloc.alokasi),
      terpakai: Utils.formatRupiah(alloc.terpakai),
      sisa: Utils.formatRupiah(alloc.sisa)
    });
    return await send(msg);
  }

  async function sendDebtReminder(debt, daysLeft) {
    const msg = buildMessage('debtReminder', {
      nama_pihak: debt.namaPihak,
      hari: daysLeft,
      jatuh_tempo: Utils.formatDate(debt.tanggalJatuhTempo),
      sisa: Utils.formatRupiah(debt.sisa)
    });
    return await send(msg);
  }

  async function sendCustom(msg, number) {
    return await send(msg, number);
  }

  async function checkReminders() {
    const cfg = DB.getConfig().whatsapp;
    if (!cfg?.enabled) return;

    if (cfg.schedule?.budgetWarningEnabled) {
      const threshold = cfg.schedule.budgetWarningThreshold || 80;
      DB.getAllocations().forEach(async a => {
        if (a.progress >= threshold && a.progress < 100) {
          await sendBudgetWarning(a);
        }
      });
    }

    if (cfg.schedule?.debtReminderEnabled) {
      const days = cfg.schedule.debtReminderDays || [7, 3, 1];
      DB.getDebts().filter(d => d.status === 'Aktif' && d.tipe === 'Utang').forEach(async d => {
        const left = Utils.daysUntil(d.tanggalJatuhTempo);
        if (days.includes(left)) await sendDebtReminder(d, left);
      });
    }
  }

  return { send, sendDaily, sendWeekly, sendMonthly, sendBudgetWarning, sendDebtReminder, sendCustom, buildMessage, checkReminders };
})();
