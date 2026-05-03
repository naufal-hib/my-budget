const DEFAULT_CATEGORIES = [
  { id: 'CAT001', nama: 'Makanan & Minuman', tipe: 'Pengeluaran Dasar', icon: '🍔', warna: '#EF4444', status: 'Aktif' },
  { id: 'CAT002', nama: 'Sewa/Cicilan Rumah', tipe: 'Pengeluaran Dasar', icon: '🏠', warna: '#DC2626', status: 'Aktif' },
  { id: 'CAT003', nama: 'Listrik & Air', tipe: 'Pengeluaran Dasar', icon: '⚡', warna: '#F97316', status: 'Aktif' },
  { id: 'CAT004', nama: 'Pulsa & Internet', tipe: 'Pengeluaran Dasar', icon: '📱', warna: '#F59E0B', status: 'Aktif' },
  { id: 'CAT005', nama: 'Transportasi', tipe: 'Pengeluaran Dasar', icon: '🚗', warna: '#EAB308', status: 'Aktif' },
  { id: 'CAT006', nama: 'Kesehatan', tipe: 'Pengeluaran Dasar', icon: '💊', warna: '#EC4899', status: 'Aktif' },
  { id: 'CAT007', nama: 'Pakaian', tipe: 'Pengeluaran Dasar', icon: '👕', warna: '#A855F7', status: 'Aktif' },
  { id: 'CAT008', nama: 'Hiburan', tipe: 'Pengeluaran Lain', icon: '🎮', warna: '#8B5CF6', status: 'Aktif' },
  { id: 'CAT009', nama: 'Hadiah', tipe: 'Pengeluaran Lain', icon: '🎁', warna: '#6366F1', status: 'Aktif' },
  { id: 'CAT010', nama: 'Liburan', tipe: 'Pengeluaran Lain', icon: '🏖️', warna: '#3B82F6', status: 'Aktif' },
  { id: 'CAT011', nama: 'Pendidikan', tipe: 'Pengeluaran Lain', icon: '📚', warna: '#0EA5E9', status: 'Aktif' },
  { id: 'CAT012', nama: 'Belanja Online', tipe: 'Pengeluaran Lain', icon: '🛍️', warna: '#06B6D4', status: 'Aktif' },
  { id: 'CAT013', nama: 'Kafe & Nongkrong', tipe: 'Pengeluaran Lain', icon: '☕', warna: '#14B8A6', status: 'Aktif' },
  { id: 'CAT014', nama: 'Sodaqoh', tipe: 'Pengeluaran Lain', icon: '💚', warna: '#10B981', status: 'Aktif' },
  { id: 'CAT015', nama: 'Emergency', tipe: 'Pengeluaran Lain', icon: '🚨', warna: '#F43F5E', status: 'Aktif' },
  { id: 'CAT016', nama: 'Gaji', tipe: 'Pemasukan', icon: '💼', warna: '#10B981', status: 'Aktif' },
  { id: 'CAT017', nama: 'Bonus', tipe: 'Pemasukan', icon: '💰', warna: '#059669', status: 'Aktif' },
  { id: 'CAT018', nama: 'Investasi', tipe: 'Pemasukan', icon: '📈', warna: '#047857', status: 'Aktif' },
  { id: 'CAT019', nama: 'Hadiah/THR', tipe: 'Pemasukan', icon: '🎁', warna: '#065F46', status: 'Aktif' },
  { id: 'CAT020', nama: 'Lain-lain', tipe: 'Pemasukan', icon: '💵', warna: '#064E3B', status: 'Aktif' },
  { id: 'CAT021', nama: 'Bayar Utang', tipe: 'Pengeluaran Lain', icon: '💳', warna: '#6B7280', status: 'Aktif' },
  { id: 'CAT022', nama: 'Terima Piutang', tipe: 'Pemasukan', icon: '🤝', warna: '#374151', status: 'Aktif' }
];

const DEFAULT_ALLOCATIONS_TEMPLATE = [
  { nama: 'Pengeluaran Dasar', alokasi: 0, kategoriInclude: ['Makanan & Minuman','Sewa/Cicilan Rumah','Listrik & Air','Pulsa & Internet','Transportasi','Kesehatan','Pakaian'], warna: '#EF4444', warningLevel: 80 },
  { nama: 'Hiburan', alokasi: 0, kategoriInclude: ['Hiburan','Kafe & Nongkrong','Liburan'], warna: '#8B5CF6', warningLevel: 80 },
  { nama: 'Sodaqoh', alokasi: 0, kategoriInclude: ['Sodaqoh','Hadiah'], warna: '#10B981', warningLevel: 50 },
  { nama: 'Dana Darurat', alokasi: 0, kategoriInclude: ['Emergency'], warna: '#3B82F6', warningLevel: 80 }
];
