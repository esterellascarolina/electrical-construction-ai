/* =========================================================
   Streamgraph
   Year × contribution_type × maturity_level.
   Symmetric (silhouette) baseline. Smooth catmull-rom curves.
   Click a stream → drill-down papers below.
   ========================================================= */

window.AppCharts = window.AppCharts || {};

(function () {
  const { useState, useMemo } = React;
  const { PaperListBlock, PaperDetail } = window.AppComponents;

  const CONTRIB_ORDER = [
    'Empirical finding','Framework','Tool','Novel algorithm',
    'Best practices','Review','Conceptual model',
    'Dataset or benchmark','Taxonomy or classification',
  ];

  const CONTRIB_COLORS = {
    'Empirical finding':          '#7EB8D4',
    'Framework':                  '#6EBF88',
    'Tool':                       '#F0BE6A',
    'Novel algorithm':            '#B09ED4',
    'Best practices':             '#70CCCC',
    'Review':                     '#F47070',
    'Conceptual model':           '#E8D060',
    'Dataset or benchmark':       '#F09090',
    'Taxonomy or classification': '#99B860',
  };

  const MAT_ORDER = ['Field-tested','Lab-validated','Conceptual'];
  const COL_CONTRIB = 'contribution_type';

  // Catmull-Rom → cubic bezier. Returns SVG path string starting with M.
  const crPath = (xs, ys) => {
    if (!xs.length) return '';
    let d = `M ${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
    for (let i = 0; i < xs.length - 1; i++) {
      const p0x = xs[Math.max(0,i-1)], p0y = ys[Math.max(0,i-1)];
      const p1x = xs[i],     p1y = ys[i];
      const p2x = xs[i+1],   p2y = ys[i+1];
      const p3x = xs[Math.min(xs.length-1,i+2)], p3y = ys[Math.min(ys.length-1,i+2)];
      const cp1x = p1x + (p2x-p0x)/6, cp1y = p1y + (p2y-p0y)/6;
      const cp2x = p2x - (p3x-p1x)/6, cp2y = p2y - (p3y-p1y)/6;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}`;
    }
    return d;
  };

  // Closed area path: top edge L→R, then bottom edge R→L, close with Z.
  const areaPath = (xs, topYs, botYs) => {
    const top = crPath(xs, topYs);
    const rXs  = [...xs].reverse();
    const rYs  = [...botYs].reverse();
    let d = top + ` L ${rXs[0].toFixed(1)},${rYs[0].toFixed(1)}`;
    for (let i = 0; i < rXs.length - 1; i++) {
      const p0x = rXs[Math.max(0,i-1)], p0y = rYs[Math.max(0,i-1)];
      const p1x = rXs[i],     p1y = rYs[i];
      const p2x = rXs[i+1],   p2y = rYs[i+1];
      const p3x = rXs[Math.min(rXs.length-1,i+2)], p3y = rYs[Math.min(rYs.length-1,i+2)];
      const cp1x = p1x+(p2x-p0x)/6, cp1y = p1y+(p2y-p0y)/6;
      const cp2x = p2x-(p3x-p1x)/6, cp2y = p2y-(p3y-p1y)/6;
      d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}`;
    }
    return d + ' Z';
  };

  const StreamgraphChart = ({ rows }) => {
    const [sel, setSel]           = useState(null); // { contrib, maturity }
    const [hover, setHover]       = useState(null);
    const [selPaper, setSelPaper] = useState(null);

    const hasData = useMemo(() => rows.some(r => r[COL_CONTRIB]), [rows]);

    const { years, streams, tops, bots, maxHalf } = useMemo(() => {
      if (!hasData) return { years:[], streams:[], tops:[], bots:[], maxHalf:1 };

      const valid = rows.filter(r => r[COL_CONTRIB] && r.maturity_level && r.Year);
      const years = [...new Set(valid.map(r=>r.Year))].sort((a,b)=>a-b);

      // Only include (contrib, maturity) combos that have ≥1 paper
      const streams = [];
      for (const c of CONTRIB_ORDER) {
        for (const m of MAT_ORDER) {
          if (valid.some(r => r[COL_CONTRIB]===c && r.maturity_level===m))
            streams.push({ contrib:c, maturity:m });
        }
      }

      // data[si][yi] = paper count
      const data = streams.map(({ contrib, maturity }) =>
        years.map(yr =>
          valid.filter(r => r[COL_CONTRIB]===contrib && r.maturity_level===maturity && r.Year===yr).length
        )
      );

      // Symmetric baseline
      const totals = years.map((_,yi) => data.reduce((s,d)=>s+d[yi],0));
      const tops = streams.map(()=>years.map(()=>0));
      const bots = streams.map(()=>years.map(()=>0));

      for (let yi=0; yi<years.length; yi++) {
        let cur = -totals[yi]/2;
        for (let si=0; si<streams.length; si++) {
          bots[si][yi] = cur;
          cur += data[si][yi];
          tops[si][yi] = cur;
        }
      }

      const maxHalf = Math.max(...totals)/2 || 1;
      return { years, streams, tops, bots, maxHalf };
    }, [rows, hasData]);

    if (!hasData) return (
      <div className="text-sm text-slate-500 text-center py-8 italic">
        Column "{COL_CONTRIB}" not found in data.csv — this chart requires the contribution_type field.
      </div>
    );

    // ── SVG layout ──────────────────────────────────────
    const W=760, H=280, pL=16, pR=16, pT=20, pB=28;
    const plotW = W-pL-pR;
    const plotH = H-pT-pB;
    const xOf  = i => pL + (years.length>1 ? (i/(years.length-1))*plotW : plotW/2);
    const yCtr = pT + plotH/2;
    const yOf  = v => yCtr - (v/maxHalf)*(plotH/2);

    const xs = years.map((_,i)=>xOf(i));

    const selPapers = useMemo(() => {
      if (!sel) return [];
      return rows.filter(r => r[COL_CONTRIB]===sel.contrib && r.maturity_level===sel.maturity)
                 .sort((a,b) => (a.Title||'').localeCompare(b.Title||''));
    }, [rows, sel]);

    const toggle = (contrib, maturity) =>
      setSel(prev => prev?.contrib===contrib && prev?.maturity===maturity ? null : { contrib, maturity });

    const activeCombos = useMemo(() =>
      [...new Set(streams.map(s=>s.contrib))], [streams]);

    return (
      <div>
        <p className="text-[11px] text-slate-400 italic mb-2 select-none">
          Stream width = paper count · Color = contribution type · Solid = Field-tested, striped = Lab-validated, light = Conceptual · Click a stream to see papers
        </p>
        <div style={{ overflowX:'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', minWidth:520, height:'auto', display:'block' }}>
            {/* Centre zero line */}
            <line x1={pL} y1={yCtr} x2={W-pR} y2={yCtr}
              stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3"/>

            {/* Year ticks */}
            {years.map((yr,i) => (
              <g key={yr}>
                <line x1={xOf(i)} y1={pT} x2={xOf(i)} y2={H-pB}
                  stroke="#f8fafc" strokeWidth="1"/>
                <text x={xOf(i)} y={H-pB+12}
                  textAnchor="middle" fontSize="9" fill="#94a3b8">{yr}</text>
              </g>
            ))}

            {/* Streams — render in reverse so top streams get events first */}
            {[...streams].reverse().map(({ contrib, maturity }, rsi) => {
              const si = streams.length - 1 - rsi;
              const hasAny = tops[si].some((t,i) => t !== bots[si][i]);
              if (!hasAny) return null;

              const topYs = tops[si].map(yOf);
              const botYs = bots[si].map(yOf);
              const d = areaPath(xs, topYs, botYs);

              const isS   = sel?.contrib===contrib && sel?.maturity===maturity;
              const isH   = hover?.contrib===contrib && hover?.maturity===maturity;
              const dim   = (sel || hover) && !isS && !isH;
              const color = CONTRIB_COLORS[contrib] || '#94a3b8';

              // Maturity: solid = Field-tested, striped = Lab-validated, lighter = Conceptual
              const opacity = maturity==='Field-tested' ? 0.90
                            : maturity==='Lab-validated' ? 0.75
                            : 0.55;

              return (
                <path key={`${contrib}__${maturity}`}
                  d={d}
                  fill={color}
                  stroke="white"
                  strokeWidth="0.5"
                  opacity={dim ? 0.15 : (isS||isH) ? 1 : opacity}
                  style={{ cursor:'pointer', transition:'opacity 150ms' }}
                  onClick={() => toggle(contrib, maturity)}
                  onMouseEnter={() => setHover({ contrib, maturity })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </svg>
        </div>

        {/* Hover readout */}
        <div className="h-5 mt-1 text-xs text-slate-500">
          {hover ? (
            <span>
              <span className="font-semibold text-slate-800">{hover.contrib}</span>
              {' · '}{hover.maturity}
            </span>
          ) : (
            <span className="text-slate-400">Hover or click a stream for details.</span>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2 pt-3 border-t border-slate-100">
          {activeCombos.map(c => (
            <span key={c} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span className="block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: CONTRIB_COLORS[c] }}/>
              {c}
            </span>
          ))}
        </div>

        {/* Drill-down */}
        {sel && (
          <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg animate-fade">
            <PaperListBlock
              papers={selPapers}
              bucketLabel={`${sel.contrib} · ${sel.maturity}`}
              contextLabel="Papers in this stream"
              onClose={() => setSel(null)}
              onSelectPaper={setSelPaper}
            />
          </div>
        )}
        <PaperDetail paper={selPaper} onClose={() => setSelPaper(null)}/>
      </div>
    );
  };

  window.AppCharts.Streamgraph = StreamgraphChart;
})();
