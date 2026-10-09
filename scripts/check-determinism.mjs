// Menjalankan generator dua kali dengan seed yang sama dan membandingkan hash tiap berkas.
// Juga membandingkan dengan public/data yang ada di repositori.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GEN = resolve(ROOT, 'scripts/generate-data.mjs');
const hashDir = (dir) =>
  Object.fromEntries(
    readdirSync(dir)
      .sort()
      .map((f) => [f, createHash('sha256').update(readFileSync(resolve(dir, f))).digest('hex')]),
  );

const a = mkdtempSync(resolve(tmpdir(), 'gen-a-'));
const b = mkdtempSync(resolve(tmpdir(), 'gen-b-'));
try {
  execFileSync('node', [GEN, '--out', a], { stdio: 'ignore' });
  execFileSync('node', [GEN, '--out', b], { stdio: 'ignore' });
  const ha = hashDir(a);
  const hb = hashDir(b);
  const hc = hashDir(resolve(ROOT, 'public/data'));
  let ok = true;
  for (const f of Object.keys(ha)) {
    const same = ha[f] === hb[f];
    const sameRepo = ha[f] === hc[f];
    console.log(`${same && sameRepo ? 'OK  ' : 'GAGAL'} ${f}  ${ha[f].slice(0, 16)}  (jalan 1 = jalan 2: ${same}, = public/data: ${sameRepo})`);
    if (!same || !sameRepo) ok = false;
  }
  if (!ok) process.exit(1);
  console.log('\nGenerator deterministik: hasil identik.');
} finally {
  rmSync(a, { recursive: true, force: true });
  rmSync(b, { recursive: true, force: true });
}
