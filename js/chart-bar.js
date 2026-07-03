/* =========================================================
   Bar chart and year chart (pure SVG).

   BarChart  horizontal top-N bars. Supports activeItem prop
             so the parent panel can show a persistent selection.
   YearChart vertical SVG bars with always-on counts and an
             active-year indicator dot. Compact height so it
             reads as a trend strip rather than a hero chart.
   ========================================================= */

window.AppCharts = window.AppCharts || {};

(function() {
  const { useState } = React;

  const BarChart = ({
    data,
    max = 10,
    accent = '#475569',
    onItemClick,
    totalCount,
    activeItem = null,
    descriptions = null
  }) => {
    const [hover, setHover] = useState(null);
    const top = data.slice(0, max);
    const maxValue = top.length > 0 ? top[0][1] : 1;
    const Wrapper = onItemClick ? 'button' : 'div';
    return (
      <div className="space-y-3">
        {top.map(([label, value]) => {
          const isHover  = hover === label;
          const isActive = activeItem === label;
          const isLit    = isHover || isActive;
          const pct = totalCount ? ((value / totalCount) * 100).toFixed(1) : null;
          const desc = descriptions ? descriptions[label] : null;
          const tooltip = desc ? `${label}\n\n${desc}` : label;
          return (
            <Wrapper
              key={label}
              type={onItemClick ? 'button' : undefined}
              onMouseEnter={() => setHover(label)}
              onMouseLeave={() => setHover(null)}
              onClick={onItemClick ? () => onItemClick(label) : undefined}
              className={`block w-full text-left transition-all ${onItemClick ? 'cursor-pointer' : ''}`}
            >
              <div className="flex justify-between items-baseline mb-1.5 gap-3">
                <span
                  className={`text-sm truncate transition-colors ${isLit ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}
                  title={tooltip}
                >
                  {label}
                </span>
                <span className="flex items-baseline gap-2 flex-shrink-0">
                  {pct && (
                    <span className={`text-xs tabular-nums transition-opacity ${isLit ? 'opacity-100 text-slate-500' : 'opacity-0'}`}>
                      {pct}%
                    </span>
                  )}
                  <span className={`text-sm tabular-nums transition-colors ${isLit ? 'text-slate-900 font-semibold' : 'text-slate-500 font-medium'}`}>
                    {value}
                  </span>
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(value / maxValue) * 100}%`,
                    background: isLit ? '#0f172a' : accent,
                  }}
                />
              </div>
            </Wrapper>
          );
        })}
      </div>
    );
  };

  const YearChart = ({ data, onItemClick, activeYear = null }) => {
    const [hover, setHover] = useState(null);
    if (!data.length) return null;
    const maxValue = Math.max(...data.map((d) => d[1]));

    // Half-height trend strip. The chart sits as a thin row at the
    // top of the descriptive grid; it is meant to convey shape
    // (growth over time), not to dominate the page.
    const width = 600;
    const height = 90;
    const padTop = 12;
    const padBottom = 26;
    const chartH = height - padTop - padBottom;   // 52
    const slot = width / data.length;
    const barW = Math.min(slot * 0.72, 28);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <line
          x1="0"
          y1={padTop + chartH}
          x2={width}
          y2={padTop + chartH}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        {data.map(([year, count], i) => {
          const barH = (count / maxValue) * chartH;
          const cx = i * slot + slot / 2;
          const x = cx - barW / 2;
          const y = padTop + chartH - barH;
          const isHover  = hover === year;
          const isActive = activeYear === year;
          const isLit    = isHover || isActive;

          let fill = '#94a3b8';
          if (isHover && !isActive) fill = '#475569';
          if (isActive) fill = '#0f172a';

          return (
            <g
              key={year}
              onMouseEnter={() => setHover(year)}
              onMouseLeave={() => setHover(null)}
              onClick={onItemClick ? () => onItemClick(year) : undefined}
              style={{ cursor: onItemClick ? 'pointer' : 'default' }}
            >
              <rect
                x={i * slot}
                y={0}
                width={slot}
                height={height}
                fill="transparent"
              />
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 2)}
                fill={fill}
                rx="2"
                style={{ transition: 'fill 180ms' }}
              />
              <text
                x={cx}
                y={y - 3}
                textAnchor="middle"
                fontSize="10"
                fill={isLit ? '#0f172a' : '#94a3b8'}
                fontWeight={isLit ? '700' : '600'}
                style={{ transition: 'all 180ms' }}
              >
                {count}
              </text>
              <text
                x={cx}
                y={padTop + chartH + 11}
                textAnchor="middle"
                fontSize="10"
                fill={isLit ? '#0f172a' : '#64748b'}
                fontWeight={isLit ? '700' : '500'}
                style={{ transition: 'all 180ms' }}
              >
                {year}
              </text>
              {isActive && (
                <circle cx={cx} cy={padTop + chartH + 18} r="2" fill="#0f172a" />
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  window.AppCharts.BarChart = BarChart;
  window.AppCharts.YearChart = YearChart;
})();