import skills from '../../content/skills.json';
import { PLACEHOLDER, isFilled } from '../lib/contentRules.js';

const cell = (v) => (isFilled(v) ? v : <span className="placeholder">{PLACEHOLDER}</span>);

export default function Skills() {
  return (
    <div className="page">
      <h1>Peta kemampuan</h1>
      <p className="lede">Hubungan antara fitur dashboard ini, kemampuan yang diperlihatkannya, dan pemakaiannya di pekerjaan nyata.</p>
      <p className="muted small">Isi tabel dimuat dari <code>content/skills.json</code>. Sel yang belum ditulis tampil &quot;{PLACEHOLDER}&quot;.</p>

      <div className="table-wrap">
        <table className="stack">
          <thead>
            <tr>
              <th scope="col">Fitur dashboard</th>
              <th scope="col">Kemampuan yang diperlihatkan</th>
              <th scope="col">Di mana dipakai di pekerjaan nyata</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((r, i) => (
              <tr key={i}>
                <th scope="row" data-label="Fitur dashboard">{cell(r.fitur)}</th>
                <td data-label="Kemampuan">{cell(r.kemampuan)}</td>
                <td data-label="Dipakai di">{cell(r.penggunaan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
