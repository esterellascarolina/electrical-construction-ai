/* =========================================================
   Paper components.

   PaperCard       compact summary card used inside a list.
   PaperListBlock  header + list of paper cards. No outer
                   wrapper; the parent applies whatever card
                   styling fits its context.
   PaperDetail     full-screen modal. Rendered via
                   ReactDOM.createPortal into document.body so
                   its position:fixed escapes any parent
                   containing block (transforms, filters,
                   backdrop-filters in ancestors can otherwise
                   constrain a fixed element to the ancestor
                   instead of the viewport, which leaves a
                   visible strip of the page at the top).
   ========================================================= */

window.AppComponents = window.AppComponents || {};

(function() {
  const { useEffect } = React;

  // ---------- small shared UI primitives ----------
  // Used by multiple views. Kept here so any view file can
  // reach them via window.AppComponents without duplicating.

  const Stat = ({ label, value, hint }) => (
    <div className="px-5 py-4 bg-white border border-slate-200 rounded-lg">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        {label}
      </div>
      <div className="serif text-3xl text-slate-900 font-semibold leading-none">{value}</div>
      {hint && (
        <div className="text-xs text-slate-500 mt-2 truncate" title={hint}>{hint}</div>
      )}
    </div>
  );

  const SectionLabel = ({ title, subtitle }) => (
    <div className="mb-4">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">
        {title}
      </h2>
      {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
    </div>
  );

  // ---------- compact card ----------
  const PaperCard = ({ paper, onClick }) => {
    const authorYear = paper['Author (Year)'] || '';
    const source = paper['Source title'] || '';
    const title = paper['Title'] || '';
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left bg-white border border-slate-200 rounded-md px-5 py-3.5 hover:border-slate-400 hover:shadow-sm transition-all"
      >
        <div className="text-xs text-slate-500 mb-1">
          {authorYear && <span>{authorYear}</span>}
          {authorYear && source && <span className="text-slate-300 mx-1.5">·</span>}
          {source && <span className="italic">{source}</span>}
        </div>
        <div className="text-[15px] text-slate-900 leading-snug">{title}</div>
      </button>
    );
  };

  // ---------- drill-down content (no outer wrapper) ----------
  const PaperListBlock = ({
    papers,
    bucketLabel,
    bucketDescription,
    contextLabel,
    onClose,
    onSelectPaper
  }) => {
    if (!papers || !papers.length) return null;
    return (
      <>
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 pr-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
              {contextLabel || 'Papers in this group'}
            </div>
            <div className="serif text-xl text-slate-900 font-semibold leading-tight">
              {bucketLabel}
            </div>
            {bucketDescription && (
              <div className="text-sm text-slate-600 mt-1.5 max-w-2xl leading-relaxed">
                {bucketDescription}
              </div>
            )}
            <div className="text-sm text-slate-500 mt-1.5">
              {papers.length} {papers.length === 1 ? 'paper' : 'papers'}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none p-1 -mr-1 flex-shrink-0"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-thin pr-1">
          {papers.map((p, i) => (
            <PaperCard key={p.ID || i} paper={p} onClick={() => onSelectPaper(p)} />
          ))}
        </div>
      </>
    );
  };

  // ---------- detail modal (rendered via Portal into body) ----------
  const PaperDetail = ({ paper, onClose }) => {
    // ESC closes, body scroll locked while open.
    useEffect(() => {
      if (!paper) return;
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', onKey);
        document.body.style.overflow = prevOverflow;
      };
    }, [paper, onClose]);

    if (!paper) return null;

    const year       = paper.Year || '';
    const source     = paper['Source title'] || '';
    const geo        = paper.geographic_context || '';
    const title      = paper['Title'] || '';
    const fullNames  = paper['Author full names'] || '';
    const authorYear = paper['Author (Year)'] || '';
    const abstract   = paper['Abstract'] || '';
    const keywords   = paper['Author Keywords'] || '';
    const url        = paper['URL'] || '';

    const authors = fullNames
      ? fullNames
      : authorYear.replace(/\s*\(\d{4}\)\s*$/, '').trim();

    const keywordList = keywords
      ? keywords.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
      : [];

    // The JSX for the modal. Same as before, except:
    //   - z-index bumped to z-[100] for defensive stacking.
    //   - Outer container forces 100vw/100vh in addition to
    //     inset-0, belt-and-suspenders against any unusual
    //     CSS environments.
    const modalContent = (
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center p-4 md:p-10 bg-slate-900/50 backdrop-blur-modal animate-fade"
        style={{ width: '100vw', height: '100vh' }}
        onClick={onClose}
      >
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[88vh] overflow-y-auto scrollbar-thin"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-2xl leading-none p-2 z-10"
            aria-label="Close"
          >
            ×
          </button>

          <div className="px-7 pt-5 pb-7 md:px-9 md:pt-6 md:pb-9">
            <div className="text-xs text-slate-500 mb-3 flex flex-wrap gap-x-2 gap-y-1 pr-10">
              {year && <span>{year}</span>}
              {source && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="italic">{source}</span>
                </>
              )}
              {geo && (
                <>
                  <span className="text-slate-300">·</span>
                  <span>{geo}</span>
                </>
              )}
            </div>

            <h2 className="serif text-2xl md:text-[28px] text-slate-900 font-bold leading-tight mb-3">
              {title}
            </h2>

            {authors && (
              <div className="text-sm text-slate-600 mb-6 leading-relaxed">{authors}</div>
            )}

            {abstract && (
              <div className="mb-6">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Abstract
                </div>
                <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {abstract}
                </p>
              </div>
            )}

            {keywordList.length > 0 && (
              <div className="mb-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  Keywords
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {keywordList.map((k, i) => (
                    <span
                      key={i}
                      className="text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {url && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-600 hover:text-slate-900 underline underline-offset-2"
                >
                  View at source ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );

    // Render directly into <body>. This is the key fix: it
    // bypasses any ancestor that might be a containing block
    // (e.g. anything with transform/filter/backdrop-filter set),
    // so fixed inset-0 is always relative to the viewport.
    return ReactDOM.createPortal(modalContent, document.body);
  };

  window.AppComponents.Stat = Stat;
  window.AppComponents.SectionLabel = SectionLabel;
  window.AppComponents.PaperCard = PaperCard;
  window.AppComponents.PaperListBlock = PaperListBlock;
  window.AppComponents.PaperDetail = PaperDetail;
})();