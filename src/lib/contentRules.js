// Aturan bentuk untuk berkas content/*.json. Dipakai oleh skrip build (scripts/check-content.mjs)
// dan oleh komponen, jadi satu sumber kebenaran. Tidak ada teks narasi di sini.

export const PLACEHOLDER = 'belum diisi';
export const isFilled = (v) => typeof v === 'string' && v.trim() !== '';

export const TOUR_STEPS = 6;
// Elemen yang bisa disorot tur (atribut data-tour di tampilan Diagnosis).
export const TOUR_TARGETS = ['grafik-cpa', 'kartu-rekomendasi', 'tabel-kontribusi', 'toggle-konversi', 'paragraf-log'];
export const TOUR_VIEWS = ['all', 'purchase'];
export const DECISION_FIELDS = ['yangSayaLihat', 'hipotesis', 'yangSayaCek', 'keputusan', 'yangSayaPantau'];
export const MAX_REAL_RESULTS = 3;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string';

function unknownKeys(obj, allowed, where, errors) {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) errors.push(`${where}: field tidak dikenal "${k}"`);
}

export function validateTour(data) {
  const errors = [];
  if (!Array.isArray(data)) return ['tour.json: harus berupa daftar (array)'];
  if (data.length !== TOUR_STEPS) errors.push(`tour.json: harus ${TOUR_STEPS} langkah, ditemukan ${data.length}`);
  data.forEach((s, i) => {
    const w = `tour.json langkah ${i + 1}`;
    if (!isObj(s)) return errors.push(`${w}: harus berupa objek`);
    unknownKeys(s, ['target', 'judul', 'teks', 'tampilan', 'topik'], w, errors);
    if (!TOUR_TARGETS.includes(s.target)) errors.push(`${w}: target "${s.target}" tidak valid (pilihan: ${TOUR_TARGETS.join(', ')})`);
    if (!isStr(s.judul)) errors.push(`${w}: judul harus teks (boleh kosong)`);
    if (!isStr(s.teks)) errors.push(`${w}: teks harus teks (boleh kosong)`);
    if (s.tampilan !== undefined && !TOUR_VIEWS.includes(s.tampilan)) errors.push(`${w}: tampilan harus ${TOUR_VIEWS.join(' atau ')}`);
    if (s.topik !== undefined && !isStr(s.topik)) errors.push(`${w}: topik harus teks`);
  });
  return errors;
}

export function validateDecisions(data, logIds) {
  const errors = [];
  if (!Array.isArray(data)) return ['decisions.json: harus berupa daftar (array)'];
  const seen = new Set();
  data.forEach((d, i) => {
    const w = `decisions.json entri ${i + 1}`;
    if (!isObj(d)) return errors.push(`${w}: harus berupa objek`);
    unknownKeys(d, ['logId', ...DECISION_FIELDS], w, errors);
    if (!isStr(d.logId) || !d.logId) return errors.push(`${w}: logId wajib`);
    if (seen.has(d.logId)) errors.push(`${w}: logId "${d.logId}" ganda`);
    seen.add(d.logId);
    if (logIds && !logIds.includes(d.logId)) errors.push(`${w}: logId "${d.logId}" tidak ada di Log keputusan`);
    for (const f of DECISION_FIELDS) if (!isStr(d[f])) errors.push(`${w}: ${f} harus teks (boleh kosong)`);
  });
  return errors;
}

export function validateSkills(data) {
  const errors = [];
  if (!Array.isArray(data)) return ['skills.json: harus berupa daftar (array)'];
  data.forEach((r, i) => {
    const w = `skills.json baris ${i + 1}`;
    if (!isObj(r)) return errors.push(`${w}: harus berupa objek`);
    unknownKeys(r, ['fitur', 'kemampuan', 'penggunaan'], w, errors);
    for (const f of ['fitur', 'kemampuan', 'penggunaan']) if (!isStr(r[f])) errors.push(`${w}: ${f} harus teks (boleh kosong)`);
  });
  return errors;
}

// Teks yang berbentuk mata uang: simbol, kode, satuan, atau angka dengan pemisah ribuan.
const CURRENCY_PATTERNS = [
  /[$€£¥₹]/,
  /\b(rp|idr|usd|sgd|eur|aud)\b/i,
  /\bus\$/i,
  /\d\s*(juta|jt|ribu|rb|miliar|milyar|triliun|k)\b/i,
  /\d{1,3}([.,]\d{3}){1,}(?!\d)/,
];
export const looksLikeCurrency = (text) => CURRENCY_PATTERNS.some((re) => re.test(text));

function validDate(iso, today) {
  if (!isStr(iso) || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'format harus YYYY-MM-DD';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return 'tanggal tidak valid';
  if (iso > today) return 'tanggal tidak boleh di masa depan';
  return null;
}

const finite = (n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1000;

// Hasil nyata: maksimal tiga angka, persen atau rentang persen. Bukan Rupiah.
export function validateRealResults(data, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  if (!Array.isArray(data)) return ['real-results.json: harus berupa daftar (array); kosongkan dengan []'];
  if (data.length > MAX_REAL_RESULTS) errors.push(`real-results.json: maksimal ${MAX_REAL_RESULTS} angka, ditemukan ${data.length}`);
  data.forEach((r, i) => {
    const w = `real-results.json angka ${i + 1}`;
    if (!isObj(r)) return errors.push(`${w}: harus berupa objek`);
    unknownKeys(r, ['tipe', 'nilai', 'dari', 'sampai', 'metrik', 'sumber', 'tanggalPengambilan'], w, errors);
    if (r.tipe === 'persen') {
      if (!finite(r.nilai)) errors.push(`${w}: nilai harus angka persen`);
      if (r.dari !== undefined || r.sampai !== undefined) errors.push(`${w}: tipe persen hanya memakai nilai`);
    } else if (r.tipe === 'rentang') {
      if (!finite(r.dari) || !finite(r.sampai)) errors.push(`${w}: dari dan sampai harus angka persen`);
      else if (r.dari > r.sampai) errors.push(`${w}: dari tidak boleh lebih besar dari sampai`);
      if (r.nilai !== undefined) errors.push(`${w}: tipe rentang memakai dari dan sampai`);
    } else {
      errors.push(`${w}: tipe harus "persen" atau "rentang"`);
    }
    for (const f of ['metrik', 'sumber']) if (!isStr(r[f]) || !r[f].trim()) errors.push(`${w}: ${f} wajib diisi`);
    if (r.tanggalPengambilan === undefined || r.tanggalPengambilan === '') errors.push(`${w}: tanggalPengambilan wajib diisi`);
    else {
      const problem = validDate(r.tanggalPengambilan, today);
      if (problem) errors.push(`${w}: tanggalPengambilan ${problem}`);
    }
    for (const [k, v] of Object.entries(r)) {
      if (isStr(v) && looksLikeCurrency(v)) errors.push(`${w}: ${k} berbentuk mata uang`);
    }
  });
  return errors;
}
