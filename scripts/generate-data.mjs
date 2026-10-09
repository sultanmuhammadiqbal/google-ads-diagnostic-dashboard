// Generator data sintetis. SEMUA angka di proyek ini berasal dari skrip ini.
// Seed tetap -> output identik setiap kali dijalankan.
//
// Pemakaian:
//   node scripts/generate-data.mjs                 -> menulis ke public/data/
//   node scripts/generate-data.mjs --out <folder>  -> menulis ke folder lain

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outIdx = process.argv.indexOf('--out');
const OUT_DIR = outIdx > -1 ? resolve(process.argv[outIdx + 1]) : resolve(ROOT, 'public/data');

const SEED = 20260701;
const START_DATE = '2026-07-01';
const DAYS = 90;
const BASELINE_DAYS = 7; // rata-rata biaya harian 7 hari pertama = indeks 100
const SCALE = 0.3; // skala volume (ditentukan generator, bukan dari data nyata)

// ---------- PRNG berseed ----------
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);
function gauss() {
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function poisson(lambda) {
  if (lambda <= 0) return 0;
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= rng();
    } while (p > L);
    return k - 1;
  }
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss()));
}

// ---------- Definisi ----------
const CAMPAIGN_TYPES = [
  { id: 'search', name: 'Search' },
  { id: 'pmax', name: 'Performance Max' },
  { id: 'lokasi', name: 'Lokasi' },
];
const DEVICES = [
  { id: 'mobile', name: 'Mobile' },
  { id: 'desktop', name: 'Desktop' },
  { id: 'tablet', name: 'Tablet' },
];
const CONVERSION_TYPES = [
  { id: 'purchase', name: 'Purchase' },
  { id: 'store_visit', name: 'Kunjungan Toko' },
  { id: 'directions', name: 'Petunjuk Arah' },
  { id: 'add_to_cart', name: 'Add to Cart' },
  { id: 'begin_checkout', name: 'Begin Checkout' },
];

// impr: impresi harian dasar; ctr; cpc: biaya per klik dasar (satuan mentah, dinormalisasi jadi indeks);
// share: porsi impresi per perangkat; mult: pengali tingkat konversi per jenis.
// waste: true = campaign boros (biaya tinggi, Purchase hampir nol).
const CAMPAIGNS = [
  { id: 'search-a', name: 'Campaign Search A', type: 'search', impr: 52000, ctr: 0.045, cpc: 1.0, share: [0.56, 0.36, 0.08], mult: [1.1, 0.8, 0.8, 1.0, 1.0] },
  { id: 'search-b', name: 'Campaign Search B', type: 'search', impr: 38000, ctr: 0.05, cpc: 0.9, share: [0.6, 0.32, 0.08], mult: [0.95, 0.6, 0.6, 1.0, 1.0] },
  { id: 'search-c', name: 'Campaign Search C', type: 'search', impr: 60000, ctr: 0.04, cpc: 1.5, share: [0.5, 0.42, 0.08], mult: [0.02, 0.4, 0.3, 0.45, 0.3], waste: true },
  { id: 'pmax-1', name: 'PMax Produk 1', type: 'pmax', impr: 70000, ctr: 0.03, cpc: 0.8, share: [0.62, 0.3, 0.08], mult: [1.2, 1.0, 0.9, 1.2, 1.1] },
  { id: 'pmax-2', name: 'PMax Produk 2', type: 'pmax', impr: 45000, ctr: 0.032, cpc: 0.85, share: [0.6, 0.32, 0.08], mult: [1.0, 1.1, 1.0, 1.0, 1.0] },
  { id: 'pmax-3', name: 'PMax Produk 3', type: 'pmax', impr: 55000, ctr: 0.028, cpc: 1.3, share: [0.55, 0.38, 0.07], mult: [0.01, 0.2, 0.1, 0.4, 0.25], waste: true },
  { id: 'lokasi-1', name: 'Lokasi Cabang 1', type: 'lokasi', impr: 30000, ctr: 0.06, cpc: 0.7, share: [0.82, 0.1, 0.08], mult: [0.15, 2.2, 2.4, 0.1, 0.05] },
  { id: 'lokasi-2', name: 'Lokasi Cabang 2', type: 'lokasi', impr: 24000, ctr: 0.055, cpc: 0.75, share: [0.85, 0.08, 0.07], mult: [0.1, 1.8, 2.0, 0.05, 0.03] },
];

