import { useEffect, useState } from 'react';
import { loadData } from './lib/data.js';
import Summary from './components/Summary.jsx';
import Diagnosis from './components/Diagnosis.jsx';
import DecisionLog from './components/DecisionLog.jsx';

export const SIM_BANNER =
  'Data simulasi. Struktur dan kasus diagnosis berasal dari pengalaman kerja nyata; seluruh angka fiktif dan dihasilkan oleh skrip.';

const ROUTES = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'diagnosis', label: 'Diagnosis' },
  { id: 'log', label: 'Log keputusan' },
];

const readRoute = () => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return ROUTES.some((r) => r.id === id) ? id : 'ringkasan';
};

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    loadData()
      .then((data) => setState({ status: 'ready', data }))
      .catch((error) => setState({ status: 'error', error }));
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="sim-banner" role="note">
          <span className="container">
            <em>{SIM_BANNER}</em>
          </span>
        </div>
        <div className="container topbar">
          <p className="brand">Diagnosis Google Ads</p>
          <nav aria-label="Tampilan dashboard">
            <ul className="tabs">
              {ROUTES.map((r) => (
                <li key={r.id}>
                  <a href={`#/${r.id}`} aria-current={route === r.id ? 'page' : undefined}>
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="container">
        {state.status === 'loading' && <p className="status">Memuat data simulasi…</p>}
        {state.status === 'error' && (
          <p className="status error" role="alert">
            Data tidak bisa dimuat. Jalankan <code>npm run generate</code> lalu muat ulang halaman. ({state.error.message})
          </p>
        )}
        {state.status === 'ready' && (
          <>
            {route === 'ringkasan' && <Summary data={state.data} />}
            {route === 'diagnosis' && <Diagnosis data={state.data} />}
            {route === 'log' && <DecisionLog data={state.data} />}
          </>
        )}
      </main>

      <footer className="container site-footer">
        <p>Studi kasus portofolio. Seluruh angka dalam dashboard ini fiktif; biaya ditampilkan sebagai indeks (rata-rata harian 7 hari pertama = 100), bukan Rupiah.</p>
      </footer>
    </>
  );
}
