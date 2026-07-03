/* =========================================================
   BubbleChart: a four-variable scatter/bubble matrix.

   Encodes:
     X axis        categorical (e.g. digital technologies)
     Y axis        categorical (e.g. AI techniques)
     bubble size   paper count for that (x, y) cell
     bubble color  a third categorical attribute's dominant
                   value in that cell (e.g. maturity level)

   Empty cells render nothing; the whitespace is meaningful
   (it shows gaps). Hover and click work like the other
   charts. Clicking a bubble calls onCellClick(xLabel, yLabel).

   Props
     cells         array of { x, y, count, colorKey } objects,
                   precomputed by the caller. colorKey is the
                   dominant value of the color attribute.
     xLabels       ordered array of x-axis categories
     yLabels       ordered array of y-axis categories
     colorMap      { value: cssColor } for the color attribute
     colorOrder    ordered array of color values (for legend)
     onCellClick   optional (x, y) => void
     activeCell    optional { x, y } currently selected
     maxBubble     optional max bubble radius (default 22)
   ========================================================= */

window.AppCharts = window.AppCharts || {};

(function() {
  const { useState } = React;

  const BubbleChart = ({
    cells,
    xLabels,
    yLabels,
    colorMap,
    colorOrder,
    onCellClick,
    activeCell = null,
    maxBubble = 22
  }) => {
    const [hover, setHover] = useState(null); // { x, y }

    if (!cells || !cells.length) return null;

    // ----- layout geometry -----
    // Left margin holds the y-axis labels; bottom margin holds the
    // rotated x-axis labels. Both are generous because the
    // category names are long.
    const marginLeft = 160;
    const marginBottom = 150;
    const marginTop = 16;
    const marginRight = 24;

    const plotW = xLabels.length * 46;
    const plotH = yLabels.length * 40;

    const width = marginLeft + plotW + marginRight;
    const height = marginTop + plotH + marginBottom;

    const colX = (i) => marginLeft + i * 46 + 23;
    const rowY = (i) => marginTop + i * 40 + 20;

    const xIndex = Object.fromEntries(xLabels.map((l, i) => [l, i]));
    const yIndex = Object.fromEntries(yLabels.map((l, i) => [l, i]));

    const maxCount = Math.max(...cells.map((c) => c.count));

    // Bubble radius scales with sqrt of count so AREA is
    // proportional to count (perceptually correct).
    const radius = (count) => {
      const minR = 7;
      const r = Math.sqrt(count / maxCount) * maxBubble;
      return Math.max(minR, r);
    };

    const isActive = (c) =>
      activeCell && activeCell.x === c.x && activeCell.y === c.y;
    const isHover = (c) =>
      hover && hover.x === c.x && hover.y === c.y;

    const hoveredCell = hover
      ? cells.find((c) => c.x === hover.x && c.y === hover.y)
      : null;

    return (
      <div>
        <div className="overflow-x-auto scrollbar-thin">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ minWidth: width, width: '100%' }}
            preserveAspectRatio="xMinYMin meet"
          >
            {/* Faint gridlines at each row */}
            {yLabels.map((yl, i) => (
              <line
                key={`row-${yl}`}
                x1={marginLeft}
                y1={rowY(i)}
                x2={marginLeft + plotW}
                y2={rowY(i)}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
            ))}

            {/* Y-axis labels */}
            {yLabels.map((yl, i) => {
              const lit = hover && hover.y === yl;
              return (
                <text
                  key={`yl-${yl}`}
                  x={marginLeft - 10}
                  y={rowY(i) + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill={lit ? '#0f172a' : '#475569'}
                  fontWeight={lit ? '700' : '500'}
                >
                  {yl}
                </text>
              );
            })}

            {/* X-axis labels, rotated 40 degrees */}
            {xLabels.map((xl, i) => {
              const lit = hover && hover.x === xl;
              const x = colX(i);
              const y = marginTop + plotH + 12;
              return (
                <text
                  key={`xl-${xl}`}
                  x={x}
                  y={y}
                  fontSize="11"
                  fill={lit ? '#0f172a' : '#64748b'}
                  fontWeight={lit ? '700' : '500'}
                  transform={`rotate(40 ${x} ${y})`}
                  textAnchor="start"
                >
                  {xl}
                </text>
              );
            })}

            {/* Bubbles */}
            {cells.map((c) => {
              const xi = xIndex[c.x];
              const yi = yIndex[c.y];
              if (xi === undefined || yi === undefined) return null;
              const cx = colX(xi);
              const cy = rowY(yi);
              const r = radius(c.count);
              const lit = isHover(c) || isActive(c);
              const fill = colorMap[c.colorKey] || '#94a3b8';
              return (
                <g
                  key={`${c.x}__${c.y}`}
                  onMouseEnter={() => setHover({ x: c.x, y: c.y })}
                  onMouseLeave={() => setHover(null)}
                  onClick={onCellClick ? () => onCellClick(c.x, c.y) : undefined}
                  style={{ cursor: onCellClick ? 'pointer' : 'default' }}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={fill}
                    stroke={lit ? '#0f172a' : '#ffffff'}
                    strokeWidth={lit ? 2 : 1}
                    opacity={hover && !lit ? 0.4 : 1}
                    style={{ transition: 'opacity 150ms, stroke 150ms' }}
                  />
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#000000"
                    pointerEvents="none"
                  >
                    {c.count}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover readout */}
        <div className="h-6 mt-2 text-sm text-slate-600">
          {hoveredCell ? (
            <span>
              <span className="font-semibold text-slate-900">{hoveredCell.y}</span>
              {' × '}
              <span className="font-semibold text-slate-900">{hoveredCell.x}</span>
              {' · '}
              {hoveredCell.count} {hoveredCell.count === 1 ? 'paper' : 'papers'}
              {' · mostly '}
              {hoveredCell.colorKey}
            </span>
          ) : (
            <span className="text-slate-400">Hover a bubble for detail. Click to see its papers.</span>
          )}
        </div>

        {/* Color legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
            Colour: dominant maturity
          </span>
          {colorOrder.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
              <span
                className="block w-2.5 h-2.5 rounded-full"
                style={{ background: colorMap[key] }}
              />
              {key}
            </span>
          ))}
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold ml-2">
            Size: paper count
          </span>
        </div>
      </div>
    );
  };

  window.AppCharts.BubbleChart = BubbleChart;
})();