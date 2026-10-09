import realResults from '../../content/real-results.json';
import { validateRealResults } from '../lib/contentRules.js';
import { fmtDate } from '../lib/format.js';

const pct = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const fmtValue = (r) => (r.tipe === 'rentang' ? `${pct.format(r.dari)}% sampai ${pct.format(r.sampai)}%` : `${pct.format(r.nilai)}%`);

// Hasil nyata (dinormalisasi). Membaca content/real-results.json yang diisi sendiri; kosong secara default.
// Sengaja terpisah dari bagian simulasi. Build menolak angka tanpa tanggal atau berbentuk mata uang;
// di sini angka yang tidak lolos aturan yang sama tidak ditampilkan sama sekali.
export default function RealResults() {
  const errors = validateRealResults(realResults);
  const items = errors.length === 0 ? realResults : [];

  return (
    <section aria-labelledby="real-title" className="real">
      <p className="real-flag">Bukan bagian simulasi</p>
      <h2 id="real-title" className="panel-title">Hasil nyata (dinormalisasi)</h2>
      {errors.length > 0 && (
        <p role="alert" className="real-error">
          Berkas hasil nyata tidak lolos aturan, jadi tidak ditampilkan. Jalankan <code>npm run check:content</code> untuk melihat penyebabnya.
        </p>
      )}
      {errors.length === 0 && items.length === 0 && <p>Pengukuran sedang berjalan, hasil menyusul.</p>}
      {items.length > 0 && (
        <ul className="real-list">
          {items.map((r, i) => (
            <li key={i} className="real-item">
              <p className="real-value">{fmtValue(r)}</p>
              <p className="real-metric">{r.metrik}</p>
              <p className="muted small">
                Sumber: {r.sumber}. Diambil {fmtDate(r.tanggalPengambilan)}.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
