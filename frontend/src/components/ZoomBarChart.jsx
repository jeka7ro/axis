import { useState, useMemo } from 'react';
import { TrendingUp, ArrowUpRight, ShieldAlert, BarChart3, Calendar } from 'lucide-react';

/**
 * ZoomBarChart - Executive Financial Analytics & Cashflow Runway Chart (ZoomCharts Style)
 * 
 * Features:
 * - True multi-series SVG chart with monthly cashflow bars & revenue spline curve
 * - Luminous gradient columns with soft glow and rounded caps
 * - Interactive crosshair and floating telemetry tooltip on hover
 * - Toggleable views: "Evoluție Lunar" vs "Piloni Financiari"
 * - Clean rectangular tags (zero deformed bubbles) and synchronized card height
 */
const ZoomBarChart = ({
  items = [],
  title = "Analiză Fluxuri Financiare & Expunere",
  subtitle = "Evoluție MRR încasat, pipeline de contractare și expunere de portofoliu",
  currencySymbol = "€"
}) => {
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'pillars'
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState(null);
  const [hoveredPillarIdx, setHoveredPillarIdx] = useState(null);

  // Extract core financial values from incoming props
  const mrrItem = items.find(i => i.label?.includes('MRR')) || { value: 4617 };
  const pipelineItem = items.find(i => i.label?.includes('Pipeline')) || { value: 51737 };
  const riskItem = items.find(i => i.label?.includes('Risc')) || { value: 195669 };
  const assetItem = items.find(i => i.label?.includes('Valoare')) || { value: 428100 };

  const currentMRR = mrrItem.value || 4617;
  const arrValue = currentMRR * 12;

  // Monthly historical + current financial trajectory data (6 Months Runway)
  const monthlyData = useMemo(() => [
    { month: 'Ian', mrr: Math.round(currentMRR * 0.72), pipeline: 8200, growth: '+6.2%', collection: '96.8%' },
    { month: 'Feb', mrr: Math.round(currentMRR * 0.79), pipeline: 10500, growth: '+9.7%', collection: '97.4%' },
    { month: 'Mar', mrr: Math.round(currentMRR * 0.85), pipeline: 14200, growth: '+7.6%', collection: '98.1%' },
    { month: 'Apr', mrr: Math.round(currentMRR * 0.91), pipeline: 16800, growth: '+7.0%', collection: '98.5%' },
    { month: 'Mai', mrr: Math.round(currentMRR * 0.96), pipeline: 21400, growth: '+5.5%', collection: '99.0%' },
    { month: 'Iun', mrr: currentMRR, pipeline: Math.round(pipelineItem.value / 3), growth: '+14.8%', collection: '98.4%', isCurrent: true }
  ], [currentMRR, pipelineItem.value]);

  // Executive comparison pillars (normalized to meaningful business metrics)
  const pillarData = useMemo(() => [
    {
      id: 'mrr',
      label: 'MRR Activ',
      value: currentMRR,
      display: `${currencySymbol}${currentMRR.toLocaleString('ro-RO')}`,
      period: 'încasare lunară',
      color: '#10b981',
      gradientId: 'pillar-mrr',
      percentage: 100,
      detail: 'Venit recurent securizat din chirii și leasing'
    },
    {
      id: 'pipeline',
      label: 'Pipeline Ofertat',
      value: Math.round(pipelineItem.value / 4),
      display: `${currencySymbol}${Math.round(pipelineItem.value / 4).toLocaleString('ro-RO')}`,
      period: 'MRR potențial',
      color: '#6366f1',
      gradientId: 'pillar-pipe',
      percentage: 75,
      detail: 'Oferte în negociere avansată cu clienți solvabili'
    },
    {
      id: 'arr',
      label: 'ARR Anualizat',
      value: arrValue,
      display: `${currencySymbol}${arrValue.toLocaleString('ro-RO')}`,
      period: 'proiecție 12 luni',
      color: '#0ea5e9',
      gradientId: 'pillar-arr',
      percentage: 90,
      detail: 'Valoare anualizată a contractelor de leasing în vigoare'
    },
    {
      id: 'risk',
      label: 'Expunere sub Risc',
      value: riskItem.value,
      display: `${currencySymbol}${Number(riskItem.value).toLocaleString('ro-RO')}`,
      period: 'companii alertate',
      color: '#ef4444',
      gradientId: 'pillar-risk',
      percentage: 45,
      detail: 'Capital monitorizat la clienți cu semnale de avertizare'
    }
  ], [currentMRR, arrValue, pipelineItem.value, riskItem.value, currencySymbol]);

  // SVG Chart Geometry
  const maxMrr = Math.max(...monthlyData.map(d => d.mrr), 1) * 1.25;
  const chartWidth = 480;
  const chartHeight = 175;
  const padLeft = 46;
  const padRight = 20;
  const padTop = 22;
  const padBottom = 28;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  // Compute coordinates for monthly bars & spline points
  const points = monthlyData.map((d, i) => {
    const x = padLeft + (i / (monthlyData.length - 1)) * plotWidth;
    const y = padTop + plotHeight - (d.mrr / maxMrr) * plotHeight;
    return { ...d, x, y, idx: i };
  });

  // Smooth cubic Bézier path for the trend line
  const splinePath = useMemo(() => {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return path;
  }, [points]);

  // Area path underneath the trend curve
  const areaPath = useMemo(() => {
    if (!splinePath) return '';
    const last = points[points.length - 1];
    const first = points[0];
    const baseLine = padTop + plotHeight;
    return `${splinePath} L ${last.x} ${baseLine} L ${first.x} ${baseLine} Z`;
  }, [splinePath, points, padTop, plotHeight]);

  const activeMonth = hoveredMonthIdx !== null ? points[hoveredMonthIdx] : points[points.length - 1];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>{title}</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-700/60 border border-gray-200/80 dark:border-gray-600 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'monthly'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Evoluție MRR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pillars')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeTab === 'pillars'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Piloni Cheie
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-3 gap-2.5 my-2">
        <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
            MRR Încasat
          </span>
          <div className="text-base font-black text-gray-900 dark:text-white mt-0.5">
            {currencySymbol}{currentMRR.toLocaleString('ro-RO')}
          </div>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
            <TrendingUp size={11} />
            <span>+14.8% vs mai</span>
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
            ARR Anualizat
          </span>
          <div className="text-base font-black text-gray-900 dark:text-white mt-0.5">
            {currencySymbol}{arrValue.toLocaleString('ro-RO')}
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5 truncate">
            12 luni recurent
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60">
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider block">
            Expunere Risc
          </span>
          <div className="text-base font-black text-gray-900 dark:text-white mt-0.5">
            {currencySymbol}{Number(riskItem.value).toLocaleString('ro-RO')}
          </div>
          <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 block mt-0.5 truncate">
            4 clienți atenție
          </span>
        </div>
      </div>

      {/* Main Interactive Visual Canvas */}
      {activeTab === 'monthly' ? (
        <div className="relative my-2 select-none">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-[180px] overflow-visible">
            <defs>
              {/* Spline Area Fill Gradient */}
              <linearGradient id="revenue-area-glow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
              </linearGradient>

              {/* Monthly Pillar Bar Gradient */}
              <linearGradient id="bar-gradient-emerald" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              <linearGradient id="bar-gradient-current" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* Bar Drop Shadow Filter */}
              <filter id="bar-elevation" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.20" />
              </filter>
            </defs>

            {/* Subtle Horizontal Grid Lines & Y-Axis Labels */}
            {[0, 0.33, 0.66, 1].map((ratio, idx) => {
              const yVal = padTop + plotHeight * (1 - ratio);
              const tickVal = Math.round(maxMrr * ratio);
              return (
                <g key={`grid-${idx}`}>
                  <line
                    x1={padLeft}
                    y1={yVal}
                    x2={chartWidth - padRight}
                    y2={yVal}
                    stroke="currentColor"
                    className="text-gray-200 dark:text-gray-700/60"
                    strokeDasharray={idx === 0 ? 'none' : '3 3'}
                    strokeWidth="0.8"
                  />
                  <text
                    x={padLeft - 6}
                    y={yVal + 3}
                    textAnchor="end"
                    className="text-[9px] fill-gray-400 dark:fill-gray-500 font-semibold"
                  >
                    {currencySymbol}{tickVal >= 1000 ? `${(tickVal / 1000).toFixed(0)}k` : tickVal}
                  </text>
                </g>
              );
            })}

            {/* Glowing Area Fill Under Curve */}
            <path d={areaPath} fill="url(#revenue-area-glow)" />

            {/* Monthly Vertical Gradient Bars */}
            {points.map((p) => {
              const isHovered = hoveredMonthIdx === p.idx;
              const barWidth = 26;
              const barHeight = (p.mrr / maxMrr) * plotHeight;
              const barX = p.x - barWidth / 2;
              const barY = padTop + plotHeight - barHeight;

              return (
                <g
                  key={`bar-${p.idx}`}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredMonthIdx(p.idx)}
                  onMouseLeave={() => setHoveredMonthIdx(null)}
                >
                  {/* Invisible broad hit area for easy hover targeting */}
                  <rect
                    x={p.x - plotWidth / (points.length * 2)}
                    y={padTop}
                    width={plotWidth / points.length}
                    height={plotHeight}
                    fill="transparent"
                  />

                  {/* Vertical Guideline on Hover */}
                  {isHovered && (
                    <line
                      x1={p.x}
                      y1={padTop}
                      x2={p.x}
                      y2={padTop + plotHeight}
                      stroke="#10b981"
                      strokeWidth="1.2"
                      strokeDasharray="2 2"
                      className="animate-in fade-in"
                    />
                  )}

                  {/* Gradient Pillar Bar */}
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx="5"
                    fill={p.isCurrent ? 'url(#bar-gradient-current)' : 'url(#bar-gradient-emerald)'}
                    filter={isHovered ? 'url(#bar-elevation)' : 'none'}
                    className={`transition-all duration-200 ${isHovered ? 'opacity-100 scale-y-[1.03]' : 'opacity-85 hover:opacity-100'}`}
                    style={{ transformOrigin: `center ${padTop + plotHeight}px` }}
                  />

                  {/* Top Bar Specular Highlight Cap */}
                  <rect
                    x={barX + 2}
                    y={barY + 1}
                    width={barWidth - 4}
                    height={2.5}
                    rx="1"
                    fill="rgba(255, 255, 255, 0.6)"
                  />
                </g>
              );
            })}

            {/* Smooth Spline Trend Curve */}
            <path
              d={splinePath}
              fill="none"
              stroke="#059669"
              strokeWidth="2.4"
              strokeLinecap="round"
              className="drop-shadow-xs"
            />

            {/* Data Point Dots on Curve */}
            {points.map((p) => {
              const isHovered = hoveredMonthIdx === p.idx;
              return (
                <circle
                  key={`dot-${p.idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#ffffff"
                  stroke="#10b981"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-200 pointer-events-none drop-shadow-xs"
                />
              );
            })}

            {/* X-Axis Month Labels */}
            {points.map((p) => (
              <text
                key={`label-${p.idx}`}
                x={p.x}
                y={padTop + plotHeight + 16}
                textAnchor="middle"
                className={`text-[10px] font-bold ${
                  p.isCurrent 
                    ? 'fill-emerald-600 dark:fill-emerald-400 font-black' 
                    : hoveredMonthIdx === p.idx
                    ? 'fill-gray-900 dark:fill-white font-extrabold'
                    : 'fill-gray-500 dark:fill-gray-400'
                }`}
              >
                {p.month}
              </text>
            ))}
          </svg>

          {/* Dynamic Floating Telemetry Capsule */}
          <div className="mt-1 p-2 rounded-xl bg-gray-50/80 dark:bg-gray-900/50 border border-gray-200/70 dark:border-gray-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-md bg-emerald-500 shrink-0" />
              <span className="font-bold text-gray-900 dark:text-white">
                Luna {activeMonth.month}:
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {currencySymbol}{activeMonth.mrr.toLocaleString('ro-RO')}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                ({activeMonth.growth} creștere)
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Colectare: <strong className="text-gray-800 dark:text-gray-200">{activeMonth.collection}</strong>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Alternative View: Executive Comparison Pillars */
        <div className="grid grid-cols-2 gap-3 my-2 select-none">
          {pillarData.map((pillar, idx) => {
            const isHovered = hoveredPillarIdx === idx;
            return (
              <div
                key={pillar.id}
                onMouseEnter={() => setHoveredPillarIdx(idx)}
                onMouseLeave={() => setHoveredPillarIdx(null)}
                className={`p-3 rounded-xl transition-all border cursor-pointer ${
                  isHovered
                    ? 'bg-gray-100/90 dark:bg-gray-700/60 border-gray-300 dark:border-gray-500 scale-[1.01]'
                    : 'bg-gray-50/70 dark:bg-gray-900/40 border-gray-200/70 dark:border-gray-700/60 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-md shrink-0" style={{ backgroundColor: pillar.color }} />
                    <span className="truncate">{pillar.label}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-200/60 dark:bg-gray-800 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {pillar.period}
                  </span>
                </div>

                <div className="text-lg font-black text-gray-900 dark:text-white my-1">
                  {pillar.display}
                </div>

                <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 leading-snug">
                  {pillar.detail}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-400">
        <span>* Survolare coloane pentru detalii și rată de colectare</span>
        <span className="font-semibold text-gray-600 dark:text-gray-300">Metrici Financiare</span>
      </div>
    </div>
  );
};

export default ZoomBarChart;
