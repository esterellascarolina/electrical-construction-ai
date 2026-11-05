/* =========================================================
   Secondary views (rarely touched, grouped together).

   Contains four views:

     AllPapersView      Alphabetical list of every reviewed
                        paper, grouped by leading letter.
     MethodologyView    PRISMA 2020 study selection flow plus
                        the Scopus search strategy.
     AIAssistantView    Placeholder for the future RAG chat.
     AboutView          Paper, citation, authors, funding.

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
  // AboutView
  // Modeled on the About page of cm.electriai.com:
  // paper header + link row, versions of the article,
  // overview, key findings, citation, authors, methods,
  // limitations, funding, contact.
  // ====================================================
  const ABOUT_DOI          = '10.1080/15623599.2026.2740760';
  const ABOUT_DOI_URL      = `https://doi.org/${ABOUT_DOI}`;
  const ABOUT_TF_URL       = `https://www.tandfonline.com/doi/full/${ABOUT_DOI}`;
  const ABOUT_PREPRINT_URL = './preprint.pdf';   // preprint.pdf sits next to index.html
  const ABOUT_TITLE =
    'Artificial Intelligence and Digital Technologies in Electrical Construction: A Systematic Review of Applications, Maturity, and Research Directions';

  const ABOUT_APA_TEXT =
    'Esterellas Hernandez, C., & Chau, A. D. (2026). Artificial intelligence and digital technologies in electrical construction: A systematic review of applications, maturity, and research directions. International Journal of Construction Management. Advance online publication. ' +
    ABOUT_DOI_URL;

  const ABOUT_BIBTEX = [
    '@article{EsterellasHernandez2026Electrical,',
    '  author    = {Esterellas Hernandez, Carolina and Chau, Anh D.},',
    '  title     = {Artificial Intelligence and Digital Technologies in Electrical Construction: A Systematic Review of Applications, Maturity, and Research Directions},',
    '  journal   = {International Journal of Construction Management},',
    '  year      = {2026},',
    '  pages     = {1--18},',
    '  publisher = {Taylor \\& Francis},',
    '  doi       = {' + ABOUT_DOI + '},',
    '  url       = {' + ABOUT_DOI_URL + '}',
    '}'
  ].join('\n');

  const ABOUT_RIS = [
    'TY  - JOUR',
    'AU  - Esterellas Hernandez, Carolina',
    'AU  - Chau, Anh D.',
    'TI  - ' + ABOUT_TITLE,
    'JO  - International Journal of Construction Management',
    'PY  - 2026',
    'SP  - 1',
    'EP  - 18',
    'PB  - Taylor & Francis',
    'DO  - ' + ABOUT_DOI,
    'UR  - ' + ABOUT_DOI_URL,
    'ER  - '
  ].join('\r\n');

  const aboutCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  };

  const aboutDownload = (filename, text, mime) => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const AboutLabel = ({ children }) => (
    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold mb-2">
      {children}
    </div>
  );

  const AboutSection = ({ label, title, children }) => (
    <section className="bg-white border border-slate-200 rounded-lg p-6 md:p-8">
      {label && <AboutLabel>{label}</AboutLabel>}
      {title && <h2 className="serif text-2xl text-slate-900 font-semibold mb-4 leading-snug">{title}</h2>}
      <div className="text-[15px] leading-relaxed text-slate-700 space-y-4">{children}</div>
    </section>
  );

  const AboutLink = ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700"
    >
      {children}
    </a>
  );

  const AboutStat = ({ value, label }) => (
    <div className="border border-slate-200 rounded-lg px-4 py-3 bg-stone-50">
      <div className="serif text-2xl text-slate-900 font-semibold">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );

  const OrcidIcon = () => (
    <svg viewBox="0 0 256 256" className="w-4 h-4 inline-block" aria-hidden="true">
      <circle cx="128" cy="128" r="128" fill="#A6CE39" />
      <g fill="#fff">
        <rect x="70" y="78" width="18" height="100" />
        <circle cx="79" cy="60" r="11" />
        <path d="M108 78h40c38 0 56 27 56 50s-20 50-56 50h-40V78zm18 16v68h22c28 0 38-19 38-34s-12-34-38-34h-22z" />
      </g>
    </svg>
  );

  const ABOUT_AUTHORS = [
    {
      name: 'Carolina Esterellas Hernandez',
      role: 'Graduate Student',
      affil: 'U. A. Whitaker College of Engineering, Florida Gulf Coast University, Fort Myers, FL, USA',
      orcid: '0009-0002-8889-8646',
      email: 'cesterellas5539@eagle.fgcu.edu',
      corresponding: false
    },
    {
      name: 'Anh D. Chau',
      role: 'Assistant Professor',
      affil: 'Stock Development Department of Construction Management, Florida Gulf Coast University, Fort Myers, FL, USA',
      orcid: '0000-0002-1830-1026',
      email: 'achau@fgcu.edu',
      corresponding: true
    }
  ];

  const ABOUT_DIRECTIONS = [
    ['LLM-assisted code compliance', 'Automated parsing of the National Electrical Code and local amendments against model or as-built data, evaluated on documented compliance outcomes.'],
    ['AI-driven cost estimation', 'Electrical cost estimation and business-case modeling validated on completed projects rather than analytical estimates.'],
    ['Execution-phase monitoring', 'Productivity and quality monitoring on site, including wearable and environmental sensing integrated with installation tracking.'],
    ['Field-validation protocols', 'Point cloud and computer vision methods reported with performance under occlusion, congestion, and variable lighting, plus deployment cost.'],
    ['Organizational and contractual adoption', 'How organizational and contractual structures shape whether digital tools are adopted and sustained.'],
    ['Open trade-specific datasets', 'Open datasets and benchmarks for electrical components and installation states.']
  ];

  const AboutView = () => {
    const [copied, setCopied] = useState(null);

    const handleCopy = async (key, text) => {
      const ok = await aboutCopy(text);
      if (ok) {
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
      }
    };

    const btnPrimary =
      'inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors';
    const btnSecondary =
      'inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-slate-900 text-sm font-medium border border-slate-300 hover:border-slate-500 transition-colors';
    const btnSmall =
      'inline-flex items-center px-3 py-1.5 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:border-slate-500 transition-colors';
    const linkBtn =
      'underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700 text-slate-900';

    return (
      <div className="max-w-4xl space-y-6">
        {/* ---------- Header / paper ---------- */}
        <header className="pb-2">
          <AboutLabel>About this database</AboutLabel>
          <h2 className="serif text-2xl md:text-3xl text-slate-900 font-semibold leading-tight">{ABOUT_TITLE}</h2>
          <p className="mt-4 text-[15px] text-slate-600 leading-relaxed">
            Carolina Esterellas Hernandez and Anh D. Chau, Florida Gulf Coast University.{' '}
            <span className="italic">International Journal of Construction Management</span>, 2026.{' '}
            <AboutLink href={ABOUT_DOI_URL}>doi:{ABOUT_DOI}</AboutLink>
          </p>
          <div className="mt-3 text-sm text-slate-500 flex flex-wrap gap-x-2 gap-y-1">
            <AboutLink href={ABOUT_TF_URL}>Published article</AboutLink>
            <span>·</span>
            <AboutLink href={ABOUT_PREPRINT_URL}>Download the preprint (PDF)</AboutLink>
            <span>·</span>
            <button type="button" onClick={() => aboutDownload('citation.bib', ABOUT_BIBTEX, 'application/x-bibtex')} className={linkBtn}>BibTeX</button>
            <span>·</span>
            <button type="button" onClick={() => aboutDownload('citation.ris', ABOUT_RIS, 'application/x-research-info-systems')} className={linkBtn}>RIS</button>
            <span>·</span>
            <AboutLink href="./data.csv">Data (CSV)</AboutLink>
          </div>
        </header>

        {/* ---------- Read the paper ---------- */}
        <AboutSection label="Read the paper" title="Two versions of the article">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-5 flex flex-col">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Version of record</div>
              <div className="serif text-lg text-slate-900 font-semibold mt-1">Official published article</div>
              <p className="text-sm text-slate-600 mt-2 flex-1">
                Typeset article in the <span className="italic">International Journal of Construction Management</span>{' '}
                (Taylor &amp; Francis), published online 29 September 2026. Access may require a subscription.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <a href={ABOUT_TF_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary}>Read on Taylor &amp; Francis ↗</a>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg p-5 flex flex-col">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-semibold">Free to read</div>
              <div className="serif text-lg text-slate-900 font-semibold mt-1">Preprint (author manuscript)</div>
              <p className="text-sm text-slate-600 mt-2 flex-1">
                The authors' manuscript, free to download. It may differ from the published version in
                wording and layout; please cite the published article.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <a href={ABOUT_PREPRINT_URL} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Download preprint (PDF)</a>
              </div>
            </div>
          </div>
        </AboutSection>

        {/* ---------- Overview ---------- */}
        <AboutSection label="Overview" title="What this review and webapp are">
          <p>
            This site is the open companion to a systematic review of how artificial intelligence and
            related digital technologies have been studied in electrical construction. The review covers{' '}
            <strong>129 peer-reviewed studies published between 2008 and 2026</strong>, retrieved from
            Scopus and Web of Science, and codes each study across <strong>44 dimensions</strong>, from the
            technology used and the project phase it targets to how it was validated and what benefits
            were reported.
          </p>
          <p>
            The findings are organized around the electrical contractor value chain rather than around
            algorithms, so contractors, estimators, project managers, and researchers can see where the
            evidence is strong, where it is thin, and how mature it is. The webapp lets you verify,
            filter, and question the same evidence base the paper is built on.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <AboutStat value="129" label="studies included" />
            <AboutStat value="2008–2026" label="publication years" />
            <AboutStat value="44" label="coding dimensions" />
            <AboutStat value="6" label="analytical views" />
          </div>
        </AboutSection>

        {/* ---------- Key findings ---------- */}
        <AboutSection label="Key findings" title="What the evidence shows">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>BIM dominates.</strong> Building information modeling appears in roughly half of the studies, while large language models and generative AI remain scarce.</li>
            <li><strong>More papers, less field testing.</strong> Publication volume more than tripled after 2021, while the field-tested share fell from above 75% to between 29% and 45%.</li>
            <li><strong>Benefits are mostly algorithmic.</strong> Quantified benefits are dominated by algorithm performance rather than cost, safety, or productivity outcomes.</li>
            <li><strong>Phase concentration.</strong> Research clusters in preconstruction coordination and closeout documentation, with little attention to the execution phase.</li>
          </ul>
          <div className="pt-2">
            <AboutLabel>Six priority research directions</AboutLabel>
            <ol className="grid sm:grid-cols-2 gap-3">
              {ABOUT_DIRECTIONS.map(([t, d], i) => (
                <li key={t} className="border border-slate-200 rounded-lg p-4">
                  <div className="text-xs text-slate-400 font-semibold">{String(i + 1).padStart(2, '0')}</div>
                  <div className="serif text-base text-slate-900 font-semibold mt-0.5">{t}</div>
                  <div className="text-sm text-slate-600 mt-1">{d}</div>
                </li>
              ))}
            </ol>
          </div>
        </AboutSection>

        {/* ---------- How to cite ---------- */}
        <AboutSection label="How to cite" title="Cite this work">
          <p className="text-sm text-slate-500">If you use this database or the AI assistant, please cite the published article.</p>
          <div>
            <div className="flex items-center justify-between mb-2">
              <AboutLabel>APA 7</AboutLabel>
              <button type="button" onClick={() => handleCopy('apa', ABOUT_APA_TEXT)} className={btnSmall}>
                {copied === 'apa' ? 'Copied ✓' : 'Copy citation'}
              </button>
            </div>
            <div className="border-l-2 border-slate-300 bg-stone-50 rounded-r-md px-4 py-3 text-[15px] text-slate-800 leading-relaxed">
              Esterellas Hernandez, C., &amp; Chau, A. D. (2026). Artificial intelligence and digital
              technologies in electrical construction: A systematic review of applications, maturity, and
              research directions. <span className="italic">International Journal of Construction Management</span>.
              Advance online publication. <AboutLink href={ABOUT_DOI_URL}>{ABOUT_DOI_URL}</AboutLink>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
              <AboutLabel>BibTeX</AboutLabel>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleCopy('bib', ABOUT_BIBTEX)} className={btnSmall}>
                  {copied === 'bib' ? 'Copied ✓' : 'Copy BibTeX'}
                </button>
                <button type="button" onClick={() => aboutDownload('citation.bib', ABOUT_BIBTEX, 'application/x-bibtex')} className={btnSmall}>.bib</button>
                <button type="button" onClick={() => aboutDownload('citation.ris', ABOUT_RIS, 'application/x-research-info-systems')} className={btnSmall}>.ris</button>
              </div>
            </div>
            <pre className="bg-slate-900 text-slate-100 text-xs leading-relaxed rounded-md p-4 overflow-x-auto whitespace-pre scrollbar-thin">{ABOUT_BIBTEX}</pre>
          </div>
        </AboutSection>

        {/* ---------- Authors ---------- */}
        <AboutSection label="Authors" title="Who we are">
          <div className="grid sm:grid-cols-2 gap-4">
            {ABOUT_AUTHORS.map((a) => (
              <div key={a.name} className="border border-slate-200 rounded-lg p-5">
                <div className="serif text-lg text-slate-900 font-semibold">
                  {a.name}
                  {a.corresponding && <span className="text-slate-500" title="Corresponding author"> *</span>}
                </div>
                <div className="text-sm text-slate-700 mt-1">{a.role}</div>
                <div className="text-sm text-slate-500 mt-1">{a.affil}</div>
                <div className="mt-3 space-y-1 text-sm">
                  <div>
                    <a href={`https://orcid.org/${a.orcid}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900">
                      <OrcidIcon /> <span className="underline decoration-slate-300 underline-offset-2">orcid.org/{a.orcid}</span>
                    </a>
                  </div>
                  <div>
                    <a href={`mailto:${a.email}`} className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700 break-all">{a.email}</a>
                  </div>
                </div>
                {a.corresponding && (
                  <div className="mt-3 inline-block text-[11px] uppercase tracking-[0.14em] font-semibold text-slate-600 bg-stone-100 border border-stone-200 rounded px-2 py-0.5">
                    Corresponding author
                  </div>
                )}
              </div>
            ))}
          </div>
        </AboutSection>

        {/* ---------- How it was built ---------- */}
        <AboutSection label="Data and methods" title="How this webapp was built">
          <div>
            <AboutLabel>Evidence base</AboutLabel>
            <p>
              The review followed <strong>PRISMA 2020</strong> for identification and screening and{' '}
              <strong>SWiM</strong> (Synthesis Without Meta-analysis) for reporting the synthesis. Scopus and
              Web of Science were searched on <strong>23 April 2026</strong>.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <AboutStat value="1,085" label="records identified" />
              <AboutStat value="535" label="screened on title/abstract" />
              <AboutStat value="172" label="full texts assessed" />
              <AboutStat value="129" label="studies included" />
            </div>
            <p className="mt-3">
              The <strong>Dashboard</strong> presents the analytical views from the paper,{' '}
              <strong>All papers</strong> lets you search and filter the coded records, and{' '}
              <strong>Methodology</strong> documents the search, screening, and coding scheme.
            </p>
          </div>
          <div>
            <AboutLabel>AI assistant (retrieval-augmented generation)</AboutLabel>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Each of the 129 papers is embedded with <strong>Gemini Embedding 001</strong> into a 768-dimensional vector.</li>
              <li>Your question is embedded the same way, and the most similar papers are retrieved by cosine similarity.</li>
              <li>The retrieved papers are passed as context to <strong>Gemini 2.5 Flash</strong>, which writes an answer that cites them.</li>
              <li>Requests go through a <strong>Cloudflare Worker</strong> proxy, so no API key is exposed in the browser.</li>
            </ol>
          </div>
          <div>
            <AboutLabel>Tech stack</AboutLabel>
            <div className="flex flex-wrap gap-2">
              {['React 18', 'Tailwind CSS', 'PapaParse', 'Gemini Embedding 001', 'Gemini 2.5 Flash', 'Cloudflare Workers', 'Cloudflare Pages', 'GitHub'].map((t) => (
                <span key={t} className="text-xs text-slate-700 bg-stone-50 border border-slate-200 rounded px-2 py-1">{t}</span>
              ))}
            </div>
          </div>
        </AboutSection>

        {/* ---------- Limitations ---------- */}
        <AboutSection label="Limitations" title="Use the AI assistant with care">
          <div className="border border-amber-200 bg-amber-50 rounded-md px-4 py-3 text-sm text-amber-900">
            AI-generated answers can contain errors, omissions, or misattributions. Always check claims
            against the cited papers before relying on them.
          </div>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>It inherits the skews of the evidence base.</strong> The reviewed literature is BIM-centric, phase-concentrated, and thin on field-tested outcomes, and the answers reflect that.</li>
            <li><strong>Retrieval can miss the point.</strong> Embedding similarity can surface papers that are semantically close but contextually mismatched.</li>
            <li><strong>It is a snapshot.</strong> The index is fixed at the review cutoff (23 April 2026) and will drift unless it is periodically re-embedded.</li>
            <li><strong>It has not been evaluated with users.</strong> No usability evaluation with electrical contractors has been conducted.</li>
          </ul>
        </AboutSection>

        {/* ---------- Funding ---------- */}
        <AboutSection label="Funding and acknowledgments" title="Support">
          <p>
            This work was supported by <strong>ELECTRI International</strong> under the Partnership for
            Career Advancement (PCA) Program and by <strong>Florida Gulf Coast University</strong> under the
            Work in Scholarly and Experiential Research (WiSER) Student Research Internship Program.
          </p>
        </AboutSection>

        {/* ---------- Contact ---------- */}
        <AboutSection label="Contact" title="Questions, corrections, or collaboration">
          <p>
            For questions about the review, corrections to a coded record, or collaboration, contact the
            corresponding author, <strong>Anh D. Chau</strong>, at{' '}
            <a href="mailto:achau@fgcu.edu" className="text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700">achau@fgcu.edu</a>.
          </p>
          <p className="text-sm text-slate-500">
            Sister project:{' '}
            <AboutLink href="https://cm.electriai.com/">AI in Construction Management, a systematic review database</AboutLink>.
          </p>
        </AboutSection>
      </div>
    );
  };

  window.AppViews.AllPapersView    = AllPapersView;
  window.AppViews.MethodologyView  = MethodologyView;
  window.AppViews.AIAssistantView  = AIAssistantView;
  window.AppViews.AboutView        = AboutView;
})();