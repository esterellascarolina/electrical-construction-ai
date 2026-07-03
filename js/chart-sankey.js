/* =========================================================
   SankeyChart — Funding-to-Impact Pipeline
   Research Sponsor → Industry Involvement → Maturity → Benefit

   Columns (tolerates trailing spaces / alternate names):
     "research_sponsor themes"
     "industry_involvement themes" (with or without trailing space)
     "maturity_level"
     "quantified_benefit themes"

   Click any node → papers for that field value below.
   Click any ribbon → papers where BOTH endpoints match.
   Gold ribbon = the gold path from the Python script.
   ========================================================= */

window.AppCharts = window.AppCharts || {};

(function () {
  const { useState, useMemo } = React;
  const { PaperListBlock, PaperDetail } = window.AppComponents;

  // ── Stage definitions ─────────────────────────────────
  // cols lists only the thematic-analysis columns.
  // No fallback to the raw columns — the Sankey must only show themes.
  const STAGES = [
    { key:'sponsor',  label:'Research Sponsor',    cols:['research_sponsor themes'] },
    { key:'industry', label:'Industry Involvement', cols:['industry_involvement themes ', 'industry_involvement themes'] },
    { key:'maturity', label:'Maturity Level',       cols:['maturity_level'] },
    { key:'benefit',  label:'Quantified Benefit',   cols:['quantified_benefit themes'] },
  ];

  // Gold path (source label → target label), highlighted in amber
  const GOLD_PATH = new Set([
    'Industry-Funded|Full Industry Partnership',
    'Full Industry Partnership|Field-tested',
    'Field-tested|Cost Savings & Economic Impact',
  ]);

  // Node colours matching the Python script palette
  const NODE_COLORS = {
    'Industry-Funded':'#4C72B0','Chinese Government':'#4878CF',
    'US Government':'#6495ED','Korean Government':'#78a8e3',
    'Other Government':'#9bbde8','University & Academic':'#b8cfe8',
    'European Union Programs':'#cfe0f0','Not Reported':'#d0d0d0',
    'Full Industry Partnership':'#2e8b57','Expert Validation':'#55A868',
    'Author-Affiliated with Industry':'#78c489','Data Access Only':'#a3d9af',
    'No Industry Involvement':'#d0edd7',
    'Field-tested':'#C44E52','Lab-validated':'#e07b7f','Conceptual':'#f2b5b7',
    'AI & Algorithm Performance':'#DD8452','Time & Workflow Efficiency':'#e8a070',
    'Cost Savings & Economic Impact':'#f0c060','Training & Learning Outcomes':'#c8b046',
    'Coordination & Clash Reduction':'#a09030','Safety & Risk Reduction':'#808020',
    'Quality & Inspection Precision':'#607010','Labor Productivity':'#405010',
    'Not Reported':'#d0d0d0',
  };
  const defaultColor = '#94a3b8';

  // ── Helper: find a field value in a row across multiple possible column names ─
  const getVal = (row, cols) => {
    for (const c of cols) {
      const v = row[c];
      if (v && typeof v === 'string') {
        const t = v.trim();
        if (t && !['nan','na','n/a','not applicable','not specified'].includes(t.toLowerCase()))
          return t;
      }
    }
    return null;
  };

  // ── Ribbon SVG path: S-curve between two vertical slots ──
  const ribbon = (x1,y1t,y1b, x2,y2t,y2b) => {
    const mx = (x1+x2)/2;
    return [
      `M ${x1} ${y1t}`,
      `C ${mx} ${y1t}, ${mx} ${y2t}, ${x2} ${y2t}`,
      `L ${x2} ${y2b}`,
      `C ${mx} ${y2b}, ${mx} ${y1b}, ${x1} ${y1b}`,
      'Z',
    ].join(' ');
  };

  const SankeyChart = ({ rows }) => {
    const [selNode, setSelNode]   = useState(null); // { stageKey, label }
    const [selFlow, setSelFlow]   = useState(null); // { srcKey, srcLabel, tgtKey, tgtLabel }
    const [hoverNode, setHoverNode] = useState(null);
    const [hoverFlow, setHoverFlow] = useState(null);
    const [selPaper, setSelPaper] = useState(null);

    const hasData = useMemo(() =>
      STAGES.some(s => rows.some(r => getVal(r, s.cols))), [rows]);

    // ── Aggregate ─────────────────────────────────────
    const { stageNodes, allFlows } = useMemo(() => {
      if (!hasData) return { stageNodes:[], allFlows:[] };

      // For each row, get all 4 stage values.
      // Use 'Not Reported' for missing values so rows aren't dropped
      // and rare sponsors/benefits consolidate rather than vanish.
      const rowVals = rows.map(r => STAGES.map(s => getVal(r, s.cols) || 'Not Reported'));

      // Count nodes per stage (most frequent first, matching Python value_counts)
      const stageNodes = STAGES.map((s, si) => {
        const counts = {};
        for (const rv of rowVals) {
          const v = rv[si] || 'Not Reported';
          counts[v] = (counts[v]||0) + 1;
        }
        return Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      });

      // Count flows between adjacent stages (si → si+1)
      const allFlows = [];
      for (let si = 0; si < STAGES.length-1; si++) {
        const flowMap = {};
        for (const rv of rowVals) {
          const a = rv[si]   || 'Not Reported';
          const b = rv[si+1] || 'Not Reported';
          const k = `${a}|||${b}`;
          flowMap[k] = (flowMap[k]||0) + 1;
        }
        allFlows.push(Object.entries(flowMap).map(([k,c]) => {
          const [src,tgt] = k.split('|||');
          return { si, src, tgt, count:c };
        }));
      }

      return { stageNodes, allFlows };
    }, [rows, hasData]);

    if (!hasData) return (
      <div className="text-sm text-slate-500 text-center py-8 italic">
        Sankey columns not found in data.csv — requires research_sponsor, industry_involvement, and quantified_benefit thematic fields.
      </div>
    );

    // ── SVG layout ──────────────────────────────────────
    const W=900, H=680, pT=44, pB=44, pL=130, pR=170;
    const plotH = H - pT - pB;
    const NODE_W = 14;
    const GAP    = 12;
    // Column positions: left edge of each node bar.
    // pL and pR reserve space for the outer node labels.
    const plotW  = W - pL - pR;
    const stageX = [
      pL,
      pL + Math.round(plotW * 0.33),
      pL + Math.round(plotW * 0.66),
      W - pR - NODE_W,
    ];

    // Lay out nodes for each stage: y positions.
    // Gap is adaptive: capped so it never consumes more than 20% of plotH,
    // preventing the "many unique values → negative availH" bug.
    const nodeLayout = stageNodes.map((nodes) => {
      const n = nodes.length;
      const gap = n <= 1 ? 0 : Math.min(12, Math.floor((plotH * 0.20) / Math.max(n - 1, 1)));
      const total  = nodes.reduce((s,[,c])=>s+c,0);
      const availH = plotH - gap*(n-1);
      let y = pT;
      return nodes.map(([label,count]) => {
        const h = (count/total)*availH;
        const node = { label, count, y, h };
        y += h + gap;
        return node;
      });
    });

    // Build ribbon geometry for each stage transition
    const ribbonData = useMemo(() => {
      return allFlows.map((flows, si) => {
        const srcLayout = nodeLayout[si];
        const tgtLayout = nodeLayout[si+1];
        const srcTotal  = {};
        const tgtTotal  = {};
        for (const n of srcLayout) srcTotal[n.label] = n.count;
        for (const n of tgtLayout) tgtTotal[n.label] = n.count;

        // Track used offsets within each node
        const srcUsed = {}, tgtUsed = {};
        for (const n of srcLayout) srcUsed[n.label] = 0;
        for (const n of tgtLayout) tgtUsed[n.label] = 0;

        // Sort flows by src label order then tgt label order for neat stacking
        const sorted = [...flows].sort((a,b) => {
          const ai = srcLayout.findIndex(n=>n.label===a.src);
          const bi = srcLayout.findIndex(n=>n.label===b.src);
          return ai !== bi ? ai-bi : 0;
        });

        return sorted.map(({ src, tgt, count }) => {
          const sn = srcLayout.find(n=>n.label===src);
          const tn = tgtLayout.find(n=>n.label===tgt);
          if (!sn || !tn) return null;

          const srcH = (count/srcTotal[src])*sn.h;
          const tgtH = (count/tgtTotal[tgt])*tn.h;

          const x1  = stageX[si] + NODE_W;
          const y1t = sn.y + srcUsed[src];
          const y1b = y1t + srcH;
          const x2  = stageX[si+1];
          const y2t = tn.y + tgtUsed[tgt];
          const y2b = y2t + tgtH;

          srcUsed[src] += srcH;
          tgtUsed[tgt] += tgtH;

          const isGold = GOLD_PATH.has(`${src}|${tgt}`);
          return { src, tgt, count, si, x1,y1t,y1b, x2,y2t,y2b, isGold };
        }).filter(Boolean);
      });
    }, [stageNodes, allFlows, nodeLayout]);

    // ── Filter papers ────────────────────────────────────
    const selPapers = useMemo(() => {
      let filtered = rows;
      if (selNode) {
        const stage = STAGES.find(s=>s.key===selNode.stageKey);
        if (stage) filtered = filtered.filter(r => getVal(r, stage.cols) === selNode.label);
      }
      if (selFlow) {
        const srcStage = STAGES.find(s=>s.key===selFlow.srcKey);
        const tgtStage = STAGES.find(s=>s.key===selFlow.tgtKey);
        if (srcStage) filtered = filtered.filter(r => getVal(r, srcStage.cols) === selFlow.srcLabel);
        if (tgtStage) filtered = filtered.filter(r => getVal(r, tgtStage.cols) === selFlow.tgtLabel);
      }
      return filtered.sort((a,b)=>(a.Title||'').localeCompare(b.Title||''));
    }, [rows, selNode, selFlow]);

    const clearSel = () => { setSelNode(null); setSelFlow(null); };

    const selLabel = selNode ? selNode.label
      : selFlow ? `${selFlow.srcLabel} → ${selFlow.tgtLabel}` : null;

    return (
      <div>
        <p className="text-[11px] text-slate-400 italic mb-2 select-none">
          Node height = paper count through that value · Ribbon width = flow · Gold ribbons = "gold path" · Click a node or ribbon to see papers
        </p>
        <div style={{ overflowX:'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', minWidth:560, height:'auto', display:'block' }}>

            {/* Stage column headers — outer columns anchored to avoid clipping */}
            {STAGES.map((s,si) => {
              const isFirst = si === 0;
              const isLast  = si === STAGES.length - 1;
              const x = isFirst ? stageX[si]
                      : isLast  ? stageX[si] + NODE_W
                      : stageX[si] + NODE_W / 2;
              const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
              return (
                <text key={s.key}
                  x={x} y={pT - 10}
                  textAnchor={anchor} fontSize="10" fontWeight="600" fill="#475569">
                  {s.label}
                </text>
              );
            })}

            {/* Ribbons (below nodes) */}
            {ribbonData.map((stageRibbons, si) =>
              stageRibbons.map((rb, ri) => {
                const isHov = hoverFlow?.src===rb.src && hoverFlow?.tgt===rb.tgt && hoverFlow?.si===si;
                const isSel = selFlow?.srcLabel===rb.src && selFlow?.tgtLabel===rb.tgt && selFlow?.srcKey===STAGES[si].key;
                const lit   = isHov || isSel;
                const dim   = (selNode || selFlow) && !lit;
                const fill    = rb.isGold ? 'rgba(255,200,50,0.65)'  : 'rgba(180,180,180,0.30)';
                const fillHov = rb.isGold ? 'rgba(255,200,50,0.85)'  : 'rgba(120,120,120,0.50)';
                return (
                  <path key={`${si}-${ri}`}
                    d={ribbon(rb.x1,rb.y1t,rb.y1b, rb.x2,rb.y2t,rb.y2b)}
                    fill={lit ? fillHov : fill}
                    opacity={dim ? 0.25 : 1}
                    style={{ cursor:'pointer', transition:'fill 120ms, opacity 120ms' }}
                    onMouseEnter={() => setHoverFlow({ src:rb.src, tgt:rb.tgt, si })}
                    onMouseLeave={() => setHoverFlow(null)}
                    onClick={() => {
                      setSelNode(null);
                      setSelFlow(prev =>
                        prev?.srcLabel===rb.src && prev?.tgtLabel===rb.tgt && prev?.srcKey===STAGES[si].key
                          ? null
                          : { srcKey:STAGES[si].key, srcLabel:rb.src, tgtKey:STAGES[si+1].key, tgtLabel:rb.tgt }
                      );
                    }}
                  />
                );
              })
            )}

            {/* Nodes */}
            {nodeLayout.map((nodes, si) =>
              nodes.map(({ label, count, y, h }) => {
                const isHov = hoverNode?.stageKey===STAGES[si].key && hoverNode?.label===label;
                const isSel = selNode?.stageKey===STAGES[si].key && selNode?.label===label;
                const lit   = isHov || isSel;
                const dim   = (selNode && !isSel) || (selFlow && !lit);
                const color = NODE_COLORS[label] || defaultColor;
                return (
                  <g key={`${si}-${label}`}
                    onMouseEnter={() => setHoverNode({ stageKey:STAGES[si].key, label })}
                    onMouseLeave={() => setHoverNode(null)}
                    onClick={() => {
                      setSelFlow(null);
                      setSelNode(prev =>
                        prev?.stageKey===STAGES[si].key && prev?.label===label ? null
                          : { stageKey:STAGES[si].key, label }
                      );
                    }}
                    style={{ cursor:'pointer' }}
                  >
                    <rect
                      x={stageX[si]} y={y} width={NODE_W} height={Math.max(h,2)}
                      fill={color}
                      opacity={dim ? 0.25 : 1}
                      stroke={lit ? '#0f172a' : 'white'}
                      strokeWidth={lit ? 1.5 : 0.5}
                      style={{ transition:'opacity 120ms' }}
                    />
                    {/* Label right or left of node — always shown, font scales with node height */}
                    {h >= 6 && (
                      <text
                        x={si < STAGES.length/2
                           ? stageX[si] + NODE_W + 4
                           : stageX[si] - 4}
                        y={y + h/2}
                        textAnchor={si < STAGES.length/2 ? 'start' : 'end'}
                        dominantBaseline="middle"
                        fontSize={Math.min(10, Math.max(7, h * 0.55))}
                        fill={dim ? '#cbd5e1' : '#334155'}
                        fontWeight={lit ? '700' : '500'}
                        style={{ transition:'fill 120ms' }}
                      >
                        {label} ({count})
                      </text>
                    )}
                  </g>
                );
              })
            )}

            {/* Gold-path note — matches Python's bottom annotation */}
            <rect x={W/2 - 195} y={H-22} width={10} height={10} rx="1"
              fill="rgba(255,200,50,0.80)"/>
            <text x={W/2 - 181} y={H-13} fontSize="9" fill="#64748b">
              Gold path: Industry-Funded → Full Partnership → Field-tested → Cost Savings &amp; Economic Impact
            </text>
          </svg>
        </div>

        {/* Hover readout */}
        <div className="h-5 mt-1 text-xs text-slate-500">
          {hoverNode ? (
            <span><span className="font-semibold text-slate-800">{hoverNode.label}</span> — {STAGES.find(s=>s.key===hoverNode.stageKey)?.label}</span>
          ) : hoverFlow ? (
            <span><span className="font-semibold text-slate-800">{hoverFlow.src}</span> → <span className="font-semibold text-slate-800">{hoverFlow.tgt}</span></span>
          ) : (
            <span className="text-slate-400">Hover a node or ribbon for detail. Click to see papers.</span>
          )}
        </div>

        {/* Drill-down */}
        {(selNode || selFlow) && (
          <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg animate-fade">
            <PaperListBlock
              papers={selPapers}
              bucketLabel={selLabel}
              contextLabel={selNode ? `Papers with ${STAGES.find(s=>s.key===selNode.stageKey)?.label}` : 'Papers on this flow'}
              onClose={clearSel}
              onSelectPaper={setSelPaper}
            />
          </div>
        )}
        <PaperDetail paper={selPaper} onClose={() => setSelPaper(null)}/>
      </div>
    );
  };

  window.AppCharts.SankeyChart = SankeyChart;
})();