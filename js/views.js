/* =========================================================
   Secondary views (rarely touched, grouped together).

   Contains four views:

     AllPapersView      Alphabetical list of every reviewed
                        paper, grouped by leading letter.
     MethodologyView    PRISMA 2020 study selection flow plus
                        the Scopus search strategy.
     AIAssistantView    Placeholder for the future RAG chat.
     AboutView          Placeholder for project metadata.

   These views share one file because they are content pages
   that change rarely. The actively-evolving Dashboard view
   lives in its own file (view-dashboard.js).

   All four registered on window.AppViews.
   ========================================================= */

window.AppViews = window.AppViews || {};

(function() {
  const { useState, useMemo } = React;
  const { PaperCard, PaperDetail } = window.AppComponents;

  // ====================================================
  // AllPapersView
  // ====================================================
  //
  // Lists every reviewed paper, sorted alphabetically by Title
  // (case-insensitive), grouped under its leading letter. A
  // letter index at the top jumps to each section. Clicking a
  // paper card opens the same PaperDetail modal used elsewhere.
  //
  // Titles starting with a non-letter character (digits, brackets,
  // quotes) are grouped under "#".
  //
  // The view holds its own selectedPaper state; the modal renders
  // via Portal, so it overlays the page from whichever tab is
  // active.
  const AllPapersView = ({ rows }) => {
    const [selectedPaper, setSelectedPaper] = useState(null);

    const groups = useMemo(() => {
      const sorted = [...rows].sort((a, b) =>
        (a['Title'] || '').toLowerCase()
          .localeCompare((b['Title'] || '').toLowerCase())
      );
      const grouped = new Map();
      for (const p of sorted) {
        const title = (p['Title'] || '').trim();
        const firstChar = title.charAt(0).toUpperCase();
        const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
        if (!grouped.has(letter)) grouped.set(letter, []);
        grouped.get(letter).push(p);
      }
      return [...grouped.entries()];
    }, [rows]);

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-1.5">
            All reviewed papers
          </h2>
          <p className="text-sm text-slate-500">
            {rows.length} studies, ordered alphabetically by title. Click any paper to open its abstract and details.
          </p>
        </div>

        {/* Letter index */}
        <nav
          className="flex flex-wrap gap-1 mb-8 pb-4 border-b border-slate-200"
          aria-label="Jump to letter"
        >
          {groups.map(([letter]) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded hover:bg-slate-100 transition-colors tabular-nums"
            >
              {letter}
            </a>
          ))}
        </nav>

        <div className="space-y-8">
          {groups.map(([letter, papers]) => (
            <section
              key={letter}
              id={`letter-${letter}`}
              className="scroll-mt-6"
            >
              <h3 className="serif text-xl text-slate-900 font-semibold mb-3 pb-2 border-b border-slate-100 flex items-baseline gap-3">
                <span>{letter}</span>
                <span className="text-xs font-normal text-slate-500 tabular-nums">
                  {papers.length} {papers.length === 1 ? 'paper' : 'papers'}
                </span>
              </h3>
              <div className="space-y-2">
                {papers.map((p, i) => (
                  <PaperCard
                    key={p.ID || i}
                    paper={p}
                    onClick={() => setSelectedPaper(p)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <PaperDetail
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
        />
      </div>
    );
  };

  // ====================================================
  // MethodologyView and its PRISMA helpers
  // ====================================================

  const PrismaStage = ({ stage, title, description, count, accent = false }) => (
    <div
      className={`bg-white border rounded-lg p-6 ${
        accent ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold mb-1.5">
            {stage}
          </div>
          <h3 className="serif text-xl text-slate-900 font-semibold mb-2 leading-tight">
            {title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
        <div className="serif text-3xl text-slate-900 font-semibold leading-none flex-shrink-0 tabular-nums">
          {count.toLocaleString()}
        </div>
      </div>
    </div>
  );

  const ExclusionStrip = ({ count, text }) => (
    <div className="py-4 pl-6 pr-6 flex items-start gap-3 text-sm">
      <span
        className="text-slate-400 leading-none text-lg flex-shrink-0"
        aria-hidden="true"
      >↓</span>
      <div className="leading-relaxed">
        <span className="font-semibold text-slate-900 tabular-nums">
          {count.toLocaleString()} excluded
        </span>
        <span className="text-slate-600"> · {text}</span>
      </div>
    </div>
  );

  const QueryMeta = ({ label, value }) => (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
        {label}
      </div>
      <div className="text-sm text-slate-900 font-medium">{value}</div>
    </div>
  );

  const QueryComponent = ({ label, description, terms }) => {
    // Render the term list as it would appear inside a Boolean
    // component of the Scopus query (each term on its own line,
    // joined with OR). Preserves embedded operators inside a
    // term (e.g. `"MEP" AND "electrical"`) verbatim.
    const queryText = terms
      .map((t, i) => (i === 0 ? t : 'OR ' + t))
      .join('\n');
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 font-semibold mb-1.5">
          {label}
        </div>
        <div className="text-sm text-slate-900 font-medium mb-3">{description}</div>
        <pre className="bg-slate-50 border border-slate-100 rounded p-3 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-wrap overflow-x-auto m-0">
          {queryText}
        </pre>
      </div>
    );
  };

  const MethodologyView = () => (
    <div className="max-w-4xl space-y-12">

      {/* Intro */}
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">
          Study selection
        </h2>
        <p className="text-slate-700 leading-relaxed max-w-3xl">
          This systematic review follows the PRISMA 2020 reporting guidelines.
          A four-stage screening process narrowed 1,085 records identified in Scopus
          to the 129 studies that form the analytic base for the descriptive overview,
          the thematic synthesis, and the identification of underserved combinations.
        </p>
      </div>

      {/* PRISMA flow */}
      <div>
        <PrismaStage
          stage="Stage 1 · Identification"
          title="Scopus database search"
          description="Search date 23 April 2026. TITLE-ABS-KEY query combining electrical construction terms, AI and digital technology terms, and exclusion terms for non-construction electrical contexts. Publication years 2006 to 2026."
          count={1085}
        />
        <ExclusionStrip
          count={550}
          text="Language not English, or document type other than journal article or review. Conference papers, book chapters, editorials, notes, and letters were excluded to ensure peer-reviewed source quality."
        />
        <PrismaStage
          stage="Stage 2 · Screening"
          title="Title and abstract review"
          description="Each record reviewed against two inclusion criteria, namely electrical construction relevance and the application of AI or digital technology to a construction-related problem, and against six exclusion categories."
          count={535}
        />
        <ExclusionStrip
          count={363}
          text="Medical use of the MEP acronym (motor evoked potentials, neurosurgery); power system operations unrelated to construction (smart grid, transmission, substation); trade publications without peer review; unrelated electrical research (biosensors, consumer electronics, agriculture, aerospace); unrelated MEP acronym usage; and papers with no substantive electrical construction application."
        />
        <PrismaStage
          stage="Stage 3 · Eligibility"
          title="Full-text review and structured coding"
          description="Full-text review and extraction across forty-four coding dimensions, including research problem, methods, AI technique, digital technology, construction phase, electrical work category, maturity level, contribution type, pain point addressed, contractor role impacted, code compliance, references to industry bodies, data availability, and limitations acknowledged."
          count={172}
        />
        <ExclusionStrip
          count={43}
          text="Marginal electrical relevance on close reading; AI or digital technology application tangential or absent; abstracts that misled initial screening; retracted or withdrawn records; outlets failing established indicators of scholarly quality; and duplicates or conference-extension overlaps with included journal articles."
        />
        <PrismaStage
          stage="Stage 4 · Included"
          title="Studies in the systematic review"
          description="The analytic base for the descriptive overview, the thematic synthesis, and the identification of underserved combinations across method, technology, and project phase."
          count={129}
          accent
        />
      </div>

      {/* Search strategy */}
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">
          Search strategy
        </h2>
        <p className="text-slate-700 leading-relaxed mb-6 max-w-3xl">
          The Scopus query combined three Boolean components: a population component
          covering electrical construction work and the electrical contracting industry;
          an intervention component covering AI and digital technologies; and a
          query-level exclusion component for non-construction electrical contexts
          that would otherwise produce large volumes of off-topic results.
        </p>

        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QueryMeta label="Database"    value="Scopus" />
            <QueryMeta label="Field"       value="TITLE-ABS-KEY" />
            <QueryMeta label="Search date" value="23 April 2026" />
            <QueryMeta label="Year range"  value="2006 to 2026" />
          </div>
        </div>

        <div className="space-y-4">
          <QueryComponent
            label="Component 1 · Population"
            description="Electrical construction and related trade terms"
            terms={[
              '"electrical construction"',
              '"electrical contractor*"',
              '"electrical installation*"',
              '"electrical wiring"',
              '"electrician*"',
              '("MEP" AND "electrical")',
              '"Division 26"',
              '"NECA"',
              '"ELECTRI International"'
            ]}
          />
          <QueryComponent
            label="Component 2 · Intervention"
            description="AI and digital technologies"
            terms={[
              '"artificial intelligence"',
              '"machine learning"',
              '"deep learning"',
              '"BIM"',
              '"digital twin*"',
              '"virtual reality"',
              '"augmented reality"',
              '"robot*"',
              '"Industry 4.0"'
            ]}
          />
          <QueryComponent
            label="Component 3 · Exclusion at query level"
            description="Non-construction electrical contexts removed by AND NOT"
            terms={[
              '"smart grid*"',
              '"power grid"',
              '"electric vehicle*"',
              '"photovoltaic*"',
              '"smart meter*"',
              '"transmission line*"'
            ]}
          />
        </div>
      </div>

    </div>
  );

  // ====================================================
  // AIAssistantView
  // Wraps the AIChat component. Holds selectedPaper state
  // so citation chips can open the PaperDetail modal.
  // workerBase and apiKey are passed down from app.js.
  // ====================================================
  const AIAssistantView = ({ rows, workerBase, apiKey }) => {
    const [selectedPaper, setSelectedPaper] = useState(null);
    const { AIChat } = window.AppCharts;
    const { PaperDetail } = window.AppComponents;

    return (
      <div>
        <div className="mb-6">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-1.5">
            AI Research Assistant
          </h2>
          <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">
            Ask natural-language questions about the {rows.length} reviewed studies.
            The assistant retrieves the most relevant papers using semantic search,
            grounds every claim in citations, and links directly to each paper's
            abstract and extracted attributes.
          </p>
        </div>

        <AIChat
          rows={rows}
          workerBase={workerBase}
          apiKey={apiKey}
          onPaperClick={setSelectedPaper}
        />

        <PaperDetail
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
        />
      </div>
    );
  };

  // ====================================================
  // AboutView (placeholder)
  // ====================================================
  const AboutView = () => (
    <div className="max-w-3xl space-y-5">
      <h2 className="serif text-2xl md:text-3xl text-slate-900 font-semibold">About this project</h2>
      <p className="text-slate-700 leading-relaxed">
        This database accompanies a research agenda paper on artificial intelligence and digital
        technologies applied to electrical construction. The agenda is grounded in a systematic
        review of the published literature and identifies underserved combinations of method,
        problem, and project phase that warrant further study.
      </p>
      <div className="grid md:grid-cols-2 gap-4 pt-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Authors</div>
          <div className="text-sm text-slate-700">Add author names and affiliations here.</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Funding</div>
          <div className="text-sm text-slate-700">Add funding sources or grant numbers here.</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Methodology</div>
          <div className="text-sm text-slate-700">Add a short summary of the PRISMA flow, databases searched, search string, and inclusion criteria.</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Citation</div>
          <div className="text-sm text-slate-700">Add a preferred citation for the underlying journal paper here.</div>
        </div>
      </div>
    </div>
  );

  window.AppViews.AllPapersView    = AllPapersView;
  window.AppViews.MethodologyView  = MethodologyView;
  window.AppViews.AIAssistantView  = AIAssistantView;
  window.AppViews.AboutView        = AboutView;
})();