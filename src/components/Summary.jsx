import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { baseline, dayIso, groupBy, isoToDay, ratio, sumRows } from '../lib/aggregate.js';
import { fmtDate, fmtDateShort, fmtIndex, fmtInt, fmtPct } from '../lib/format.js';

const PRESETS = [
  { label: '7 hari terakhir', days: 7 },
  { label: '30 hari terakhir', days: 30 },
  { label: '90 hari', days: 90 },
];

export default function Summary({ data }) {
  const { meta, rows } = data;
  const lastDay = meta.days - 1;
  const [range, setRange] = useState({ from: 0, to: lastDay });
  const minIso = dayIso(meta.startDate, 0);
  const maxIso = dayIso(meta.startDate, lastDay);

  const base = useMemo(() => baseline(rows, meta.baselineDays), [rows, meta.baselineDays]);
  const inRange = useMemo(() => rows.filter((r) => r.day >= range.from && r.day <= range.to), [rows, range]);
  const nDays = range.to - range.from + 1;

  const total = useMemo(() => sumRows(inRange), [inRange]);
  const costIdx = (total.cost / nDays / base.cost) * 100;
  const convIdx = (total.allConv / nDays / base.conv) * 100;
  const cpaIdx = (ratio(total.cost, total.allConv) / base.cpa) * 100;

  const perType = useMemo(() => {
    const g = groupBy(inRange, 'type');
    return meta.campaignTypes.map((t) => {
      const s = sumRows(g.get(t.id) ?? []);
      return {
        ...t,
        ...s,
        share: total.cost > 0 ? (s.cost / total.cost) * 100 : 0,
        costIdx: (s.cost / nDays / base.cost) * 100,
        cpaIdx: s.allConv > 0 ? (s.cost / s.allConv / base.cpa) * 100 : null,
      };
    });
  }, [inRange, meta.campaignTypes, total.cost, nDays, base]);

  const trend = useMemo(() => {
    const g = groupBy(inRange, 'day');
    const out = [];
    for (let d = range.from; d <= range.to; d++) {
      const s = sumRows(g.get(d) ?? []);
      out.push({
        label: fmtDateShort(dayIso(meta.startDate, d)),
        'Indeks biaya': round1((s.cost / base.cost) * 100),
        'Indeks konversi': round1((s.allConv / base.conv) * 100),
        'Indeks CPA': s.allConv > 0 ? round1((s.cost / s.allConv / base.cpa) * 100) : null,
      });
    }
    return out;
  }, [inRange, range, meta.startDate, base]);

  const setFrom = (iso) => {
    if (!iso) return;
    const d = Math.min(Math.max(isoToDay(meta.startDate, iso), 0), lastDay);
    setRange((r) => ({ from: d, to: Math.max(d, r.to) }));
  };
  const setTo = (iso) => {
    if (!iso) return;
    const d = Math.min(Math.max(isoToDay(meta.startDate, iso), 0), lastDay);
    setRange((r) => ({ from: Math.min(d, r.from), to: d }));
  };

  const fromIso = dayIso(meta.startDate, range.from);
  const toIso = dayIso(meta.startDate, range.to);

  return (
    <div className="page">
      <h1>Ringkasan</h1>
      <p className="lede">
        Gambaran akun simulasi selama {meta.days} hari. Biaya, konversi, dan CPA ditampilkan sebagai indeks terhadap rata-rata harian 7 hari pertama (=&nbsp;100).
      </p>

      <section aria-labelledby="filter-title" className="panel">
        <h2 id="filter-title" className="panel-title">Rentang tanggal</h2>
        <div className="filters">
          <div className="presets" role="group" aria-label="Rentang cepat">
            {PRESETS.map((p) => {
              const active = range.to === lastDay && range.from === Math.max(0, lastDay - p.days + 1);
              return (
                <button
                  key={p.days}
                  type="button"
                  className="chip"
                  aria-pressed={active}
                  onClick={() => setRange({ from: Math.max(0, lastDay - p.days + 1), to: lastDay })}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="dates">
            <label>
              <span>Dari</span>
              <input type="date" value={fromIso} min={minIso} max={maxIso} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              <span>Sampai</span>
              <input type="date" value={toIso} min={minIso} max={maxIso} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        </div>
        <p className="muted small">
          Menampilkan {fmtDate(fromIso)} sampai {fmtDate(toIso)} ({nDays} hari).
        </p>
      </section>

      <section aria-label="Indeks utama" className="cards">
        <Card label="Indeks biaya" value={costIdx} note="Rata-rata biaya harian; 100 = 7 hari pertama" />
        <Card label="Indeks konversi" value={convIdx} note="Semua jenis konversi digabung" />
        <Card label="Indeks CPA" value={cpaIdx} note="Biaya per konversi (semua jenis); lebih rendah lebih baik" />
      </section>
      <p className="muted small">
        Catatan: konversi di halaman ini menjumlahkan semua jenis. Lihat tampilan <a href="#/diagnosis">Diagnosis</a> untuk mengetahui mengapa itu bisa menyesatkan.
      </p>

      <section aria-labelledby="type-title" className="panel">
        <h2 id="type-title" className="panel-title">Per tipe campaign</h2>
        <div className="table-wrap">
          <table className="stack">
            <thead>
              <tr>
                <th scope="col">Tipe campaign</th>
                <th scope="col" className="num">Porsi budget</th>
                <th scope="col" className="num">Indeks biaya</th>
                <th scope="col" className="num">Klik</th>
                <th scope="col" className="num">Impresi</th>
                <th scope="col" className="num">Semua konversi</th>
                <th scope="col" className="num">Purchase</th>
                <th scope="col" className="num">Indeks CPA</th>
              </tr>
            </thead>
            <tbody>
              {perType.map((t) => (
                <tr key={t.id}>
                  <th scope="row" data-label="Tipe campaign">{t.name}</th>
                  <td data-label="Porsi budget" className="num">{fmtPct(t.share)}</td>
                  <td data-label="Indeks biaya" className="num">{fmtIndex(t.costIdx)}</td>
                  <td data-label="Klik" className="num">{fmtInt(t.clicks)}</td>
                  <td data-label="Impresi" className="num">{fmtInt(t.impressions)}</td>
                  <td data-label="Semua konversi" className="num">{fmtInt(t.allConv)}</td>
                  <td data-label="Purchase" className="num">{fmtInt(t.purchase)}</td>
                  <td data-label="Indeks CPA" className="num">{fmtIndex(t.cpaIdx)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" data-label="Tipe campaign">Total</th>
                <td data-label="Porsi budget" className="num">{fmtPct(100)}</td>
                <td data-label="Indeks biaya" className="num">{fmtIndex(costIdx)}</td>
                <td data-label="Klik" className="num">{fmtInt(total.clicks)}</td>
                <td data-label="Impresi" className="num">{fmtInt(total.impressions)}</td>
                <td data-label="Semua konversi" className="num">{fmtInt(total.allConv)}</td>
                <td data-label="Purchase" className="num">{fmtInt(total.purchase)}</td>
                <td data-label="Indeks CPA" className="num">{fmtIndex(cpaIdx)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="muted small">Indeks biaya per tipe dihitung terhadap biaya harian akun pada 7 hari pertama, sehingga penjumlahan tiap tipe sama dengan indeks total.</p>
      </section>

      <section aria-labelledby="trend-title" className="panel">
        <h2 id="trend-title" className="panel-title">Tren harian</h2>
        <p className="muted small">
          Tiga garis memakai skala yang sama (100 = rata-rata harian 7 hari pertama). Akhir pekan cenderung lebih rendah.
        </p>
        <div className="chart" role="img" aria-label={`Grafik garis tren harian indeks biaya, konversi, dan CPA, ${fmtDate(fromIso)} sampai ${fmtDate(toIso)}. Indeks biaya rata-rata ${fmtIndex(costIdx)}, indeks konversi ${fmtIndex(convIdx)}, indeks CPA ${fmtIndex(cpaIdx)}.`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d5dae1" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#374151' }} minTickGap={28} />
              <YAxis tick={{ fontSize: 12, fill: '#374151' }} width={44} domain={[0, 'auto']} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="Indeks biaya" stroke="#1f5fbf" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Indeks konversi" stroke="#15803d" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="Indeks CPA" stroke="#b45309" strokeWidth={2} dot={false} strokeDasharray="5 3" isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

const round1 = (v) => Math.round(v * 10) / 10;

function Card({ label, value, note }) {
  return (
    <div className="card">
      <p className="card-label">{label}</p>
      <p className="card-value">{fmtIndex(value)}</p>
      <p className="card-note">{note}</p>
    </div>
  );
}
