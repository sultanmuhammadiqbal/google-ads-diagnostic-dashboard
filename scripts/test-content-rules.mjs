// Menguji aturan validasi real-results dan bentuk konten memakai berkas contoh sementara.
// Tidak menulis apa pun ke content/.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = resolve(ROOT, 'scripts/check-content.mjs');

const base = { tipe: 'persen', nilai: 12.5, metrik: 'metrik uji', sumber: 'sumber uji', tanggalPengambilan: '2026-01-15' };
const cases = [
  ['kosong lolos', [], true],
  ['satu angka lengkap lolos', [base], true],
  ['rentang lolos', [{ ...base, tipe: 'rentang', nilai: undefined, dari: 5, sampai: 10 }], true],
  ['tanpa tanggal gagal', [{ ...base, tanggalPengambilan: undefined }], false],
  ['tanggal kosong gagal', [{ ...base, tanggalPengambilan: '' }], false],
  ['tanggal bukan format gagal', [{ ...base, tanggalPengambilan: '15 Januari' }], false],
  ['tanggal masa depan gagal', [{ ...base, tanggalPengambilan: '2999-01-01' }], false],
  ['tanpa sumber gagal', [{ ...base, sumber: '' }], false],
  ['tanpa metrik gagal', [{ ...base, metrik: undefined }], false],
  ['empat angka gagal', [base, base, base, base], false],
  ['mata uang (Rp) gagal', [{ ...base, metrik: 'biaya Rp 1.500.000' }], false],
  ['mata uang ($) gagal', [{ ...base, sumber: '$120' }], false],
  ['mata uang (juta) gagal', [{ ...base, metrik: '5 juta' }], false],
  ['field angka liar gagal', [{ ...base, biaya: 150000 }], false],
  ['nilai bukan angka gagal', [{ ...base, nilai: '12%' }], false],
];

let failed = 0;
for (const [name, realResults, shouldPass] of cases) {
  const dir = mkdtempSync(resolve(tmpdir(), 'content-test-'));
  try {
    cpSync(resolve(ROOT, 'content'), dir, { recursive: true });
    writeFileSync(resolve(dir, 'real-results.json'), JSON.stringify(realResults));
    let passed = true;
    try {
      execFileSync('node', [CHECK, '--build', '--dir', dir], { stdio: 'ignore' });
    } catch {
      passed = false;
    }
    const ok = passed === shouldPass;
    console.log(`${ok ? 'OK  ' : 'GAGAL'} ${name} (diharapkan ${shouldPass ? 'lolos' : 'gagal'}, hasil ${passed ? 'lolos' : 'gagal'})`);
    if (!ok) failed++;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
if (failed) {
  console.error(`\n${failed} kasus uji gagal.`);
  process.exit(1);
}
console.log('\nSemua kasus uji lolos.');
