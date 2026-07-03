/* =========================================================
   ChartPanel: a self-contained card holding one chart and an
   optional embedded drill-down area below it.

   Props
     title              Card heading, rendered in serif.
     subtitle           Small description under the title.
     active             When true, darkens the border to slate-900
                        so the user can see which chart owns the
                        current selection. Used by grid panels;
                        full-width panels can also opt in.
     children           The actual chart (BarChart, YearChart, ...).

   Drill-down props (optional; renders inside the panel only
   when papers is a non-empty array). For panels whose drill-down
   lives outside the card (e.g. those in a grid), omit these.
     papers
     bucketLabel
     contextLabel
     onCloseDrillDown
     onSelectPaper
   ========================================================= */

window.AppComponents = window.AppComponents || {};

(function() {
  const { PaperListBlock } = window.AppComponents;

  const ChartPanel = ({
    title,
    subtitle,
    children,
    active = false,
    activeDescription = null,
    badge = null,
    papers,
    bucketLabel,
    bucketDescription,
    contextLabel,
    onCloseDrillDown,
    onSelectPaper
  }) => {
    const hasDrillDown = Array.isArray(papers) && papers.length > 0;
    const borderClass = active ? 'border-slate-900' : 'border-slate-200';

    return (
      <div className={`bg-white border ${borderClass} rounded-lg overflow-hidden transition-colors`}>
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h3 className="serif text-xl text-slate-900 font-semibold">{title}</h3>
          {badge && (
            <div className="mt-2">
              <span className="inline-flex items-center text-[10px] uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 font-semibold">
                {badge}
              </span>
            </div>
          )}
          {active && activeDescription ? (
            <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
              {activeDescription}
            </p>
          ) : subtitle ? (
            <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
          ) : null}
        </div>

        {/* Chart body */}
        <div className="px-6 pt-5 pb-6">{children}</div>

        {/* Embedded drill-down (only when papers passed) */}
        {hasDrillDown && (
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-5 animate-fade">
            <PaperListBlock
              papers={papers}
              bucketLabel={bucketLabel}
              bucketDescription={bucketDescription}
              contextLabel={contextLabel}
              onClose={onCloseDrillDown}
              onSelectPaper={onSelectPaper}
            />
          </div>
        )}
      </div>
    );
  };

  window.AppComponents.ChartPanel = ChartPanel;
})();