// Pemindai kebocoran data nyata. Memeriksa berkas proyek DAN riwayat git.
//
// Daftar istilah sensitif (nama perusahaan, brand asli, cabang toko, ID akun) sengaja TIDAK disimpan
// di proyek ini. Berikan lewat berkas di luar repositori atau lewat variabel lingkungan:
//
//   node scripts/scan-sensitive.mjs --terms ~/istilah-sensitif.txt     (satu istilah per baris)
//   SENSITIVE_TERMS="istilah1,istilah2" node scripts/scan-sensitive.mjs
//
// Tanpa daftar istilah, hanya pola umum yang diperiksa (format ID akun iklan, berkas ekspor/gambar).

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const BAD_EXT = new Set(['.csv', '.tsv', '.xls', '.xlsx', '.ods', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.heic', '.pdf', '.zip']);
// Pola umum: ID akun Google Ads (tiga-tiga-empat digit dipisah tanda hubung), resource name API, alamat surel.
const PATTERNS = [
  { name: 'ID akun iklan (###-###-####)', re: /\b\d{3}-\d{3}-\d{4}\b/ },
  { name: 'resource name API (customers/ID)', re: /customers\/\d{6,}/ },
  { name: 'alamat surel', re: /[\w.+-]+@[\w-]+\.[\w.-]+/, filesOnly: true },
];

const termsIdx = process.argv.indexOf('--terms');
let terms = [];
if (termsIdx > -1) {
  const p = process.argv[termsIdx + 1].replace(/^~(?=\/|$)/, homedir());
  terms = readFileSync(resolve(p), 'utf8').split('\n');
} else if (process.env.SENSITIVE_TERMS) {
  terms = process.env.SENSITIVE_TERMS.split(',');
}
terms = terms.map((t) => t.trim()).filter(Boolean);
const termRes = terms.map((t) => ({ term: t, re: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }));

const findings = [];
const add = (where, what) => findings.push(`${where}: ${what}`);

function scanText(where, text, filesOnly) {
  for (const { re } of termRes) if (re.test(text)) add(where, 'memuat istilah sensitif dari daftar');
  for (const p of PATTERNS) {
    if (p.filesOnly && !filesOnly) continue;
    if (p.re.test(text)) add(where, `cocok pola ${p.name}`);
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = resolve(dir, name);
    const rel = relative(ROOT, full);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (BAD_EXT.has(extname(name).toLowerCase())) add(rel, 'berkas ekspor/gambar/arsip tidak diizinkan');
    // Nama berkas juga diperiksa.
    for (const { re } of termRes) if (re.test(rel)) add(rel, 'nama berkas memuat istilah sensitif');
    if (name === 'package-lock.json') continue; // hash integritas dapat menyerupai pola angka
    scanText(rel, readFileSync(full, 'utf8'), true);
  }
}
walk(ROOT);

// Riwayat git: isi semua commit, pesan commit, dan nama berkas di semua riwayat.
let historyChecked = false;
if (existsSync(resolve(ROOT, '.git'))) {
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
  try {
    const hasCommits = git(['rev-list', '--all', '--count']).trim() !== '0';
    if (hasCommits) {
      historyChecked = true;
      scanText('riwayat git (diff semua commit)', git(['log', '--all', '-p', '--format=', '--', '.', ':!package-lock.json']), false);
      scanText('riwayat git (pesan commit)', git(['log', '--all', '--format=%B']), false);
      const names = git(['log', '--all', '--name-only', '--format=']).split('\n').filter(Boolean);
      for (const n of new Set(names)) {
        if (BAD_EXT.has(extname(n).toLowerCase())) add(`riwayat git: ${n}`, 'berkas ekspor/gambar/arsip pernah di-commit');
        for (const { re } of termRes) if (re.test(n)) add(`riwayat git: ${n}`, 'nama berkas memuat istilah sensitif');
      }
    }
  } catch (e) {
    add('riwayat git', `gagal dipindai (${e.message.split('\n')[0]})`);
  }
}

console.log(`Istilah sensitif yang diperiksa: ${terms.length}${terms.length ? '' : ' (tidak ada daftar; hanya pola umum)'}`);
console.log(`Riwayat git ikut dipindai: ${historyChecked ? 'ya' : 'tidak (belum ada commit)'}`);
const unique = [...new Set(findings)];
if (unique.length) {
  console.error('\nTEMUAN:');
  for (const f of unique) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('\nBersih: tidak ada temuan.');
if (!terms.length) console.log('Catatan: berikan daftar istilah (--terms) agar nama perusahaan, brand, dan cabang ikut diperiksa.');
