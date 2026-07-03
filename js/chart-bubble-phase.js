/* =========================================================
   BubblePhase  —  AI Technique (Y) × Construction Phase (X)

   Registers: window.AppCharts.BubblePhase

   Props: { rows }   (normalized records from data.csv)

   Design matches the Python Bubble_Chart_70_.py:
     • Bubble area ∝ paper count in that cell
     • Fill colour = maturity level
       Conceptual:    warm coral   #F4A793
       Lab-validated: steel blue   #A8C8DC
       Field-tested:  sage green   #A3CCB5
     • Multiple maturity levels in one cell → side-by-side bubbles
     • Y axis: AI techniques ordered most-studied → least (top → bottom)
     • "Not applicable" values filtered from both axes

   Interaction:
     • Click any bubble → drill-down panel below chart lists every
       paper at that (ai_technique × construction_phase) intersection
     • Clicking again, or ×, dismisses the drill-down
   ========================================================= */

window.AppCharts = window.AppCharts || {};

(function () {
  const { useState, useMemo } = React;
  const { PaperListBlock, PaperDetail } = window.AppComponents;

  // ── Constants ─────────────────────────────────────────────
  const PHASE_ORDER = ['Preconstruction', 'Execution', 'Closeout or O&M', 'Multiple phases'];
  const MAT_ORDER   = ['Conceptual', 'Lab-validated', 'Field-tested'];

  const MAT_COLORS = {
    'Conceptual':    '#F4A793',
    'Lab-validated': '#A8C8DC',
    'Field-tested':  '#A3CCB5',
  };

  // Layout constants (SVG units)
  const LEFT_W  = 172;   // space for Y-axis tech labels
  const COL_W   = 118;   // width per construction-phase column
  const ROW_H   = 46;    // height per AI-technique row
  const HEAD_H  = 54;    // header row height (phase labels)
  const PAD_B   = 16;    // bottom padding

  // Offset of side-by-side bubbles within a cell (for multi-maturity cells)
  const CELL_OFFSETS = { 1: [0], 2: [-15, 15], 3: [-23, 0, 23] };

  // ── Bubble-radius scale ───────────────────────────────────
  const MAX_R = 20;
  const MIN_R = 5;
  const bubbleR = (count, maxCount) =>
    Math.max(MIN_R, Math.sqrt(count / Math.max(maxCount, 1)) * MAX_R);

  // ── Component ─────────────────────────────────────────────
  const BubblePhaseChart = ({ rows }) => {
    const [sel, setSel]           = useState(null); // { tech, phase }
    const [selPaper, setSelPaper] = useState(null);

    // ── Aggregate data ────────────────────────────────────
    const { techLabels, groupedCells, maxCount } = useMemo(() => {
      const valid = rows.filter(r =>
        r.ai_technique?.length &&
        r.construction_phase?.length &&
        r.maturity_level
      );

      // cell accumulator: "tech||phase||maturity" → { count, papers: Set }
      const cellMap  = new Map();
      const techFreq = new Map();

      for (const row of valid) {
        // ai_technique is multi-value; filter meaningless tokens
        const techs = row.ai_technique.filter(
          t => t && !['not applicable', 'n/a', 'none'].includes(t.toLowerCase())
        );
        // construction_phase is multi-value; keep only the four charted phases
        const phases = (row.construction_phase || []).filter(p => PHASE_ORDER.includes(p));
        const mat = row.maturity_level;

        for (const t of techs) {
          techFreq.set(t, (techFreq.get(t) || 0) + 1);
          for (const p of phases) {
            const key = `${t}||${p}||${mat}`;
            if (!cellMap.has(key))
              cellMap.set(key, { tech: t, phase: p, maturity: mat, papers: new Set() });
            cellMap.get(key).papers.add(row);
          }
        }
      }

      // Y-axis order: most-studied technique at top
      const techLabels = [...techFreq.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);

      // Group by (tech, phase) → array of maturity cells, sorted by MAT_ORDER
      const grouped = new Map();
      for (const [, cell] of cellMap) {
        const gk = `${cell.tech}||${cell.phase}`;
        if (!grouped.has(gk)) grouped.set(gk, []);
        grouped.get(gk).push({ ...cell, papers: [...cell.papers], count: cell.papers.size });
      }
      for (const arr of grouped.values())
        arr.sort((a, b) => MAT_ORDER.indexOf(a.maturity) - MAT_ORDER.indexOf(b.maturity));

      const maxCount = Math.max(...[...grouped.values()].flat().map(c => c.count), 1);

      return { techLabels, groupedCells: grouped, maxCount };
    }, [rows]);

    // ── SVG dimensions (data-driven) ─────────────────────
    const svgW = LEFT_W + PHASE_ORDER.length * COL_W;
    const svgH = HEAD_H + techLabels.length * ROW_H + PAD_B;

    // ── Selected papers ───────────────────────────────────
    const selPapers = useMemo(() => {
      if (!sel) return [];
      const group = groupedCells.get(`${sel.tech}||${sel.phase}`) || [];
      const seen  = new Map();
      for (const cell of group)
        for (const p of cell.papers)
          seen.set(p.ID || p.Title, p);
      return [...seen.values()].sort((a, b) => (a.Title || '').localeCompare(b.Title || ''));
    }, [sel, groupedCells]);

    const toggle = (tech, phase) => {
      if (sel && sel.tech === tech && sel.phase === phase) setSel(null);
      else setSel({ tech, phase });
    };

    return (
      <div>
        <p className="text-[11px] text-slate-400 italic mb-2 select-none">
          Bubble area = paper count &nbsp;·&nbsp; Color = maturity level &nbsp;·&nbsp; Click a bubble to see papers
        </p>

        {/* ── SVG chart ────────────────────────────────── */}
        <div style={{ overflowX: 'auto' }}>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            style={{ width: '100%', height: 'auto', minWidth: 480, display: 'block' }}
          >
            {/* Phase header labels */}
            {PHASE_ORDER.map((p, pi) => (
              <text key={p}
                x={LEFT_W + pi * COL_W + COL_W / 2}
                y={32}
                textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#475569"
              >
                {p}
              </text>
            ))}

            {/* Horizontal row dividers */}
            {techLabels.map((_, ti) => (
              <line key={`h${ti}`}
                x1={0} y1={HEAD_H + ti * ROW_H}
                x2={svgW} y2={HEAD_H + ti * ROW_H}
                stroke="#f1f5f9" strokeWidth="1"
              />
            ))}

            {/* Vertical column dividers */}
            {PHASE_ORDER.map((_, pi) => (
              <line key={`v${pi}`}
                x1={LEFT_W + pi * COL_W} y1={HEAD_H - 8}
                x2={LEFT_W + pi * COL_W} y2={svgH}
                stroke="#f1f5f9" strokeWidth="1"
              />
            ))}

            {/* Y-axis: AI technique labels */}
            {techLabels.map((t, ti) => (
              <text key={t}
                x={LEFT_W - 10}
                y={HEAD_H + ti * ROW_H + ROW_H / 2 + 4}
                textAnchor="end" fontSize="10" fill="#475569"
              >
                {t}
              </text>
            ))}

            {/* Bubbles */}
            {[...groupedCells.entries()].map(([gk, group]) => {
              const { tech, phase } = group[0];
              const ti = techLabels.indexOf(tech);
              const pi = PHASE_ORDER.indexOf(phase);
              if (ti === -1 || pi === -1) return null;

              const cy      = HEAD_H + ti * ROW_H + ROW_H / 2;
              const baseCx  = LEFT_W + pi * COL_W + COL_W / 2;
              const n       = group.length;
              const offsets = CELL_OFFSETS[Math.min(n, 3)] || [0];
              const isS     = sel && sel.tech === tech && sel.phase === phase;

              return group.map((cell, gi) => {
                const cx = baseCx + (offsets[gi] || 0);
                const r  = bubbleR(cell.count, maxCount);

                return (
                  <g key={`${gk}|${gi}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggle(tech, phase)}
                  >
                    <circle
                      cx={cx} cy={cy} r={r}
                      fill={MAT_COLORS[cell.maturity] || '#ccc'}
                      stroke={isS ? '#334155' : 'rgba(255,255,255,0.75)'}
                      strokeWidth={isS ? 2.2 : 1.6}
                      opacity={sel ? (isS ? 1 : 0.3) : 0.9}
                      style={{ transition: 'opacity 0.15s ease' }}
                    />
                    <text
                      x={cx} y={cy}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={Math.min(10, r * 0.82).toFixed(1)}
                      fontWeight="700" fill="#000000"
                      style={{ pointerEvents: 'none' }}
                    >
                      {cell.count}
                    </text>
                  </g>
                );
              });
            })}
          </svg>
        </div>

        {/* ── Maturity legend ───────────────────────────── */}
        <div className="flex flex-wrap gap-4 mt-3">
          {MAT_ORDER.map(m => (
            <div key={m} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span style={{
                display: 'inline-block', width: 13, height: 13, borderRadius: '50%',
                background: MAT_COLORS[m], border: '1.5px solid rgba(0,0,0,0.08)',
              }} />
              {m}
            </div>
          ))}
        </div>

        {/* ── Drill-down paper list ─────────────────────── */}
        {sel && (
          <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg animate-fade">
            <PaperListBlock
              papers={selPapers}
              bucketLabel={`${sel.tech}  ×  ${sel.phase}`}
              contextLabel="Papers at this intersection"
              onClose={() => setSel(null)}
              onSelectPaper={setSelPaper}
            />
          </div>
        )}

        <PaperDetail paper={selPaper} onClose={() => setSelPaper(null)} />
      </div>
    );
  };

  window.AppCharts.BubblePhase = BubblePhaseChart;
})();