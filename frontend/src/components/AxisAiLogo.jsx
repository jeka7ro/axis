import React from 'react';

/**
 * Axis AI Official Logo & Icon Component
 * Strictly adheres to native Axis brand styling and Mac OS Tahoe rounded aesthetic.
 * Zero generic robotic iconography.
 */

export const AxisAiIcon = ({ size = 'md', className = '', showAiBadge = true }) => {
  const containerClasses = {
    sm: 'w-6 h-6 rounded-lg',
    md: 'w-10 h-10 rounded-2xl',
    lg: 'w-12 h-12 rounded-3xl',
  };

  const imgSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5.5 h-5.5',
    lg: 'w-6.5 h-6.5',
  };

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      <div
        className={`${containerClasses[size] || containerClasses.md} bg-gray-950 dark:bg-gray-900 text-white flex items-center justify-center shadow-md border border-gray-800 dark:border-gray-700/80 transition-transform group-hover:scale-105 overflow-hidden`}
      >
        {/* Official Axis 'A' Monogram (crisp white on obsidian squircle) */}
        <img
          src="/axis-a-white.png"
          alt="Axis AI"
          className={`${imgSizes[size] || imgSizes.md} object-contain select-none pointer-events-none drop-shadow-xs`}
        />
      </div>

      {showAiBadge && (
        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 text-[8px] font-black text-white tracking-wider shadow-sm border border-gray-950 dark:border-gray-900 leading-none select-none">
          AI
        </span>
      )}
    </div>
  );
};

export const AxisAiBadge = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <AxisAiIcon size="sm" showAiBadge={false} />
      <span className="text-xs font-bold tracking-wide text-gray-900 dark:text-white">
        Axis <span className="text-primary font-black">AI</span>
      </span>
    </div>
  );
};

export default AxisAiIcon;
