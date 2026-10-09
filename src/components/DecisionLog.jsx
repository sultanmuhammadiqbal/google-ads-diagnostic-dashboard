import { fmtDate } from '../lib/format.js';

export default function DecisionLog({ data }) {
  const entries = [...data.decisions].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="page">
      <h1>Log keputusan</h1>
      <p className="lede">Catatan fiktif tentang keputusan yang diambil, ambang yang dipakai, dan statusnya.</p>
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
              <tr key={`${e.date}-${e.decision}`}>
                <td data-label="Tanggal">{fmtDate(e.date)}</td>
                <th scope="row" data-label="Keputusan">
                  {e.decision}
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
    </div>
  );
}
