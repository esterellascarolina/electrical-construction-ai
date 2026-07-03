/* =========================================================
   App root — electrical construction systematic review.
   Updated to pass Gemini config to AIAssistantView.
   ========================================================= */

(function() {
  const { useState, useEffect } = React;
  const U = window.AppUtils;
  const {
    Dashboard,
    AllPapersView,
    MethodologyView,
    AIAssistantView,
    AboutView
  } = window.AppViews;

  // ── Gemini AI configuration ───────────────────────────
  // Production: deploy worker.js to Cloudflare Workers, paste the URL below.
  // Local dev only: paste a Gemini API key (never commit a real key to git).
  const GEMINI_WORKER_BASE = '';   // e.g. 'https://my-worker.example.workers.dev'
  const GEMINI_API_KEY     = '';   // local dev fallback only

  // ── Top-level tabs ────────────────────────────────────
  const TabBar = ({ active, onChange }) => {
    const tabs = [
      { id: 'dashboard',   label: 'Dashboard' },
      { id: 'papers',      label: 'All papers' },
      { id: 'methodology', label: 'Methodology' },
      { id: 'ai',          label: 'AI Assistant' },
      { id: 'about',       label: 'About' }
    ];
    return (
      <nav className="flex gap-5 md:gap-7 text-sm">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`relative py-1 font-medium transition-colors ${
                isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
              {isActive && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>
    );
  };

  // ── Root app ──────────────────────────────────────────
  const App = () => {
    const [state, setState] = useState({ status: 'loading', error: null });
    const [rows, setRows] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
      Papa.parse('./data.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors?.length) console.warn('CSV parse warnings:', results.errors.slice(0, 3));
          const normalized = results.data.map(U.normalizeRecord);
          setRows(normalized);
          setState({ status: 'ready', error: null });
        },
        error: (err) => setState({ status: 'error', error: err.message || String(err) })
      });
    }, []);

    if (state.status === 'loading') return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500 text-sm animate-fade">Loading review data …</div>
      </div>
    );

    if (state.status === 'error') return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-sm">
          <div className="font-semibold mb-2 text-slate-900">Could not load data.csv</div>
          <div className="text-slate-600 mb-3">{state.error}</div>
          <div className="text-slate-500 text-xs leading-relaxed">
            Place <code className="bg-slate-100 px-1 rounded">data.csv</code> next to{' '}
            <code className="bg-slate-100 px-1 rounded">index.html</code> and serve via a local
            web server. Run{' '}
            <code className="bg-slate-100 px-1 rounded">python3 -m http.server 8000</code>{' '}
            in the folder and visit{' '}
            <code className="bg-slate-100 px-1 rounded">http://localhost:8000</code>.
          </div>
        </div>
      </div>
    );

    const yearData = U.yearDistribution(rows);
    const yearMin  = yearData.length ? yearData[0][0] : null;
    const yearMax  = yearData.length ? yearData[yearData.length - 1][0] : null;

    return (
      <div className="min-h-screen">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 pt-6 md:pt-8 pb-10">
            <div className="flex items-center justify-end gap-4 mb-8 md:mb-10">
              <TabBar active={activeTab} onChange={setActiveTab} />
            </div>
            <h1 className="serif text-4xl md:text-5xl text-slate-900 font-semibold leading-tight mb-4 max-w-4xl">
              AI and Digital Technologies in Electrical Construction: A Research Agenda
            </h1>
            <p className="text-slate-600 text-base md:text-lg max-w-3xl leading-relaxed">
              Mapping applications, maturity, and gaps across{' '}
              <span className="font-semibold text-slate-900">{rows.length}</span> peer-reviewed
              studies published between{' '}
              <span className="font-semibold text-slate-900">{yearMin}</span> and{' '}
              <span className="font-semibold text-slate-900">{yearMax}</span>, and surfacing the
              underserved combinations that warrant further study.
            </p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-10">
          {activeTab === 'dashboard'   && <Dashboard rows={rows} />}
          {activeTab === 'papers'      && <AllPapersView rows={rows} />}
          {activeTab === 'methodology' && <MethodologyView />}
          {activeTab === 'ai'          && (
            <AIAssistantView
              rows={rows}
              workerBase={GEMINI_WORKER_BASE}
              apiKey={GEMINI_API_KEY}
            />
          )}
          {activeTab === 'about'       && <AboutView />}
        </main>

        <footer className="border-t border-slate-200 bg-white mt-16">
          <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-slate-500 leading-relaxed">
            Companion database to a manuscript currently under review. Full reference will follow on publication.
          </div>
        </footer>
      </div>
    );
  };

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
})();