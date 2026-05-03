# 💰 Dompet Ku v3.0

Sistem keuangan pribadi — **Dark Mode, Clean, Mobile First**.

## Stack
- Frontend: HTML + Vanilla JS (no framework)
- Database: JSON di GitHub repo (via GitHub API)
- Hosting: GitHub Pages
- Notifikasi: WhatsApp via Fonnte + GitHub Actions

## Setup

### 1. Fork / Clone repo ini

### 2. Aktifkan GitHub Pages
Settings → Pages → Source: `main` branch, folder `/` (root)

### 3. Buat Personal Access Token
GitHub → Settings → Developer Settings → Personal Access Tokens (Classic)
Scope yang dibutuhkan: `repo` (full)

### 4. Buat file database awal
Buat file `data/db.json` di repo kamu dengan isi:
```json
{}
```
(Akan otomatis diisi saat setup pertama kali)

### 5. Setup WhatsApp (opsional)
Untuk notifikasi otomatis via GitHub Actions:
- Daftar di [fonnte.com](https://fonnte.com)
- Di repo: Settings → Secrets → Actions:
  - `FONNTE_API_KEY` = API key Fonnte
  - `WA_NUMBER` = Nomor HP (format: 628xxx)

### 6. Buka aplikasi
`https://username.github.io/dompet-ku`

Ikuti wizard setup 4 langkah, dan selesai!

## Fitur
- Dashboard dengan hero card aset total
- Multi akun (Bank, Cash, E-wallet, dll) — nama & warna bebas
- Transaksi (Pemasukan / Pengeluaran / Transfer) + filter
- Jatah/Alokasi bulanan dengan sync otomatis dari transaksi
- Utang & Piutang dengan reminder jatuh tempo
- WhatsApp: edit template, jadwal, on/off per jenis notifikasi
- Pengaturan lengkap — semua bisa diubah
- Export JSON & CSV
- Reset & setup ulang dari awal
- Import data dari backup JSON

## Struktur File
```
index.html          ← App utama
css/style.css       ← Design system dark mode
js/defaults.js      ← Data default kategori
js/db.js            ← GitHub API layer
js/utils.js         ← Helper functions
js/whatsapp.js      ← Fonnte integration
js/app.js           ← Core app + routing + transaksi
js/pages.js         ← Semua halaman lainnya
data/db.json        ← Database JSON
.github/
  workflows/wa-notify.yml   ← GitHub Actions scheduler
  scripts/send-wa.js        ← Script notifikasi
```
