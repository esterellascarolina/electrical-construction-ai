/* =========================================================
   StackedAreaChart — matches Python Stacked_Chart_80_.py

   Changes from original bar-chart version:
   • Stacked area (continuous) instead of stacked bars
   • SVG hatch patterns (one per theme, matching Python HATCHES)
   • Light plot background #F9F9FB
   • Annual total labels above each stack (years ≥ 3 papers)
   • 50% reference line on right axis
   • Insight annotation with curved arrow
   • White band separators
   • Full year range including gaps (Python range(min,max+1))
   • Y-axes properly labelled
   • Right axis range 0–115%, ticks at 0/25/50/75/100
   • Click a band → drill-down for all papers in that theme
   ========================================================= */

window.AppCharts = window.AppCharts || {};

(function () {
  const { useState, useMemo } = React;
  const { PaperListBlock, PaperDetail } = window.AppComponents;

  const PALETTE = [
    '#3A5FA0', '#2196A6', '#0096C7', '#6A3D9A',
    '#F4A261', '#E76F51', '#D62828', '#E9C46A',
    '#2D6A4F', '#52B788', '#C77DFF', '#B5838D',
  ];

  // Matches Python HATCHES list (index 0 = bottom band = null = solid)
  const HATCH_IDS = [
    null,       // solid
    'dots',     // .
    'xcross',   // x
    'fwd',      // /
    'bwd',      // \
    'plus',     // +
    'horiz',    // -
    'vert',     // |
    'circles',  // o
    'ddots',    // ..
    'dxcross',  // xx
    'dfwd',     // //
  ];

  const COL = 'key_findings themes';

  const StackedAreaChart = ({ rows }) => {
    const [sel, setSel]           = useState(null); // { theme }
    const [selPaper, setSelPaper] = useState(null);

    const hasData = useMemo(() => rows.some(r => r[COL]), [rows]);

    const { allYears, themes, colorOf, matrix, ftPct, maxTotal } = useMemo(() => {
      if (!hasData) return { allYears:[], themes:[], colorOf:{}, matrix:{}, ftPct:{}, maxTotal:1 };

      const valid = rows.filter(r => r[COL] && r.Year);

      // Full year range including gaps, matching Python range(min,max+1)
      const ys = valid.map(r => r.Year);
      const minYr = Math.min(...ys), maxYr = Math.max(...ys);
      const allYears = [];
      for (let y = minYr; y <= maxYr; y++) allYears.push(y);

      // Themes sorted by total count desc (highest = index 0 = bottom band)
      const tc = {};
      for (const r of valid) tc[r[COL]] = (tc[r[COL]] || 0) + 1;
      const themes = Object.entries(tc).sort((a,b) => b[1]-a[1]).map(([t]) => t);

      const colorOf = {};
      themes.forEach((t, i) => { colorOf[t] = PALETTE[i % PALETTE.length]; });

      // Paper count per (theme × year)
      const matrix = {};
      for (const t of themes) {
        matrix[t] = {};
        for (const yr of allYears)
          matrix[t][yr] = valid.filter(r => r[COL] === t && r.Year === yr).length;
      }

      // Field-tested % per year
      const ftPct = {};
      for (const yr of allYears) {
        const yr_rows = valid.filter(r => r.Year === yr);
        const ft = yr_rows.filter(r => r.maturity_level === 'Field-tested').length;
        ftPct[yr] = yr_rows.length ? (ft / yr_rows.length) * 100 : null;
      }

      const maxTotal = Math.max(...allYears.map(yr =>
        themes.reduce((s,t) => s + (matrix[t][yr]||0), 0)), 1);

      return { allYears, themes, colorOf, matrix, ftPct, maxTotal };
    }, [rows, hasData]);

    // ── SVG layout ──────────────────────────────────────
    const W=760, H=340, pL=54, pR=70, pT=24, pB=38;
    const plotW = W - pL - pR;
    const plotH = H - pT - pB;
    const n = allYears.length;
    const xOf   = i  => pL + (n > 1 ? (i / (n-1)) * plotW : plotW/2);
    const yMax  = maxTotal * 1.14;
    const yLeft  = v  => pT + plotH - (v / Math.max(yMax,1)) * plotH;
    const yRight = v  => pT + plotH - (v / 115) * plotH;

    // ── Stacked area polygons ───────────────────────────
    const stackAreas = themes.map((t, ti) => {
      const tops = allYears.map(yr => {
        let s = 0;
        for (let j = 0; j <= ti; j++) s += matrix[themes[j]][yr] || 0;
        return s;
      });
      const bots = allYears.map(yr => {
        let s = 0;
        for (let j = 0; j < ti; j++) s += matrix[themes[j]][yr] || 0;
        return s;
      });
      const topPts = tops.map((v,i) => `${xOf(i).toFixed(1)},${yLeft(v).toFixed(1)}`);
      const botPts = bots.map((v,i) => `${xOf(i).toFixed(1)},${yLeft(v).toFixed(1)}`).reverse();
      return { t, tops, bots, points: [...topPts, ...botPts].join(' ') };
    });

    // ── Separator polylines (one per cumulative boundary) ──
    const sepLines = themes.map((_, ti) =>
      allYears.map((yr, i) => {
        let s = 0;
        for (let j = 0; j <= ti; j++) s += matrix[themes[j]][yr] || 0;
        return `${xOf(i).toFixed(1)},${yLeft(s).toFixed(1)}`;
      }).join(' ')
    );

    // ── Annual totals ───────────────────────────────────
    const annualTotals = allYears.map(yr =>
      themes.reduce((s,t) => s + (matrix[t][yr]||0), 0));

    // ── FT% line ────────────────────────────────────────
    const ftPairs = allYears
      .map((yr,i) => ftPct[yr] != null ? { x: xOf(i), y: yRight(ftPct[yr]) } : null)
      .filter(Boolean);
    const ftPath = ftPairs.map((p,i) =>
      `${i?'L':'M'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // ── Left axis ticks ─────────────────────────────────
    const tickStep = Math.max(1, Math.ceil(maxTotal / 5));
    const leftTicks = [];
    for (let v = 0; v <= Math.ceil(yMax) + tickStep; v += tickStep) leftTicks.push(v);

    // ── Annotation (dynamic year lookup) ────────────────
    const arrowYi = allYears.indexOf(2024);
    const textYi  = allYears.indexOf(2020);
    const annArrowX = arrowYi >= 0 ? xOf(arrowYi) : null;
    const annArrowY = annArrowX    ? yRight(29)    : null;
    const annTxtX   = textYi  >= 0 ? xOf(textYi) - 10  : null;
    const annTxtY   = annTxtX      ? yRight(82)   : null;

    // ── Drill-down papers ───────────────────────────────
    const selPapers = useMemo(() => {
      if (!sel) return [];
      return rows.filter(r => r[COL] === sel.theme)
                 .sort((a,b) => (a.Year||0) - (b.Year||0));
    }, [rows, sel]);

    if (!hasData) return (
      <div className="text-sm text-slate-500 text-center py-8 italic">
        Column "{COL}" not found in data.csv
      </div>
    );

    return (
      <div>
        <p className="text-[11px] text-slate-400 italic mb-2 select-none">
          Stacked areas = paper count by theme · Dashed line = % Field-tested (right axis) · Click a band to see papers
        </p>
        <div style={{ overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`}
               style={{ width:'100%', minWidth:520, height:'auto', display:'block' }}>
            <defs>
              {/* ── Hatch patterns (transparent bg, dark marks) ── */}
              <pattern id="hp-dots"    patternUnits="userSpaceOnUse" width="5"  height="5">
                <circle cx="2.5" cy="2.5" r="0.7" fill="rgba(0,0,0,0.28)"/>
              </pattern>
              <pattern id="hp-xcross"  patternUnits="userSpaceOnUse" width="6"  height="6">
                <path d="M0,0 L6,6 M6,0 L0,6" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" fill="none"/>
              </pattern>
              <pattern id="hp-fwd"     patternUnits="userSpaceOnUse" width="6"  height="6">
                <path d="M-1,7 L7,-1 M-1,1 L1,-1 M5,7 L7,5" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" fill="none"/>
              </pattern>
              <pattern id="hp-bwd"     patternUnits="userSpaceOnUse" width="6"  height="6">
                <path d="M-1,-1 L7,7 M-1,5 L1,7 M5,-1 L7,1" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" fill="none"/>
              </pattern>
              <pattern id="hp-plus"    patternUnits="userSpaceOnUse" width="7"  height="7">
                <path d="M3.5,0 L3.5,7 M0,3.5 L7,3.5" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" fill="none"/>
              </pattern>
              <pattern id="hp-horiz"   patternUnits="userSpaceOnUse" width="6"  height="5">
                <path d="M0,2.5 L6,2.5" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" fill="none"/>
              </pattern>
              <pattern id="hp-vert"    patternUnits="userSpaceOnUse" width="5"  height="6">
                <path d="M2.5,0 L2.5,6" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" fill="none"/>
              </pattern>
              <pattern id="hp-circles" patternUnits="userSpaceOnUse" width="9"  height="9">
                <circle cx="4.5" cy="4.5" r="2.2" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7"/>
              </pattern>
              <pattern id="hp-ddots"   patternUnits="userSpaceOnUse" width="3"  height="3">
                <circle cx="1.5" cy="1.5" r="0.5" fill="rgba(0,0,0,0.28)"/>
              </pattern>
              <pattern id="hp-dxcross" patternUnits="userSpaceOnUse" width="4"  height="4">
                <path d="M0,0 L4,4 M4,0 L0,4" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" fill="none"/>
              </pattern>
              <pattern id="hp-dfwd"    patternUnits="userSpaceOnUse" width="4"  height="4">
                <path d="M-1,5 L5,-1 M-1,1 L1,-1 M3,5 L5,3" stroke="rgba(0,0,0,0.22)" strokeWidth="0.7" fill="none"/>
              </pattern>
              {/* Arrow marker for annotation */}
              <marker id="ann-arrow" markerWidth="6" markerHeight="4"
                      refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4 Z" fill="#B30000"/>
              </marker>
            </defs>

            {/* Plot-area background */}
            <rect x={pL} y={pT} width={plotW} height={plotH} fill="#F9F9FB"/>

            {/* Horizontal grid lines */}
            {leftTicks.map(v => (
              <line key={v}
                x1={pL} y1={yLeft(v)} x2={pL+plotW} y2={yLeft(v)}
                stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 2"/>
            ))}

            {/* 50% reference line */}
            <line x1={pL} y1={yRight(50)} x2={pL+plotW} y2={yRight(50)}
              stroke="#555555" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.55"/>
            <text x={pL+plotW+3} y={yRight(50)-2} fontSize="8" fill="#555555">50%</text>

            {/* ── Stacked area bands ─────────────────────── */}
            {stackAreas.map(({ t, points }, ti) => {
              const isS = sel?.theme === t;
              const dim = sel && !isS;
              const hid = HATCH_IDS[ti % HATCH_IDS.length];
              return (
                <g key={t} style={{ cursor:'pointer' }}
                   onClick={() => setSel(prev => prev?.theme===t ? null : { theme:t })}>
                  {/* Solid colour fill */}
                  <polygon points={points}
                    fill={colorOf[t]} opacity={dim ? 0.2 : 0.82} stroke="none"
                    style={{ transition:'opacity 150ms' }}/>
                  {/* Hatch overlay */}
                  {hid && (
                    <polygon points={points}
                      fill={`url(#hp-${hid})`} opacity={dim ? 0.2 : 1} stroke="none"
                      style={{ transition:'opacity 150ms' }}/>
                  )}
                  {/* Selection highlight */}
                  {isS && (
                    <polygon points={points}
                      fill="none" stroke="#0f172a" strokeWidth="1.5"/>
                  )}
                </g>
              );
            })}

            {/* White band separators */}
            {sepLines.map((pts, ti) => (
              <polyline key={`sep-${ti}`} points={pts}
                fill="none" stroke="white" strokeWidth="0.7" opacity="0.6"/>
            ))}

            {/* Field-tested % dashed line */}
            {ftPath && (<>
              <path d={ftPath} fill="none" stroke="#1B1B1B"
                strokeWidth="1.6" strokeDasharray="6 3"/>
              {ftPairs.map((p,i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3"
                  fill="white" stroke="#1B1B1B" strokeWidth="1.2"/>
              ))}
            </>)}

            {/* Annual total labels — shown for every year, including 0 */}
            {annualTotals.map((tot,i) => (
              <text key={i} x={xOf(i)} y={yLeft(tot)-3}
                textAnchor="middle" fontSize="8.5"
                fill="#333333" fontWeight="600">
                {tot}
              </text>
            ))}

            {/* Annotation with curved arrow */}
            {annArrowX && annTxtX && (<>
              <path
                d={`M ${annTxtX},${annTxtY+22} C ${annTxtX+30},${(annTxtY+annArrowY)/2} ${annArrowX-30},${(annTxtY+annArrowY)/2} ${annArrowX},${annArrowY}`}
                fill="none" stroke="#B30000" strokeWidth="1.1"
                markerEnd="url(#ann-arrow)"/>
              <rect x={annTxtX-54} y={annTxtY-12} width={108} height={40}
                rx="4" fill="white" stroke="#B30000" strokeWidth="0.9" opacity="0.92"/>
              <text x={annTxtX} y={annTxtY+1}  textAnchor="middle" fontSize="8.5" fill="#B30000" fontWeight="700">Volume surges post-2021</text>
              <text x={annTxtX} y={annTxtY+13} textAnchor="middle" fontSize="8.5" fill="#B30000" fontWeight="700">but field-tested share</text>
              <text x={annTxtX} y={annTxtY+25} textAnchor="middle" fontSize="8.5" fill="#B30000" fontWeight="700">falls to ~29–45%</text>
            </>)}

            {/* X-axis baseline */}
            <line x1={pL} y1={pT+plotH} x2={pL+plotW} y2={pT+plotH}
              stroke="#AAAAAA" strokeWidth="0.8"/>

            {/* X-axis labels — every 2 years to avoid crowding */}
            {allYears.map((yr, i) => {
              if (n > 12 && yr % 2 !== 0) return null;
              return (
                <text key={yr} x={xOf(i)} y={pT+plotH+14}
                  textAnchor="middle" fontSize="9" fill="#64748b">
                  {yr}
                </text>
              );
            })}

            {/* Left Y-axis */}
            <line x1={pL} y1={pT} x2={pL} y2={pT+plotH}
              stroke="#AAAAAA" strokeWidth="0.8"/>
            {leftTicks.filter(v => v <= Math.ceil(yMax)).map(v => (
              <g key={v}>
                <line x1={pL-3} y1={yLeft(v)} x2={pL} y2={yLeft(v)}
                  stroke="#AAAAAA" strokeWidth="0.8"/>
                <text x={pL-5} y={yLeft(v)+3.5}
                  textAnchor="end" fontSize="8.5" fill="#64748b">{v}</text>
              </g>
            ))}
            <text x={11} y={pT+plotH/2} textAnchor="middle" fontSize="9" fill="#334155"
              transform={`rotate(-90,11,${pT+plotH/2})`}>
              Number of papers published
            </text>

            {/* Right Y-axis */}
            <line x1={pL+plotW} y1={pT} x2={pL+plotW} y2={pT+plotH}
              stroke="#555555" strokeWidth="0.8"/>
            {[0,25,50,75,100].map(v => (
              <g key={v}>
                <line x1={pL+plotW} y1={yRight(v)} x2={pL+plotW+3} y2={yRight(v)}
                  stroke="#555555" strokeWidth="0.8"/>
                <text x={pL+plotW+5} y={yRight(v)+3.5}
                  textAnchor="start" fontSize="8.5" fill="#555555">{v}%</text>
              </g>
            ))}
            <text x={W-9} y={pT+plotH/2} textAnchor="middle" fontSize="9" fill="#222222"
              transform={`rotate(90,${W-9},${pT+plotH/2})`}>
              Share of that year's papers rated Field-tested
            </text>
          </svg>
        </div>

        {/* ── Legend (HTML, below SVG, 2-column grid) ── */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[10px] text-slate-500 mb-2 font-medium">
            Research theme &nbsp;·&nbsp; bands stacked bottom → top = highest → lowest total volume
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-2">
            {[...themes].reverse().map((t) => {
              const ti = themes.indexOf(t);
              const hid = HATCH_IDS[ti % HATCH_IDS.length];
              return (
                <div key={t} className="flex items-center gap-2 text-xs text-slate-600">
                  {/* Swatch: solid colour + hatch overlay in small SVG */}
                  <svg width="18" height="13" style={{ flexShrink:0 }}>
                    <defs>
                      {hid && (
                        <pattern id={`leg-${ti}`} patternUnits="userSpaceOnUse"
                          width={hid==='ddots'?3:hid==='dxcross'||hid==='dfwd'?4:hid==='circles'?9:hid==='dots'?5:6}
                          height={hid==='ddots'?3:hid==='dxcross'||hid==='dfwd'?4:hid==='circles'?9:hid==='dots'?5:hid==='vert'?6:5}>
                          {hid==='dots'    && <circle cx="2.5" cy="2.5" r="0.7" fill="rgba(0,0,0,0.3)"/>}
                          {hid==='xcross'  && <path d="M0,0 L6,6 M6,0 L0,6" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none"/>}
                          {hid==='fwd'     && <path d="M-1,7 L7,-1 M-1,1 L1,-1 M5,7 L7,5" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none"/>}
                          {hid==='bwd'     && <path d="M-1,-1 L7,7 M-1,5 L1,7 M5,-1 L7,1" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none"/>}
                          {hid==='plus'    && <path d="M3,0 L3,6 M0,3 L6,3" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none"/>}
                          {hid==='horiz'   && <path d="M0,2.5 L6,2.5" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none"/>}
                          {hid==='vert'    && <path d="M2.5,0 L2.5,6" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none"/>}
                          {hid==='circles' && <circle cx="4.5" cy="4.5" r="2.2" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7"/>}
                          {hid==='ddots'   && <circle cx="1.5" cy="1.5" r="0.5" fill="rgba(0,0,0,0.3)"/>}
                          {hid==='dxcross' && <path d="M0,0 L4,4 M4,0 L0,4" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none"/>}
                          {hid==='dfwd'    && <path d="M-1,5 L5,-1 M-1,1 L1,-1 M3,5 L5,3" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" fill="none"/>}
                        </pattern>
                      )}
                    </defs>
                    <rect x="0" y="0" width="18" height="13" rx="1"
                      fill={colorOf[t]} opacity="0.88"/>
                    {hid && <rect x="0" y="0" width="18" height="13" rx="1"
                      fill={`url(#leg-${ti})`}/>}
                  </svg>
                  <span>{t}</span>
                </div>
              );
            })}
          </div>
          {/* FT% line entry */}
          <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
            <svg width="26" height="13" style={{ flexShrink:0 }}>
              <line x1="1" y1="6.5" x2="25" y2="6.5"
                stroke="#1B1B1B" strokeWidth="1.6" strokeDasharray="5 2"/>
              <circle cx="13" cy="6.5" r="3"
                fill="white" stroke="#1B1B1B" strokeWidth="1.2"/>
            </svg>
            <span>% Field-tested (right axis)</span>
          </div>
        </div>

        {/* Drill-down */}
        {sel && (
          <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg animate-fade">
            <PaperListBlock
              papers={selPapers}
              bucketLabel={sel.theme}
              contextLabel="Papers in this research theme"
              onClose={() => setSel(null)}
              onSelectPaper={setSelPaper}
            />
          </div>
        )}
        <PaperDetail paper={selPaper} onClose={() => setSelPaper(null)}/>
      </div>
    );
  };

  window.AppCharts.StackedArea = StackedAreaChart;
})();