// Faktor per perangkat: urutan mobile, desktop, tablet.
const DEVICE_CTR = [1.0, 1.0, 0.9];
const DEVICE_CPC = [1.0, 1.15, 0.85];
// Tingkat konversi per klik: [purchase, store_visit, directions, add_to_cart, begin_checkout]
// Pola kasus: Kunjungan Toko dan Petunjuk Arah dominan dari Mobile, jauh melebihi Purchase.
const BASE_CVR = [
  [0.012, 0.05, 0.035, 0.06, 0.03], // mobile
  [0.018, 0.004, 0.002, 0.07, 0.042], // desktop
  [0.01, 0.015, 0.01, 0.05, 0.025], // tablet
];

// Variasi hari kerja (indeks 0 = Minggu).
const WEEKDAY_CLICK = [0.78, 1.05, 1.05, 1.02, 1.0, 1.04, 0.88];
const WEEKDAY_OFFLINE = [1.1, 1.0, 1.0, 1.0, 1.0, 1.05, 1.25];

function dayInfo(d) {
  const t = Date.UTC(2026, 6, 1) + d * 86400000;
  const date = new Date(t);
  return { iso: date.toISOString().slice(0, 10), weekday: date.getUTCDay() };
}

// ---------- Bangun baris harian ----------
const rawRows = []; // [d, campaignIdx, deviceIdx, rawCost, clicks, impr, p, s, dir, atc, bc]
for (let d = 0; d < DAYS; d++) {
  const { weekday } = dayInfo(d);
  const trend = 1 + (0.12 * d) / (DAYS - 1);
  const promo = d >= 55 && d <= 62;
  for (let ci = 0; ci < CAMPAIGNS.length; ci++) {
    const c = CAMPAIGNS[ci];
    const costTrend = c.waste ? 1 + (0.25 * d) / (DAYS - 1) : 1;
    for (let vi = 0; vi < DEVICES.length; vi++) {
      const impr = Math.round(
        c.impr * SCALE * c.share[vi] * WEEKDAY_CLICK[weekday] * trend * (promo ? 1.18 : 1) * Math.exp(0.06 * gauss()),
      );
      const ctr = c.ctr * DEVICE_CTR[vi] * Math.exp(0.05 * gauss());
      const clicks = poisson(impr * ctr);
      const cost = clicks * c.cpc * DEVICE_CPC[vi] * costTrend * Math.exp(0.05 * gauss());
      const convNoise = Math.exp(0.1 * gauss());
      const conv = BASE_CVR[vi].map((rate, k) => {
        let lambda = clicks * rate * c.mult[k] * convNoise;
        if (k === 1 || k === 2) lambda *= WEEKDAY_OFFLINE[weekday];
        if (k === 0 && promo) lambda *= 1.15;
        return poisson(lambda);
      });
      rawRows.push([d, ci, vi, cost, clicks, impr, ...conv]);
    }
  }
}

// Normalisasi biaya: rata-rata biaya harian akun pada BASELINE_DAYS hari pertama = 100.
let baselineCost = 0;
for (const r of rawRows) if (r[0] < BASELINE_DAYS) baselineCost += r[3];
baselineCost /= BASELINE_DAYS;

const rows = rawRows.map((r) => [r[0], r[1], r[2], Math.round((r[3] / baselineCost) * 100 * 1000) / 1000, ...r.slice(4)]);

