import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { groupBy, sumRows } from '../lib/aggregate.js';
import { fmtIndex, fmtInt, fmtPct, fmtRatio } from '../lib/format.js';

const VIEWS = [
  { id: 'all', label: 'Semua konversi', hint: 'Menjumlahkan kelima jenis konversi' },
  { id: 'purchase', label: 'Purchase saja', hint: 'Hanya pembelian' },
];

const DEVICE_COLORS = { mobile: '#1f5fbf', desktop: '#b45309', tablet: '#4b5563' };

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function Diagnosis({ data }) {
  const { meta, rows } = data;
  const [view, setView] = useState('all');

  const perDevice = useMemo(() => {
    const g = groupBy(rows, 'device');
    return meta.devices.map((d) => ({ ...d, ...sumRows(g.get(d.id) ?? []) }));
  }, [rows, meta.devices]);
  const total = useMemo(() => sumRows(rows), [rows]);

  const convOf = (s) => (view === 'all' ? s.allConv : s.purchase);
  const acctCpa = total.cost / convOf(total);
  const chartData = perDevice.map((d) => ({
    id: d.id,
    device: d.name,
    index: Math.round((d.cost / convOf(d) / acctCpa) * 1000) / 10,
  }));

  const mobile = perDevice.find((d) => d.id === 'mobile');
  const desktop = perDevice.find((d) => d.id === 'desktop');
  const cpaRatio = desktop.cost / convOf(desktop) / (mobile.cost / convOf(mobile));
  const threshold = meta.bidCutThresholdRatio;
  const exceeds = cpaRatio > threshold;
  const mobileOfflineShare = ((mobile.store_visit + mobile.directions) / mobile.allConv) * 100;
  const desktopOfflineShare = ((desktop.store_visit + desktop.directions) / desktop.allConv) * 100;

  return (
    <div className="page">
      <h1>Diagnosis</h1>
      <p className="lede">
        Kasus: rekomendasi menurunkan bid Desktop karena CPA-nya tampak jauh lebih tinggi daripada Mobile. Ganti cara menghitung konversi dengan tombol di bawah dan lihat apa yang terjadi pada grafik serta rekomendasinya.
      </p>

      <section aria-labelledby="toggle-title" className="panel">
        <h2 id="toggle-title" className="panel-title">Hitung konversi dengan</h2>
        <div className="segmented" role="group" aria-labelledby="toggle-title">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => setView(v.id)}>
              <span className="seg-label">{v.label}</span>
              <span className="seg-hint">{v.hint}</span>
            </button>
          ))}
        </div>

        <div className="diag-grid">
          <figure className="chart-block">
            <figcaption>
              <strong>CPA per perangkat</strong> ({view === 'all' ? 'semua konversi' : 'Purchase saja'}, {meta.days} hari). Indeks: 100 = CPA rata-rata seluruh akun pada tampilan ini; lebih rendah lebih baik.
            </figcaption>
            <div
              className="chart"
              role="img"
              aria-label={`Grafik batang indeks CPA per perangkat. ${chartData.map((c) => `${c.device} ${fmtIndex(c.index)}`).join(', ')}.`}
            >
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 22, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d5dae1" vertical={false} />
                  <XAxis dataKey="device" tick={{ fontSize: 13, fill: '#1f2937' }} />
                  <YAxis domain={[0, 220]} ticks={[0, 50, 100, 150, 200]} tick={{ fontSize: 12, fill: '#374151' }} width={40} />
                  <ReferenceLine y={100} stroke="#6b7280" strokeDasharray="4 3" />
                  <Bar dataKey="index" isAnimationActive={!reduceMotion} animationDuration={700} animationEasing="ease-out" maxBarSize={90}>
                    {chartData.map((c) => (
                      <Cell key={c.id} fill={DEVICE_COLORS[c.id]} />
                    ))}
                    <LabelList dataKey="index" position="top" formatter={(v) => fmtIndex(v)} style={{ fontSize: 13, fontWeight: 700, fill: '#111827' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="values" aria-label="Nilai indeks CPA">
              {chartData.map((c) => (
                <li key={c.id}>
                  <span className="swatch" style={{ background: DEVICE_COLORS[c.id] }} aria-hidden="true" />
                  {c.device}: <strong>{fmtIndex(c.index)}</strong>
                </li>
              ))}
            </ul>
          </figure>

          <div className={`rec ${exceeds ? 'rec-active' : 'rec-dropped'}`} aria-live="polite">
            <p className="rec-kicker">Rekomendasi</p>
            {exceeds ? (
              <>
                <p className="rec-title">Turunkan bid Desktop {meta.proposedBidCutPercent}%</p>
                <p className="rec-badge">Berlaku pada tampilan ini</p>
                <p>
                  CPA Desktop adalah <strong>{fmtRatio(cpaRatio)}</strong> CPA Mobile, melewati ambang {fmtRatio(threshold)}. Desktop tampak boros dibanding Mobile.
                </p>
              </>
            ) : (
              <>
                <p className="rec-title">Rekomendasi gugur: bid Desktop tidak diturunkan</p>
                <p className="rec-badge">Dibatalkan</p>
                <p>
                  Dengan Purchase saja, CPA Desktop adalah <strong>{fmtRatio(cpaRatio)}</strong> CPA Mobile
                  {cpaRatio <= 1 ? ` (${fmtPct((1 - cpaRatio) * 100)} lebih murah)` : ''}, di bawah ambang {fmtRatio(threshold)}. Desktop tidak lebih boros.
                </p>
                <p>
                  Selisih pada &quot;Semua konversi&quot; berasal dari Kunjungan Toko dan Petunjuk Arah: {fmtPct(mobileOfflineShare)} dari konversi Mobile, tetapi hanya {fmtPct(desktopOfflineShare)} dari konversi Desktop.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="contrib-title" className="panel">
        <h2 id="contrib-title" className="panel-title">Kontribusi tiap jenis konversi per perangkat</h2>
        <div className="table-wrap">
          <table className="stack">
            <thead>
              <tr>
                <th scope="col">Perangkat</th>
                {meta.conversionTypes.map((t) => (
                  <th key={t.id} scope="col" className="num">{t.name}</th>
                ))}
                <th scope="col" className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {perDevice.map((d) => (
                <tr key={d.id}>
                  <th scope="row" data-label="Perangkat">{d.name}</th>
                  {meta.conversionTypes.map((t) => (
                    <td
                      key={t.id}
                      data-label={t.name}
                      className={`num ${(t.id === 'store_visit' || t.id === 'directions') && d.id === 'mobile' ? 'hot' : ''}`}
                    >
                      <span>
                        {fmtInt(d[t.id])} <span className="pct">({fmtPct((d[t.id] / d.allConv) * 100)})</span>
                      </span>
                    </td>
                  ))}
                  <td data-label="Total" className="num"><strong>{fmtInt(d.allConv)}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" data-label="Perangkat">Semua perangkat</th>
                {meta.conversionTypes.map((t) => (
                  <td key={t.id} data-label={t.name} className="num">
                    <span>
                      {fmtInt(total[t.id])} <span className="pct">({fmtPct((total[t.id] / total.allConv) * 100)})</span>
                    </span>
                  </td>
                ))}
                <td data-label="Total" className="num"><strong>{fmtInt(total.allConv)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="muted small">Persentase di dalam kurung adalah porsi jenis konversi itu terhadap seluruh konversi perangkat yang sama. Sel berlatar kuning menandai konversi toko pada Mobile.</p>
      </section>

      <section aria-labelledby="why-title" className="panel">
        <h2 id="why-title" className="panel-title">Mengapa Kunjungan Toko menyesatkan perbandingan ini</h2>
        <p>
          Kunjungan Toko dan Petunjuk Arah adalah sinyal menuju toko fisik, dan hampir seluruhnya tercatat dari Mobile karena orang mencari lokasi lewat ponsel. Keduanya banyak dan murah dicapai, sehingga ketika semua jenis konversi dijumlahkan, pembagi CPA Mobile membengkak dan CPA-nya tampak rendah. Desktop, yang konversinya hampir seluruhnya online, tampak mahal. Selisih itu bukan perbedaan efisiensi, melainkan perbedaan apa yang dihitung.
        </p>
        <p>
          Perbandingan yang adil memakai satu jenis konversi yang sama-sama bernilai bagi bisnis di semua perangkat, di sini Purchase. Pada tampilan itu, CPA Desktop setara atau lebih baik daripada Mobile, sehingga rekomendasi menurunkan bid Desktop gugur sebelum dieksekusi. Keputusannya tercatat di <a href="#/log">Log keputusan</a>.
        </p>
      </section>
    </div>
  );
}
