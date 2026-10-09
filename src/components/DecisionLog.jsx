import { useEffect, useMemo, useRef, useState } from 'react';
import decisionContent from '../../content/decisions.json';
import { DECISION_FIELDS, PLACEHOLDER, isFilled } from '../lib/contentRules.js';
import { fmtDate } from '../lib/format.js';
import RealResults from './RealResults.jsx';

const FIELD_LABELS = {
  yangSayaLihat: 'Yang saya lihat',
  hipotesis: 'Hipotesis',
  yangSayaCek: 'Yang saya cek',
  keputusan: 'Keputusan',
  yangSayaPantau: 'Yang saya pantau',
};

export default function DecisionLog({ data, initialId }) {
  const entries = useMemo(() => [...data.decisions].sort((a, b) => (a.date < b.date ? 1 : -1)), [data.decisions]);
  const contentById = useMemo(() => new Map(decisionContent.map((c) => [c.logId, c])), []);
  const [openId, setOpenId] = useState(() => (entries.some((e) => e.id === initialId) ? initialId : null));
  const pendingScroll = useRef(initialId);

  // Buka kartu dari entri log; alamat ikut berubah agar bisa dibagikan, tanpa memicu gulir ke atas.
  const openCard = (id) => {
    setOpenId(id);
    pendingScroll.current = id;
    window.history.replaceState(null, '', `#/log/${id}`);
  };
  const toggleCard = (id) => {
    if (openId === id) {
      setOpenId(null);
      window.history.replaceState(null, '', '#/log');
    } else openCard(id);
  };
  const backToRow = (id) => {
    const row = document.getElementById(`log-${id}`);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row?.querySelector('button')?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    pendingScroll.current = null;
    const card = document.getElementById(`kartu-${id}`);
    card?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    card?.querySelector('.card-toggle')?.focus({ preventScroll: true });
  }, [openId]);

  return (
    <div className="page">
      <h1>Log keputusan</h1>
      <p className="lede">Catatan fiktif tentang keputusan yang diambil, ambang yang dipakai, dan statusnya. Klik nama keputusan untuk membuka kartu &quot;Keputusan saya&quot;.</p>
      <p className="notice" role="note">
        <strong>Ilustrasi.</strong> Kolom &quot;Hasil yang diharapkan&quot; berisi perkiraan rekaan untuk memperlihatkan format log, bukan hasil nyata.
      </p>

      <div className="table-wrap">
        <table className="stack log">
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Keputusan</th>
              <th scope="col">Alasan</th>
              <th scope="col">Ambang yang dipakai</th>
              <th scope="col">Status</th>
              <th scope="col">Hasil yang diharapkan (ilustrasi)</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} id={`log-${e.id}`} className={openId === e.id ? 'row-open' : ''}>
                <td data-label="Tanggal">{fmtDate(e.date)}</td>
                <th scope="row" data-label="Keputusan">
                  <button type="button" className="linklike" onClick={() => openCard(e.id)} aria-controls={`kartu-${e.id}`}>
                    {e.decision}
                  </button>
                  {e.ref === 'diagnosis' && (
                    <>
                      <br />
                      <a href="#/diagnosis" className="ref">Lihat tampilan Diagnosis</a>
                    </>
                  )}
                </th>
                <td data-label="Alasan">{e.reason}</td>
                <td data-label="Ambang">{e.threshold}</td>
                <td data-label="Status">
                  <span className={`badge ${e.status === 'Dilakukan' ? 'badge-done' : 'badge-cancel'}`}>{e.status}</span>
                </td>
                <td data-label="Hasil diharapkan">{e.expected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section aria-labelledby="cards-title" className="panel">
        <h2 id="cards-title" className="panel-title">Keputusan saya</h2>
        <p className="muted small">Satu kartu per entri log. Isinya ditulis sendiri dan dimuat dari <code>content/decisions.json</code>; field yang belum ditulis tampil &quot;{PLACEHOLDER}&quot;.</p>
        <div className="cards-list">
          {entries.map((e) => {
            const content = contentById.get(e.id);
            const open = openId === e.id;
            return (
              <article key={e.id} id={`kartu-${e.id}`} className={`dcard ${open ? 'dcard-open' : ''}`}>
                <h3 className="dcard-head">
                  <button type="button" className="card-toggle" aria-expanded={open} aria-controls={`kartu-isi-${e.id}`} onClick={() => toggleCard(e.id)}>
                    <span className="dcard-date">{fmtDate(e.date)}</span>
                    <span className="dcard-title">{e.decision}</span>
                    <span className={`badge ${e.status === 'Dilakukan' ? 'badge-done' : 'badge-cancel'}`}>{e.status}</span>
                    <span className="chev" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                </h3>
                {open && (
                  <div id={`kartu-isi-${e.id}`} className="dcard-body">
                    <dl>
                      {DECISION_FIELDS.map((f) => {
                        const value = content?.[f];
                        return (
                          <div key={f} className="dcard-field">
                            <dt>{FIELD_LABELS[f]}</dt>
                            <dd className={isFilled(value) ? '' : 'placeholder'}>{isFilled(value) ? value : PLACEHOLDER}</dd>
                          </div>
                        );
                      })}
                    </dl>
                    <p className="dcard-foot">
                      <button type="button" className="linklike" onClick={() => backToRow(e.id)}>Lihat entri ini di log</button>
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <RealResults />
    </div>
  );
}
