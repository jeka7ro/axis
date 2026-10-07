import { useState } from 'react';

/**
 * ZoomPieChart - Authentic 3D Isometric Donut Chart
 * 
 * Features:
 * - True 3D cylinder extrusion geometry with 34px depth wall
 * - Directional lighting gradients & specular top bevel
 * - Inner hole cylinder wall depth (no flat 2D look)
 * - Seamless floating center telemetry (NO square sticker box covering the 3D hole)
 * - 3D slice pop-up and vertical lift on hover/selection
 * - Spacious tabular legend with rectangular badges (zero deformed bubbles)
 */
const ZoomPieChart = ({ 
  data = [], 
  title = "Distribuție & Utilizare Flotă", 
  subtitle = "Segmentare vehicule active în funcție de status operațional", 
  centerLabel = "Total", 
  unit = "mașini",
  onSliceClick = null,
  selectedId = null
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const totalValue = data.reduce((sum, item) => sum + (item.value || 0), 0);

  // 3D Geometry configuration (tilted cylinder)
  const cx = 150;
  const cy = 94;
  const rx = 124;        // Outer radius X (horizontal)
  const ry = 62;         // Outer radius Y (vertical, compressed for 3D tilt)
  const irx = 56;        // Inner hole radius X
  const iry = 28;        // Inner hole radius Y
  const depth = 34;      // 3D Extrusion height in pixels

  // Helper to calculate point on tilted ellipse
  const pt = (angleDeg, rX, rY, offsetY = 0) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + rX * Math.cos(rad),
      y: cy + rY * Math.sin(rad) + offsetY
    };
  };

  // Color darkening for 3D depth side walls
  const darkenColor = (hex, percent = 30) => {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) - Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00FF) - Math.round(255 * (percent / 100));
    let b = (num & 0x0000FF) - Math.round(255 * (percent / 100));
    r = Math.max(0, r);
    g = Math.max(0, g);
    b = Math.max(0, b);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Color lightening for 3D top specular highlights
  const lightenColor = (hex, percent = 20) => {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
    r = Math.min(255, r);
    g = Math.min(255, g);
    b = Math.min(255, b);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  // Compute angle intervals for each slice
  let currentAngle = 0;
  const slices = data.map((item, idx) => {
    const sliceAngle = totalValue > 0 ? (item.value / totalValue) * 360 : 0;
    const startA = currentAngle;
    const endA = currentAngle + sliceAngle;
    currentAngle += sliceAngle;
    const midA = (startA + endA) / 2;

    const darkColor = darkenColor(item.color, 36);
    const lightColor = lightenColor(item.color, 24);

    // Calculate 3D lift offset on hover (rising up along Y and translating along slice normal)
    const midRad = ((midA - 90) * Math.PI) / 180;
    const hoverDx = Math.cos(midRad) * 12;
    const hoverDy = Math.sin(midRad) * 6 - 11; // Elevate up in isometric 3D

    return {
      ...item,
      idx,
      startA,
      endA,
      midA,
      darkColor,
      lightColor,
      hoverDx,
      hoverDy,
      percentage: totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0
    };
  });

  // Painter's algorithm: sort slices for 3D back-to-front drawing order
  const sortedSlices = [...slices].sort((a, b) => {
    const aDepth = Math.sin(((a.midA - 90) * Math.PI) / 180);
    const bDepth = Math.sin(((b.midA - 90) * Math.PI) / 180);
    return aDepth - bDepth;
  });

  // Helper to generate outer 3D cylinder curved wall path
  const makeOuterWallPath = (startA, endA) => {
    const steps = Math.max(Math.ceil((endA - startA) / 6), 6);
    const topPts = [];
    const botPts = [];

    for (let i = 0; i <= steps; i++) {
      const a = startA + ((endA - startA) * i) / steps;
      topPts.push(pt(a, rx, ry, 0));
      botPts.push(pt(a, rx, ry, depth));
    }

    let path = `M ${topPts[0].x} ${topPts[0].y}`;
    for (let i = 1; i < topPts.length; i++) {
      path += ` L ${topPts[i].x} ${topPts[i].y}`;
    }
    for (let i = botPts.length - 1; i >= 0; i--) {
      path += ` L ${botPts[i].x} ${botPts[i].y}`;
    }
    path += ' Z';
    return path;
  };

  // Helper to generate inner hole cylinder wall path
  const makeInnerWallPath = (startA, endA) => {
    const steps = Math.max(Math.ceil((endA - startA) / 6), 6);
    const topPts = [];
    const botPts = [];

    for (let i = 0; i <= steps; i++) {
      const a = startA + ((endA - startA) * i) / steps;
      topPts.push(pt(a, irx, iry, 0));
      botPts.push(pt(a, irx, iry, depth));
    }

    let path = `M ${topPts[0].x} ${topPts[0].y}`;
    for (let i = 1; i < topPts.length; i++) {
      path += ` L ${topPts[i].x} ${topPts[i].y}`;
    }
    for (let i = botPts.length - 1; i >= 0; i--) {
      path += ` L ${botPts[i].x} ${botPts[i].y}`;
    }
    path += ' Z';
    return path;
  };

  // Helper to generate top face of a 3D slice
  const makeTopFacePath = (startA, endA) => {
    const steps = Math.max(Math.ceil((endA - startA) / 6), 6);
    const outerPts = [];
    const innerPts = [];

    for (let i = 0; i <= steps; i++) {
      const a = startA + ((endA - startA) * i) / steps;
      outerPts.push(pt(a, rx, ry, 0));
      innerPts.push(pt(a, irx, iry, 0));
    }

    let path = `M ${outerPts[0].x} ${outerPts[0].y}`;
    for (let i = 1; i < outerPts.length; i++) {
      path += ` L ${outerPts[i].x} ${outerPts[i].y}`;
    }
    for (let i = innerPts.length - 1; i >= 0; i--) {
      path += ` L ${innerPts[i].x} ${innerPts[i].y}`;
    }
    path += ' Z';
    return path;
  };

  // Helper to generate radial side cut wall
  const makeRadialCutWall = (angle) => {
    const outerTop = pt(angle, rx, ry, 0);
    const outerBot = pt(angle, rx, ry, depth);
    const innerTop = pt(angle, irx, iry, 0);
    const innerBot = pt(angle, irx, iry, depth);

    return `M ${innerTop.x} ${innerTop.y} L ${outerTop.x} ${outerTop.y} L ${outerBot.x} ${outerBot.y} L ${innerBot.x} ${innerBot.y} Z`;
  };

  const activeSlice = hoveredIdx !== null 
    ? slices[hoveredIdx] 
    : (selectedId ? slices.find(s => s.id === selectedId) : null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        {selectedId && onSliceClick && (
          <button
            type="button"
            onClick={() => onSliceClick(null)}
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            Resetează Filtru
          </button>
        )}
      </div>

      {/* Main 3D Canvas + Legend Area */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 my-2">
        {/* SVG 3D Isometric Viewport */}
        <div className="relative w-full lg:w-[260px] h-[210px] shrink-0 flex items-center justify-center select-none">
          <svg
            viewBox="0 0 300 220"
            className="w-full h-full overflow-visible drop-shadow-md"
          >
            <defs>
              {/* Floor Shadow Filter */}
              <filter id="floor-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="8" />
              </filter>

              {/* Shading gradients for each slice */}
              {slices.map((s) => (
                <linearGradient key={`grad-top-${s.idx}`} id={`grad-top-${s.idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={s.lightColor} />
                  <stop offset="65%" stopColor={s.color} />
                  <stop offset="100%" stopColor={darkenColor(s.color, 12)} />
                </linearGradient>
              ))}

              {slices.map((s) => (
                <linearGradient key={`grad-wall-${s.idx}`} id={`grad-wall-${s.idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={s.color} />
                  <stop offset="70%" stopColor={s.darkColor} />
                  <stop offset="100%" stopColor={darkenColor(s.darkColor, 25)} />
                </linearGradient>
              ))}

              {slices.map((s) => (
                <linearGradient key={`grad-inner-${s.idx}`} id={`grad-inner-${s.idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={darkenColor(s.color, 25)} />
                  <stop offset="100%" stopColor={darkenColor(s.color, 12)} />
                </linearGradient>
              ))}
            </defs>

            {/* Realistic 3D Floor Shadow */}
            <ellipse
              cx={cx}
              cy={cy + depth + 12}
              rx={rx + 10}
              ry={ry + 8}
              fill="rgba(15, 23, 42, 0.28)"
              filter="url(#floor-3d-shadow)"
            />

            {/* Slices Rendered in 3D Order (Back to Front) */}
            {sortedSlices.map((slice) => {
              const isHovered = hoveredIdx === slice.idx;
              const isSelected = selectedId === slice.id;
              const isPopped = isHovered || isSelected;

              const transform = isPopped
                ? `translate(${slice.hoverDx}, ${slice.hoverDy})`
                : 'translate(0, 0)';

              return (
                <g
                  key={slice.id || slice.idx}
                  transform={transform}
                  className="transition-transform duration-200 ease-out cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(slice.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSliceClick && onSliceClick(isSelected ? null : slice.id)}
                >
                  {/* 1. Inner Hole Cylinder Wall */}
                  <path
                    d={makeInnerWallPath(slice.startA, slice.endA)}
                    fill={`url(#grad-inner-${slice.idx})`}
                    stroke="rgba(0,0,0,0.18)"
                    strokeWidth="0.5"
                  />

                  {/* 2. Radial Side Cut Wall - Start */}
                  <path
                    d={makeRadialCutWall(slice.startA)}
                    fill={darkenColor(slice.darkColor, 18)}
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="0.5"
                  />

                  {/* 3. Radial Side Cut Wall - End */}
                  <path
                    d={makeRadialCutWall(slice.endA)}
                    fill={slice.darkColor}
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="0.5"
                  />

                  {/* 4. Outer Curved 3D Cylinder Wall */}
                  <path
                    d={makeOuterWallPath(slice.startA, slice.endA)}
                    fill={`url(#grad-wall-${slice.idx})`}
                    stroke={darkenColor(slice.darkColor, 20)}
                    strokeWidth="0.6"
                  />

                  {/* 5. Top Face (Cap) with specular highlight */}
                  <path
                    d={makeTopFacePath(slice.startA, slice.endA)}
                    fill={`url(#grad-top-${slice.idx})`}
                    stroke={isPopped ? "#ffffff" : "rgba(255,255,255,0.45)"}
                    strokeWidth={isPopped ? "1.6" : "1"}
                  />
                </g>
              );
            })}
          </svg>

          {/* Central Telemetry Core - High Contrast Crisp Display */}
          <div className="absolute top-[43%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-10">
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 text-center min-w-[90px]">
              {activeSlice ? (
                <div className="animate-in fade-in duration-150">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider block whitespace-nowrap" style={{ color: activeSlice.color }}>
                    {activeSlice.label}
                  </span>
                  <div className="text-xl font-black text-gray-900 dark:text-white leading-none my-0.5">
                    {activeSlice.value}
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block whitespace-nowrap">
                    {activeSlice.percentage}% din flotă
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[9px] font-extrabold text-gray-400 dark:text-gray-400 uppercase tracking-widest block whitespace-nowrap">
                    {centerLabel}
                  </span>
                  <div className="text-2xl font-black text-gray-900 dark:text-white leading-none my-0.5">
                    {totalValue}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block whitespace-nowrap">
                    {unit} active
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Crisp Tabular Legend (Rectangular Cards, Zero Bubbles) */}
        <div className="w-full lg:flex-1 space-y-2 text-xs">
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.idx;
            const isSelected = selectedId === slice.id;

            return (
              <div
                key={slice.id || slice.idx}
                onMouseEnter={() => setHoveredIdx(slice.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSliceClick && onSliceClick(isSelected ? null : slice.id)}
                className={`p-2 rounded-lg transition-all flex items-center justify-between cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs'
                    : isHovered
                    ? 'bg-gray-100/90 dark:bg-gray-700/60 border-gray-300 dark:border-gray-600 scale-[1.01]'
                    : 'bg-gray-50/60 dark:bg-gray-900/30 border-gray-200/60 dark:border-gray-700/50 hover:bg-gray-100/70'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs"
                    style={{ backgroundColor: slice.color }}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-gray-900 dark:text-white block text-xs">
                      {slice.label}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate">
                      {slice.secondaryText}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2 ml-2">
                  <span className="font-extrabold text-gray-900 dark:text-white text-xs whitespace-nowrap">
                    {slice.value} {unit}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                    {slice.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-400">
        <span>* Click pe segmente pentru filtrare operațională</span>
        <span className="font-semibold text-gray-600 dark:text-gray-300">Status Live</span>
      </div>
    </div>
  );
};

export default ZoomPieChart;
