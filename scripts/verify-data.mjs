// Memeriksa bahwa pola kasus benar-benar tertanam di data hasil generator.
// Pemakaian: node scripts/verify-data.mjs [--dir <folder data>]

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirIdx = process.argv.indexOf('--dir');
const DIR = dirIdx > -1 ? resolve(process.argv[dirIdx + 1]) : resolve(ROOT, 'public/data');

const meta = JSON.parse(readFileSync(resolve(DIR, 'meta.json'), 'utf8'));
const daily = JSON.parse(readFileSync(resolve(DIR, 'daily.json'), 'utf8'));
const col = Object.fromEntries(daily.columns.map((c, i) => [c, i]));
const CONV = meta.conversionTypes.map((t) => t.id);

const zero = () => ({ cost: 0, purchase: 0, offline: 0, all: 0, byType: Object.fromEntries(CONV.map((k) => [k, 0])) });
const byDevice = Object.fromEntries(meta.devices.map((d) => [d.id, zero()]));
const byCampaign = Object.fromEntries(meta.campaigns.map((c) => [c.id, zero()]));
const total = zero();

for (const r of daily.rows) {
  const dev = meta.devices[r[col.v]].id;
  const camp = meta.campaigns[r[col.c]].id;
  for (const acc of [byDevice[dev], byCampaign[camp], total]) {
    acc.cost += r[col.cost];
    for (const k of CONV) {
      acc.byType[k] += r[col[k]];
      acc.all += r[col[k]];
    }
    acc.purchase += r[col.purchase];
    acc.offline += r[col.store_visit] + r[col.directions];
  }
}

const cpa = (a, conv) => a.cost / conv;
const view = {
  all: Object.fromEntries(Object.entries(byDevice).map(([k, a]) => [k, cpa(a, a.all)])),
  purchase: Object.fromEntries(Object.entries(byDevice).map(([k, a]) => [k, cpa(a, a.purchase)])),
};
const acct = { all: cpa(total, total.all), purchase: cpa(total, total.purchase) };
const idx = (v, k) => (view[v][k] / acct[v]) * 100;

const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

const ratioAll = view.all.desktop / view.all.mobile;
const ratioPurchase = view.purchase.desktop / view.purchase.mobile;
check('Semua konversi: CPA Desktop > ambang × CPA Mobile', ratioAll > meta.bidCutThresholdRatio, `rasio ${ratioAll.toFixed(2)}, ambang ${meta.bidCutThresholdRatio}`);
check('Purchase saja: CPA Desktop setara atau lebih baik dari Mobile', ratioPurchase <= 1.05, `rasio ${ratioPurchase.toFixed(2)}`);
const m = byDevice.mobile;
check('Mobile: Kunjungan Toko + Petunjuk Arah jauh lebih banyak dari Purchase', m.offline > 5 * m.purchase, `${m.offline} vs ${m.purchase} Purchase`);
const dsk = byDevice.desktop;
check('Desktop: konversi toko hampir tidak ada', dsk.offline < 0.1 * m.offline, `${dsk.offline} vs ${m.offline} di Mobile`);

for (const c of meta.campaigns.filter((c) => c.id === 'search-c' || c.id === 'pmax-3')) {
  const a = byCampaign[c.id];
  const costShare = a.cost / total.cost;
  const purchaseShare = a.purchase / total.purchase;
  check(`${c.name}: boros (porsi biaya jauh di atas porsi Purchase)`, costShare > 0.1 && purchaseShare < 0.03, `biaya ${(costShare * 100).toFixed(1)}%, Purchase ${(purchaseShare * 100).toFixed(1)}%`);
}

const maxIdx = Math.max(...['all', 'purchase'].flatMap((v) => meta.devices.map((d) => idx(v, d.id))));
check('Indeks CPA per perangkat muat di sumbu grafik (< 210)', maxIdx < 210, `maks ${maxIdx.toFixed(1)}`);

let first7 = 0;
for (const r of daily.rows) if (r[col.d] < meta.baselineDays) first7 += r[col.cost];
check('Indeks biaya: rata-rata harian 7 hari pertama = 100', Math.abs(first7 / meta.baselineDays - 100) < 0.05, `${(first7 / meta.baselineDays).toFixed(3)}`);

console.log('Ringkasan (indeks CPA, 100 = rata-rata akun pada tampilan itu):');
for (const v of ['all', 'purchase']) {
  console.log(`  ${v === 'all' ? 'Semua konversi' : 'Purchase saja '}: ` + meta.devices.map((d) => `${d.name} ${idx(v, d.id).toFixed(1)}`).join(' | '));
}
console.log('');
let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'OK  ' : 'GAGAL'} ${c.name} (${c.detail})`);
  if (!c.ok) failed++;
}
if (failed) {
  console.error(`\n${failed} pemeriksaan gagal.`);
  process.exit(1);
}
console.log('\nSemua pemeriksaan pola lolos.');
