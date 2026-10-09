// Memeriksa berkas content/*.json.
//
//   node scripts/check-content.mjs            pemeriksaan penuh (bentuk berkas + kata klaim hasil)
//   node scripts/check-content.mjs --build    hanya bentuk berkas; dipakai otomatis sebelum `npm run build`
//   node scripts/check-content.mjs --dir <folder content>
//
// Build GAGAL jika real-results.json berisi angka tanpa tanggal, berbentuk mata uang, atau lebih dari tiga.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDecisions, validateRealResults, validateSkills, validateTour } from '../src/lib/contentRules.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirIdx = process.argv.indexOf('--dir');
const CONTENT_DIR = dirIdx > -1 ? resolve(process.argv[dirIdx + 1]) : resolve(ROOT, 'content');
const BUILD_ONLY = process.argv.includes('--build');

const errors = [];
function load(name) {
  const file = resolve(CONTENT_DIR, name);
  if (!existsSync(file)) {
    errors.push(`${name}: berkas tidak ditemukan di ${CONTENT_DIR}`);
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${name}: JSON tidak valid (${e.message})`);
    return undefined;
  }
}

const logIds = JSON.parse(readFileSync(resolve(ROOT, 'public/data/decisions.json'), 'utf8')).map((d) => d.id);
const tour = load('tour.json');
const decisions = load('decisions.json');
const skills = load('skills.json');
const real = load('real-results.json');
if (tour !== undefined) errors.push(...validateTour(tour));
if (decisions !== undefined) errors.push(...validateDecisions(decisions, logIds));
if (skills !== undefined) errors.push(...validateSkills(skills));
if (real !== undefined) errors.push(...validateRealResults(real));

// Kata kerja hasil: tidak boleh ada klaim hasil yang dihitung dari data simulasi.
const CLAIM_WORDS = /\b(menurunkan|menghemat|menaikkan|diturunkan|dinaikkan|dihemat|turunkan|naikkan|hemat)\b/i;
const SCAN = ['src', 'content', 'public/data', 'README.md', 'index.html'];
const SELF = new Set(['src/lib/contentRules.js']);
const claimHits = [];
function scanClaims(path) {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) return;
  if (statSync(full).isDirectory()) {
    for (const n of readdirSync(full)) scanClaims(resolve(path, n));
    return;
  }
  const rel = relative(ROOT, full);
  if (SELF.has(rel) || !['.js', '.jsx', '.json', '.md', '.html', '.css'].includes(extname(full))) return;
  readFileSync(full, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (CLAIM_WORDS.test(line)) claimHits.push(`${rel}:${i + 1}: kata klaim hasil ("${line.match(CLAIM_WORDS)[0]}")`);
    });
}
if (!BUILD_ONLY) {
  for (const p of SCAN) scanClaims(p);
  errors.push(...claimHits);
}

if (errors.length) {
  console.error('Pemeriksaan konten GAGAL:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const realCount = Array.isArray(real) ? real.length : 0;
console.log(`Konten valid. Tur ${tour.length} langkah, ${decisions.length} kartu keputusan, ${skills.length} baris peta kemampuan, ${realCount} angka hasil nyata.${BUILD_ONLY ? '' : ' Tidak ada kata klaim hasil.'}`);