// ---------- Log keputusan (fiktif) ----------
const BID_CUT_THRESHOLD = 1.5;
const decisions = [
  {
    date: '2026-08-12',
    decision: 'Tambah negative keyword pada Campaign Search B',
    reason: 'Istilah pencarian yang memuat Brand A dan kata "bekas" menghabiskan klik tanpa Purchase maupun Add to Cart.',
    threshold: 'Minimal 200 klik dan 0 Purchase dalam 14 hari',
    status: 'Dilakukan',
    expected: 'Biaya terbuang pada campaign ini turun sekitar 5%.',
  },
  {
    date: '2026-09-29',
    decision: 'Rekomendasi bid cut Desktop dibatalkan',
    reason:
      'CPA Desktop tampak jauh di atas Mobile hanya pada tampilan "Semua konversi", karena Kunjungan Toko dan Petunjuk Arah hampir seluruhnya tercatat dari Mobile. Dengan Purchase saja, selisihnya hilang.',
    threshold: `CPA Desktop lebih dari ${String(BID_CUT_THRESHOLD).replace('.', ',')}× CPA Mobile pada konversi yang sebanding`,
    status: 'Dibatalkan',
    expected: 'Tidak ada perubahan bid. Menghindari kehilangan Purchase dari Desktop.',
    ref: 'diagnosis',
  },
  {
    date: '2026-09-29',
    decision: 'Jeda Campaign Search C',
    reason: 'Biaya tertinggi di antara campaign Search, sedangkan Purchase hampir nol selama seluruh periode.',
    threshold: 'CPA Purchase lebih dari 3× rata-rata akun selama 30 hari berturut-turut',
    status: 'Dilakukan',
    expected: 'Indeks biaya akun turun sekitar 10% dengan Purchase hampir tidak berubah.',
  },
  {
    date: '2026-09-30',
    decision: 'Pindahkan 15% budget PMax Produk 3 ke PMax Produk 1',
    reason: 'PMax Produk 3 menghabiskan budget dengan Purchase hampir nol, sedangkan PMax Produk 1 punya CPA Purchase jauh lebih rendah.',
    threshold: 'Selisih CPA Purchase antar campaign PMax lebih dari 2×',
    status: 'Dilakukan',
    expected: 'Purchase naik sekitar 3% pada biaya yang sama.',
  },
  {
    date: '2026-10-01',
    decision: 'Laporan CPA dipisah per jenis konversi',
    reason: 'Perbandingan CPA antar perangkat harus memakai jenis konversi yang sama; Purchase dilaporkan terpisah dari Kunjungan Toko dan Petunjuk Arah.',
    threshold: 'Setiap rekomendasi bid wajib diuji pada tampilan Purchase saja',
    status: 'Dilakukan',
    expected: 'Rekomendasi bid berikutnya tidak lagi bias oleh konversi toko.',
    ref: 'diagnosis',
  },
  {
    date: '2026-10-02',
    decision: 'Pertahankan budget Lokasi Cabang 1 dan 2',
    reason: 'Kedua campaign ini dinilai dari Kunjungan Toko dan Petunjuk Arah, bukan Purchase. Purchase rendah di sini memang diharapkan.',
    threshold: 'Biaya per Kunjungan Toko tidak naik lebih dari 20% dari periode sebelumnya',
    status: 'Dilakukan',
    expected: 'Jumlah Kunjungan Toko stabil.',
  },
];

// ---------- Tulis berkas ----------
const meta = {
  simulation: true,
  note: 'Seluruh angka fiktif dan dihasilkan oleh scripts/generate-data.mjs.',
  seed: SEED,
  startDate: START_DATE,
  days: DAYS,
  baselineDays: BASELINE_DAYS,
  bidCutThresholdRatio: BID_CUT_THRESHOLD,
  proposedBidCutPercent: 20,
  campaignTypes: CAMPAIGN_TYPES,
  campaigns: CAMPAIGNS.map((c) => ({ id: c.id, name: c.name, type: c.type })),
  devices: DEVICES,
  conversionTypes: CONVERSION_TYPES,
};

const daily = {
  columns: ['d', 'c', 'v', 'cost', 'clicks', 'impressions', ...CONVERSION_TYPES.map((t) => t.id)],
  rows,
};

const dailyJson = '{\n"columns":' + JSON.stringify(daily.columns) + ',\n"rows":[\n' + rows.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n}\n';

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(resolve(OUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
writeFileSync(resolve(OUT_DIR, 'daily.json'), dailyJson);
writeFileSync(resolve(OUT_DIR, 'decisions.json'), JSON.stringify(decisions, null, 2) + '\n');

console.log(`Data sintetis ditulis ke ${OUT_DIR}`);
console.log(`  baris harian: ${rows.length} (${DAYS} hari × ${CAMPAIGNS.length} campaign × ${DEVICES.length} perangkat)`);
