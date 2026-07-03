/* =========================================================
   DonutChart: SVG donut with hover, persistent selection,
   center label, and a side legend that doubles as a click
   target. Same interface as BarChart:
     data        [[label, value], ...]
     onItemClick optional callback (label) => void
     activeItem  optional currently-selected label
     totalCount  optional total for percent display
   ========================================================= */

window.AppCharts = window.AppCharts || {};

(function() {
  const { useState } = React;

  // Tonal greys, ordered from darkest to lightest. Wraps if data
  // has more buckets than colors. Tuned to read clearly on the
  // stone-50 page background; the active slice always goes near-
  // black so it pops regardless of its resting tone.
  const SLICE_TONES = ['#1e293b', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

  // Convert polar coords (degrees, with 0 at 12 o’clock, clockwise)
  // to cartesian for SVG path commands.
  const polar = (cx, cy, r, angleDeg) => {
    const a = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  // Build an SVG annular sector path between two angles.
  const arcPath = (cx, cy, rOuter, rInner, startAngle, endAngle) => {
    // Guard against full-circle artifacts when one slice owns 100%.
    const sweep = endAngle - startAngle;
    const largeArc = sweep > 180 ? 1 : 0;
    const o1 = polar(cx, cy, rOuter, startAngle);
    const o2 = polar(cx, cy, rOuter, endAngle);
    const i1 = polar(cx, cy, rInner, endAngle);
    const i2 = polar(cx, cy, rInner, startAngle);
    return [
      `M ${o1.x} ${o1.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2.x} ${o2.y}`,
      `L ${i1.x} ${i1.y}`,
      `A ${rInner} ${rInner} 0 ${largeArc} 0 ${i2.x} ${i2.y}`,
      'Z'
    ].join(' ');
  };

  const DonutChart = ({
    data,
    onItemClick,
    activeItem = null,
    totalCount,
    descriptions = null
  }) => {
    const [hover, setHover] = useState(null);
    if (!data.length) return null;

    const sum = data.reduce((s, [, v]) => s + v, 0);
    const denom = totalCount && totalCount > 0 ? totalCount : sum;

    // Geometry. The viewBox is wider than tall so the legend has
    // room on the right without crowding the ring.
    const W = 360;
    const H = 220;
    const cx = 110;
    const cy = H / 2;
    const rOuter = 96;
    const rInner = 62;

    // Walk the data once to compute each slice's angular range.
    let angle = 0;
    const slices = data.map(([label, value], i) => {
      const sweep = (value / sum) * 360;
      const slice = {
        label, value, i,
        startAngle: angle,
        endAngle: angle + sweep,
        tone: SLICE_TONES[i % SLICE_TONES.length],
        pct: denom > 0 ? (value / denom) * 100 : 0
      };
      angle += sweep;
      return slice;
    });

    // What goes in the donut hole. Falls back to the totals.
    const focus = hover
      ? slices.find((s) => s.label === hover)
      : activeItem
        ? slices.find((s) => s.label === activeItem)
        : null;
    const centerValue = focus ? focus.value : sum;
    const centerLabel = focus
      ? `${focus.pct.toFixed(1)}%`
      : `${data.length} ${data.length === 1 ? 'category' : 'categories'}`;

    return (
      <div className="flex items-center gap-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="flex-shrink-0"
          style={{ width: '52%', maxWidth: 320 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {slices.map((s) => {
            const isHover  = hover === s.label;
            const isActive = activeItem === s.label;
            const isLit    = isHover || isActive;

            // Active slice gets near-black; hovered slice gets a
            // slight emphasis over the resting tone.
            let fill = s.tone;
            if (isHover && !isActive) fill = '#0f172a';
            if (isActive) fill = '#0f172a';

            return (
              <path
                key={s.label}
                d={arcPath(cx, cy, rOuter, rInner, s.startAngle, s.endAngle)}
                fill={fill}
                stroke="#ffffff"
                strokeWidth="1.5"
                style={{
                  cursor: onItemClick ? 'pointer' : 'default',
                  transition: 'fill 180ms'
                }}
                onMouseEnter={() => setHover(s.label)}
                onMouseLeave={() => setHover(null)}
                onClick={onItemClick ? () => onItemClick(s.label) : undefined}
              />
            );
          })}

          {/* Center text */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fontFamily="'Source Serif 4', Georgia, serif"
            fill="#0f172a"
          >
            {centerValue}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
            fontWeight="500"
          >
            {centerLabel}
          </text>
        </svg>

        {/* Legend */}
        <ul className="flex-1 space-y-2 text-sm min-w-0">
          {slices.map((s) => {
            const isHover  = hover === s.label;
            const isActive = activeItem === s.label;
            const isLit    = isHover || isActive;
            const swatch   = isLit ? '#0f172a' : s.tone;
            const desc     = descriptions ? descriptions[s.label] : null;
            const tooltip  = desc ? `${s.label}\n\n${desc}` : s.label;
            return (
              <li key={s.label}>
                <button
                  type="button"
                  title={tooltip}
                  onMouseEnter={() => setHover(s.label)}
                  onMouseLeave={() => setHover(null)}
                  onClick={onItemClick ? () => onItemClick(s.label) : undefined}
                  className={`w-full flex items-center gap-2.5 text-left ${onItemClick ? 'cursor-pointer' : ''}`}
                >
                  <span
                    className="block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: swatch, transition: 'background 180ms' }}
                  />
                  <span
                    className={`truncate transition-colors ${isLit ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}
                    title={s.label}
                  >
                    {s.label}
                  </span>
                  <span
                    className={`ml-auto tabular-nums text-xs transition-colors ${isLit ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}
                  >
                    {s.value}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  window.AppCharts.DonutChart = DonutChart;
})();