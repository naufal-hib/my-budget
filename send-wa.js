// .github/scripts/send-wa.js
// Dijalankan oleh GitHub Actions untuk kirim notifikasi WhatsApp otomatis

const https = require('https');
const type = process.argv[2] || 'auto';
const trigger = process.argv[3] || 'schedule';

const FONNTE_KEY = process.env.FONNTE_API_KEY;
const WA_NUMBER  = process.env.WA_NUMBER;
const GH_TOKEN   = process.env.GITHUB_TOKEN;
const REPO       = process.env.REPO;

if (!FONNTE_KEY || !WA_NUMBER) {
  console.log('⚠️  FONNTE_API_KEY atau WA_NUMBER belum di-set di Secrets.');
  process.exit(0);
}

// ── Fetch DB from GitHub ──────────────────────────────────
async function fetchDB() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}/contents/data/db.json`,
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'User-Agent': 'DompetKu-Action',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    https.get(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const decoded = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
          resolve(decoded);
        } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ── Send via Fonnte ───────────────────────────────────────
async function sendWA(message) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ target: WA_NUMBER, message, countryCode: '62' });
    const options = {
      hostname: 'api.fonnte.com',
      path: '/send',
      method: 'POST',
      headers: {
        'Authorization': FONNTE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { resolve({ status: false }); }
      });
    });
    req.on('error', e => { console.error('Fonnte error:', e); resolve({ status: false }); });
    req.write(payload);
    req.end();
  });
}

// ── Format helpers ────────────────────────────────────────
function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
}

function today() { return new Date().toISOString().slice(0, 10); }
function currentPeriod() { return new Date().toISOString().slice(0, 7); }

function buildMessage(template, vars) {
  let msg = template;
  Object.entries(vars).forEach(([k, v]) => { msg = msg.replaceAll(`{${k}}`, v); });
  return msg;
}

// ── Determine what to send ────────────────────────────────
async function main() {
  console.log(`🚀 Dompet Ku Notifikasi | type: ${type} | trigger: ${trigger}`);

  let db;
  try { db = await fetchDB(); }
  catch(e) { console.error('Gagal fetch DB:', e.message); process.exit(1); }

  const cfg = db.config?.whatsapp;
  const sch = cfg?.schedule || {};
  const tpls = cfg?.templates || {};
  const now = new Date();
  const hour = now.getUTCHours() + 7; // WIB
  const dayOfWeek = now.getDay();
  const dateOfMonth = now.getDate();
  const period = db.meta?.activePeriod || currentPeriod();
  const trx = db.transactions || [];
  const allocs = db.allocations || [];
  const debts = db.debts || [];

  const sent = [];

  // ── Daily ──
  const shouldDaily = type === 'daily' || (type === 'auto' && sch.dailyEnabled && trigger === 'schedule');
  if (shouldDaily) {
    const todayStr = today();
    const todayTrx = trx.filter(t => t.tanggal === todayStr);
    const pemasukan = todayTrx.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
    const pengeluaran = todayTrx.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);
    const katMap = {};
    todayTrx.filter(t => t.tipe === 'Pengeluaran').forEach(t => katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal);
    const top = Object.entries(katMap).sort((a,b) => b[1]-a[1]).slice(0,3).map((e,i) => `${i+1}. ${e[0]}: ${formatRupiah(e[1])}`).join('\n') || 'Tidak ada pengeluaran';
    const saldo = pemasukan - pengeluaran;

    const msg = buildMessage(tpls.daily || '📊 *RINGKASAN HARIAN*\n{tanggal}\n\n💰 Masuk: {pemasukan}\n💸 Keluar: {pengeluaran}\n💵 Saldo: {saldo}\n\nTop:\n{top_kategori}\n\n{pesan_motivasi}', {
      tanggal: now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
      pemasukan: formatRupiah(pemasukan), pengeluaran: formatRupiah(pengeluaran), saldo: formatRupiah(saldo),
      top_kategori: top, pesan_motivasi: saldo >= 0 ? 'Alhamdulillah! 🌟' : 'Semangat besok! 💪'
    });
    const r = await sendWA(msg);
    console.log('Daily:', r.status ? '✓ Terkirim' : '✗ Gagal', r.reason || '');
    sent.push('daily');
  }

  // ── Weekly ──
  const shouldWeekly = type === 'weekly' || (type === 'auto' && sch.weeklyEnabled && dayOfWeek === parseInt(sch.weeklyDay || 1));
  if (shouldWeekly) {
    const sevenDaysAgo = new Date(now - 7 * 86400000).toISOString().slice(0,10);
    const weekTrx = trx.filter(t => t.tanggal >= sevenDaysAgo);
    const pemasukan = weekTrx.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
    const pengeluaran = weekTrx.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);
    const katMap = {};
    weekTrx.filter(t => t.tipe === 'Pengeluaran').forEach(t => katMap[t.kategori] = (katMap[t.kategori] || 0) + t.nominal);
    const top = Object.entries(katMap).sort((a,b) => b[1]-a[1]).slice(0,3).map((e,i) => `${i+1}. ${e[0]}: ${formatRupiah(e[1])}`).join('\n') || 'Tidak ada';
    const weekNum = Math.ceil(now.getDate() / 7);

    const msg = buildMessage(tpls.weekly || '📈 *RINGKASAN MINGGUAN*\nMinggu {minggu_ke}, {bulan}\n\n💰 Masuk: {pemasukan}\n💸 Keluar: {pengeluaran}\n💵 Saldo: {saldo}\n\nTop:\n{top_kategori}\n\n{pesan_motivasi}', {
      minggu_ke: weekNum, bulan: now.toLocaleDateString('id-ID', {month:'long', year:'numeric'}),
      pemasukan: formatRupiah(pemasukan), pengeluaran: formatRupiah(pengeluaran),
      saldo: formatRupiah(pemasukan - pengeluaran), top_kategori: top,
      pesan_motivasi: pemasukan >= pengeluaran ? 'Minggu yang bagus! 🎯' : 'Evaluasi minggu ini ya! 📝'
    });
    const r = await sendWA(msg);
    console.log('Weekly:', r.status ? '✓ Terkirim' : '✗ Gagal');
    sent.push('weekly');
  }

  // ── Monthly ──
  const shouldMonthly = type === 'monthly' || (type === 'auto' && sch.monthlyEnabled && dateOfMonth === 1);
  if (shouldMonthly) {
    const lastPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const monthTrx = trx.filter(t => t.tanggal?.startsWith(lastPeriod));
    const pemasukan = monthTrx.filter(t => t.tipe === 'Pemasukan').reduce((s, t) => s + t.nominal, 0);
    const pengeluaran = monthTrx.filter(t => t.tipe === 'Pengeluaran').reduce((s, t) => s + t.nominal, 0);
    const savingRate = pemasukan > 0 ? Math.round(((pemasukan - pengeluaran) / pemasukan) * 100) : 0;
    const allocDetail = allocs.filter(a => a.bulan?.startsWith(lastPeriod)).map(a => `• ${a.nama}: ${a.progress || 0}%`).join('\n') || 'Tidak ada jatah';

    const msg = buildMessage(tpls.monthly || '📋 *LAPORAN BULANAN*\nPeriode: {periode}\n\n💰 Masuk: {pemasukan}\n💸 Keluar: {pengeluaran}\n💵 Saving Rate: {saving_rate}%\n\n📊 Per Jatah:\n{detail_jatah}\n\n{pesan_motivasi}', {
      periode: new Date(lastPeriod + '-01').toLocaleDateString('id-ID', {month:'long', year:'numeric'}),
      pemasukan: formatRupiah(pemasukan), pengeluaran: formatRupiah(pengeluaran),
      saving_rate: savingRate, detail_jatah: allocDetail,
      pesan_motivasi: savingRate >= 20 ? '🏆 Excellent saving rate!' : savingRate >= 0 ? '👍 Terus ditingkatkan!' : '📉 Perlu evaluasi budget'
    });
    const r = await sendWA(msg);
    console.log('Monthly:', r.status ? '✓ Terkirim' : '✗ Gagal');
    sent.push('monthly');
  }

  // ── Debt Reminder ──
  const shouldDebt = type === 'debtcheck' || type === 'auto';
  if (shouldDebt && sch.debtReminderEnabled) {
    const reminderDays = sch.debtReminderDays || [7, 3, 1];
    for (const debt of debts.filter(d => d.status === 'Aktif' && d.tipe === 'Utang')) {
      if (!debt.tanggalJatuhTempo) continue;
      const target = new Date(debt.tanggalJatuhTempo + 'T00:00:00');
      const daysLeft = Math.round((target - now) / 86400000);
      if (reminderDays.includes(daysLeft)) {
        const msg = buildMessage(tpls.debtReminder || '🔔 *REMINDER UTANG*\n\nHai! Utang ke *{nama_pihak}* jatuh tempo {hari} hari lagi.\n\n📅 Jatuh Tempo: {jatuh_tempo}\n💰 Sisa: {sisa}\n\nJangan lupa ya! 💪', {
          nama_pihak: debt.namaPihak, hari: daysLeft,
          jatuh_tempo: new Date(debt.tanggalJatuhTempo + 'T00:00:00').toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'}),
          sisa: formatRupiah(debt.sisa)
        });
        const r = await sendWA(msg);
        console.log(`Debt reminder (${debt.namaPihak}, H-${daysLeft}):`, r.status ? '✓' : '✗');
      }
    }
  }

  if (sent.length === 0 && type === 'auto') {
    console.log('ℹ️  Tidak ada notifikasi yang perlu dikirim saat ini.');
  }

  console.log('✅ Selesai');
}

main().catch(e => { console.error('Fatal error:', e); process.exit(1); });
