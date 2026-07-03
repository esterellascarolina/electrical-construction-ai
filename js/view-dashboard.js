/* =========================================================
   Dashboard view — defensive: charts render a placeholder
   if their JS file hasn't been loaded yet.
   ========================================================= */

window.AppViews = window.AppViews || {};

(function() {
  const { useState, useMemo } = React;
  const AC = window.AppCharts;
  const YearChart  = AC.YearChart;
  const BarChart   = AC.BarChart;
  const DonutChart = AC.DonutChart;
  // Optional charts — may not be loaded; checked before use
  const BubbleChart   = AC.BubbleChart;
  const BubblePhase   = AC.BubblePhase;
  const StackedArea   = AC.StackedArea;
  const Streamgraph   = AC.Streamgraph;
  const SankeyChart   = AC.SankeyChart;

  const {
    ChartPanel, PaperListBlock, PaperDetail, Stat, SectionLabel
  } = window.AppComponents;
  const U = window.AppUtils;
  const D = window.AppDescriptions;

  // Wraps an optional chart: shows a "not loaded" notice if the
  // component is undefined (i.e. its JS file is missing from /js/).
  const MaybeChart = function(props) {
    var Comp = props.component;
    var rest = Object.assign({}, props);
    delete rest.component;
    if (!Comp) {
      return React.createElement('div', {
        className: 'text-sm text-slate-400 italic text-center py-8'
      }, 'Chart file not loaded — copy the JS file into your js/ folder.');
    }
    return React.createElement(Comp, rest);
  };

  const MATURITY_ORDER = ['Conceptual','Prototype','Lab-validated','Field-tested','Deployed'];
  const orderMaturity  = function(rows) {
    var map = new Map(rows);
    return MATURITY_ORDER.filter(function(k){ return map.has(k); })
                         .map(function(k){ return [k, map.get(k)]; });
  };

  const MATURITY_COLOR_MAP   = { 'Conceptual':'#F4A793','Lab-validated':'#A8C8DC','Field-tested':'#A3CCB5' };
  const MATURITY_COLOR_ORDER = ['Conceptual','Lab-validated','Field-tested'];

  const Dashboard = function(props) {
    var rows = props.rows;
    const [selection, setSelection]         = useState(null);
    const [selectedPaper, setSelectedPaper] = useState(null);
    const [bubbleSel, setBubbleSel]         = useState(null);

    // ── Counts ──────────────────────────────────────────
    const yearData     = useMemo(function(){ return U.yearDistribution(rows); },           [rows]);
    const sourceCounts = useMemo(function(){ return U.countSingle(rows,'Source title'); }, [rows]);
    const geoCounts    = useMemo(function(){ return U.countSingle(rows,'geographic_context'); }, [rows]);
    const scopeCounts  = useMemo(function(){ return U.countSingle(rows,'electrical_scope'); },   [rows]);
    const matRaw       = useMemo(function(){ return U.countSingle(rows,'maturity_level'); },     [rows]);
    const matCounts    = useMemo(function(){ return orderMaturity(matRaw); }, [matRaw]);
    const digitalTechs = useMemo(function(){ return U.countMulti(rows,'digital_technology'); },  [rows]);
    const aiTechs      = useMemo(function(){ return U.countMulti(rows,'ai_technique'); },        [rows]);
    const phaseCounts  = useMemo(function(){ return U.countMulti(rows,'construction_phase'); },  [rows]);
    const painCounts   = useMemo(function(){ return U.countMulti(rows,'pain_point_addressed'); },[rows]);

    // ── BubbleChart cells ────────────────────────────────
    const bubbleData = useMemo(function() {
      var cellMap = new Map();
      for (var i = 0; i < rows.length; i++) {
        var row    = rows[i];
        var techs  = row.digital_technology || [];
        var ais    = row.ai_technique       || [];
        var mat    = row.maturity_level;
        for (var ti = 0; ti < techs.length; ti++) {
          for (var ai = 0; ai < ais.length; ai++) {
            var key = techs[ti] + '||' + ais[ai];
            if (!cellMap.has(key)) cellMap.set(key, { x: techs[ti], y: ais[ai], count: 0, matCounts: new Map() });
            var cell = cellMap.get(key);
            cell.count++;
            if (mat) cell.matCounts.set(mat, (cell.matCounts.get(mat) || 0) + 1);
          }
        }
      }
      var bubbleCells = [];
      cellMap.forEach(function(c) {
        var colorKey = null, mx = 0;
        c.matCounts.forEach(function(v, k) { if (v > mx) { mx = v; colorKey = k; } });
        bubbleCells.push({ x: c.x, y: c.y, count: c.count, colorKey: colorKey });
      });
      var bubbleXLabels = digitalTechs.slice(0, 14).map(function(d){ return d[0]; });
      var bubbleYLabels = aiTechs.map(function(a){ return a[0]; });
      return { bubbleCells: bubbleCells, bubbleXLabels: bubbleXLabels, bubbleYLabels: bubbleYLabels };
    }, [rows, digitalTechs, aiTechs]);

    const bubbleDrillPapers = useMemo(function() {
      if (!bubbleSel) return [];
      return rows.filter(function(r) {
        return (r.digital_technology || []).indexOf(bubbleSel.x) !== -1 &&
               (r.ai_technique       || []).indexOf(bubbleSel.y) !== -1;
      }).sort(function(a,b){ return (a.Title||'').localeCompare(b.Title||''); });
    }, [rows, bubbleSel]);

    const handleBubbleClick = function(x, y) {
      setBubbleSel(function(prev) {
        return prev && prev.x===x && prev.y===y ? null : { x: x, y: y };
      });
    };

    // ── Shared selection ─────────────────────────────────
    const MULTI_PANEL_KEYS = new Set(['digital','ai','phase','pain']);
    const PANEL_CONFIG = {
      year:    { field: 'Year',                contextLabel: 'Papers published in' },
      source:  { field: 'Source title',        contextLabel: 'Papers published in' },
      geo:     { field: 'geographic_context',  contextLabel: 'Papers from' },
      scope:   { field: 'electrical_scope',    contextLabel: 'Papers with scope' },
      maturity:{ field: 'maturity_level',      contextLabel: 'Papers at maturity' },
      digital: { field: 'digital_technology',  contextLabel: 'Papers using' },
      ai:      { field: 'ai_technique',        contextLabel: 'Papers using' },
      phase:   { field: 'construction_phase',  contextLabel: 'Papers covering' },
      pain:    { field: 'pain_point_addressed',contextLabel: 'Papers addressing' },
    };

    const handleSelect = function(panel, value) {
      setSelection(function(prev) {
        return prev && prev.panel===panel && prev.value===value ? null : { panel: panel, value: value };
      });
    };
    const clearSelection = function() { setSelection(null); };

    const drillDown = useMemo(function() {
      if (!selection) return null;
      var cfg = PANEL_CONFIG[selection.panel];
      if (!cfg) return null;
      var isMulti = MULTI_PANEL_KEYS.has(selection.panel);
      return {
        papers: U.papersByField(rows, cfg.field, selection.value, isMulti),
        bucketLabel: String(selection.value),
        bucketDescription: D.getDescription(cfg.field, selection.value),
        contextLabel: cfg.contextLabel,
      };
    }, [rows, selection]);

    const GRID_KEYS  = new Set(['year','source','geo','scope','maturity','digital','ai','phase','pain']);
    const isGridActive  = !!(selection && GRID_KEYS.has(selection.panel));

    const activeValue   = function(panel) { return selection && selection.panel===panel ? selection.value : null; };
    const isActivePanel = function(panel) { return !!(selection && selection.panel===panel); };
    const getActiveDesc = function(panel) {
      if (!isActivePanel(panel)) return null;
      var cfg = PANEL_CONFIG[panel];
      return cfg ? D.getDescription(cfg.field, selection.value) : null;
    };

    var yearMin    = yearData.length ? yearData[0][0] : null;
    var yearMax    = yearData.length ? yearData[yearData.length-1][0] : null;
    var topVenue   = sourceCounts[0];
    var topDigital = digitalTechs[0];

    return (
      <div className="space-y-12">

        {/* Headline tiles */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Papers"     value={rows.length}   hint="Total reviewed"/>
            <Stat label="Year range"
                  value={yearMin + '\u2013' + yearMax}
                  hint={(yearMax - yearMin + 1) + ' years covered'}/>
            <Stat label="Journals"
                  value={sourceCounts.length}
                  hint={topVenue ? 'Top: ' + topVenue[0] + ' (' + topVenue[1] + ')' : 'n/a'}/>
            <Stat label="Digital technologies"
                  value={digitalTechs.length}
                  hint={topDigital ? 'Top: ' + topDigital[0] + ' (' + topDigital[1] + ')' : 'n/a'}/>
          </div>
        </section>

        {/* Descriptive overview */}
        <section>
          <SectionLabel
            title="Descriptive overview"
            subtitle="Each chart shows the reviewed studies along one variable. Charts marked Multi-coded include studies coded into more than one value. Click any bar or slice to see the underlying papers."
          />

          <div className="mb-4">
            <ChartPanel title="Publication trend" subtitle="Annual count of reviewed studies" active={isActivePanel('year')}>
              <YearChart data={yearData} onItemClick={function(yr){ handleSelect('year',yr); }} activeYear={activeValue('year')}/>
            </ChartPanel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ChartPanel title="Top source titles" subtitle={'Top 10 of ' + sourceCounts.length + ' venues'} active={isActivePanel('source')}>
              <BarChart data={sourceCounts} max={10} totalCount={rows.length} activeItem={activeValue('source')} onItemClick={function(l){ handleSelect('source',l); }}/>
            </ChartPanel>
            <ChartPanel title="Geographic context" subtitle={'Top 10 of ' + geoCounts.length + ' entries'} active={isActivePanel('geo')}>
              <BarChart data={geoCounts} max={10} totalCount={rows.length} activeItem={activeValue('geo')} onItemClick={function(l){ handleSelect('geo',l); }}/>
            </ChartPanel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <ChartPanel title="Electrical scope" subtitle="How the study frames electrical work" active={isActivePanel('scope')} activeDescription={getActiveDesc('scope')}>
              <DonutChart data={scopeCounts} totalCount={rows.length} activeItem={activeValue('scope')} onItemClick={function(l){ handleSelect('scope',l); }} descriptions={D.getFieldDescriptions('electrical_scope')}/>
            </ChartPanel>
            <ChartPanel title="Construction phase" subtitle="When in the project lifecycle" active={isActivePanel('phase')} activeDescription={getActiveDesc('phase')}>
              <DonutChart data={phaseCounts} totalCount={rows.length} activeItem={activeValue('phase')} onItemClick={function(l){ handleSelect('phase',l); }} descriptions={D.getFieldDescriptions('construction_phase')}/>
            </ChartPanel>
            <ChartPanel title="Maturity level" subtitle="Stage of the reported technology" active={isActivePanel('maturity')} activeDescription={getActiveDesc('maturity')}>
              <DonutChart data={matCounts} totalCount={rows.length} activeItem={activeValue('maturity')} onItemClick={function(l){ handleSelect('maturity',l); }} descriptions={D.getFieldDescriptions('maturity_level')}/>
            </ChartPanel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChartPanel title="Digital technologies" subtitle={'Top 10 of ' + digitalTechs.length} badge="Multi-coded" active={isActivePanel('digital')}>
              <BarChart data={digitalTechs} max={10} totalCount={rows.length} activeItem={activeValue('digital')} onItemClick={function(l){ handleSelect('digital',l); }}/>
            </ChartPanel>
            <ChartPanel title="AI techniques" subtitle={aiTechs.length + ' distinct AI families coded'} badge="Multi-coded" active={isActivePanel('ai')}>
              <BarChart data={aiTechs} max={10} totalCount={rows.length} activeItem={activeValue('ai')} onItemClick={function(l){ handleSelect('ai',l); }}/>
            </ChartPanel>
            <ChartPanel title="Pain points addressed" subtitle={'Top 10 of ' + painCounts.length + ' problems'} badge="Multi-coded" active={isActivePanel('pain')} activeDescription={getActiveDesc('pain')}>
              <BarChart data={painCounts} max={10} totalCount={rows.length} activeItem={activeValue('pain')} onItemClick={function(l){ handleSelect('pain',l); }} descriptions={D.getFieldDescriptions('pain_point_addressed')}/>
            </ChartPanel>
          </div>

          {isGridActive && drillDown && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-6 animate-fade">
              <PaperListBlock papers={drillDown.papers} bucketLabel={drillDown.bucketLabel} bucketDescription={drillDown.bucketDescription} contextLabel={drillDown.contextLabel} onClose={clearSelection} onSelectPaper={setSelectedPaper}/>
            </div>
          )}
        </section>

        {/* Digital × AI bubble matrix */}
        {BubbleChart && (
          <section>
            <SectionLabel
              title="Digital technology × AI technique"
              subtitle="Bubble area = paper count at that combination. Colour = dominant maturity level. Click any bubble to see papers."
            />
            <ChartPanel title="Digital technology by AI technique" subtitle="Top 14 digital technologies × all AI techniques" badge="Multi-coded">
              <BubbleChart
                cells={bubbleData.bubbleCells}
                xLabels={bubbleData.bubbleXLabels}
                yLabels={bubbleData.bubbleYLabels}
                colorMap={MATURITY_COLOR_MAP}
                colorOrder={MATURITY_COLOR_ORDER}
                onCellClick={handleBubbleClick}
                activeCell={bubbleSel}
              />
              {bubbleSel && (
                <div className="mt-4 border-t border-slate-200 pt-4 animate-fade">
                  <PaperListBlock papers={bubbleDrillPapers} bucketLabel={bubbleSel.y + '  \u00d7  ' + bubbleSel.x} contextLabel="Papers at this intersection" onClose={function(){ setBubbleSel(null); }} onSelectPaper={setSelectedPaper}/>
                </div>
              )}
            </ChartPanel>
          </section>
        )}

        {/* AI × Phase bubble */}
        {BubblePhase && (
          <section>
            <SectionLabel
              title="AI technique × construction phase"
              subtitle="Bubble area = paper count. Colour = dominant maturity level. Click any bubble to see papers."
            />
            <ChartPanel title="AI technique by construction phase" subtitle="Bubble area = paper count · Colour = maturity level" badge="Multi-coded">
              <BubblePhase rows={rows}/>
            </ChartPanel>
          </section>
        )}

        {/* Stacked area */}
        {StackedArea && (
          <section>
            <SectionLabel
              title="Research theme evolution"
              subtitle="Annual paper count stacked by key-findings theme. The dashed line tracks the share of papers rated Field-tested each year. Click any bar segment to see its papers."
            />
            <ChartPanel title="Key-findings themes over time" subtitle="Stacked by theme · Right axis = Field-tested %" badge="Multi-coded">
              <StackedArea rows={rows}/>
            </ChartPanel>
          </section>
        )}

        {/* Streamgraph */}
        {Streamgraph && (
          <section>
            <SectionLabel
              title="Contribution type × maturity streamgraph"
              subtitle="Stream width at any year = paper count for that (contribution type, maturity) combination. Expands symmetrically from the centre. Click a stream to see its papers."
            />
            <ChartPanel title="Streamgraph: contribution type by year" subtitle="Symmetric baseline · Color = contribution type · Opacity = maturity level">
              <Streamgraph rows={rows}/>
            </ChartPanel>
          </section>
        )}

        {/* Sankey */}
        {SankeyChart && (
          <section>
            <SectionLabel
              title="Funding-to-impact pipeline"
              subtitle="Four-stage Sankey: research sponsor → industry involvement → maturity → quantified benefit. Node and ribbon width = paper count. Gold ribbon = the gold path. Click any node or ribbon to see the underlying papers."
            />
            <ChartPanel title="Sankey: sponsor → industry → maturity → benefit" subtitle="Click nodes or ribbons to drill into papers">
              <SankeyChart rows={rows}/>
            </ChartPanel>
          </section>
        )}

        <PaperDetail paper={selectedPaper} onClose={function(){ setSelectedPaper(null); }}/>
      </div>
    );
  };

  window.AppViews.Dashboard = Dashboard;
})();