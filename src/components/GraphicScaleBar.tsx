import React from 'react';

interface GraphicScaleBarProps {
  scaleText: string; // e.g. "1:1.000", "1:500", "1:2.000", "1:5.000"
  className?: string;
}

export const GraphicScaleBar: React.FC<GraphicScaleBarProps> = ({ scaleText, className = '' }) => {
  // Parse nominal scale denominator: 1:1.000 -> 1000
  const denominator = parseInt(scaleText.replace(/[^0-9]/g, ''), 10) || 1000;

  // Determine suitable bar divisions (in meters) based on scale
  // At 96 DPI: 1 inch = 25.4 mm -> 1 mm = 3.7795 px -> 1 cm (10mm) = 37.8 px
  // At scale 1:D, 1 cm on paper represents (D / 100) meters in reality.
  // Pixels per meter = 37.795 / (D / 100) = 3779.5 / D

  let unitMeters = 10;
  let totalSteps = 4; // 0, 10, 20, 30, 40

  if (denominator <= 500) {
    unitMeters = 5;
    totalSteps = 4; // 0, 5, 10, 15, 20 m
  } else if (denominator <= 1000) {
    unitMeters = 10;
    totalSteps = 4; // 0, 10, 20, 30, 40 m
  } else if (denominator <= 2000) {
    unitMeters = 20;
    totalSteps = 4; // 0, 20, 40, 60, 80 m
  } else if (denominator <= 5000) {
    unitMeters = 50;
    totalSteps = 4; // 0, 50, 100, 150, 200 m
  } else {
    unitMeters = 100;
    totalSteps = 4; // 0, 100, 200, 300, 400 m
  }

  // Segment width in pixels for each unitMeters on an A4 sheet (96 DPI)
  // 1 cm on paper = 37.8 pixels.
  // 1 cm on paper represents (denominator / 100) meters.
  // So unitMeters takes (unitMeters / (denominator / 100)) * 37.8 pixels:
  const segmentPx = Math.max(24, Math.round((unitMeters / (denominator / 100)) * 37.795));

  return (
    <div className={`flex flex-col items-center bg-white/95 border border-slate-900 px-2.5 py-1 rounded-xs shadow-xs font-mono text-[8px] text-slate-950 select-none ${className}`}>
      <span className="font-bold text-[7.5px] uppercase tracking-wider text-slate-700 mb-0.5 font-sans">
        Escala Gráfica
      </span>

      {/* Ticks and Numbers */}
      <div className="flex" style={{ width: `${segmentPx * totalSteps}px` }}>
        {Array.from({ length: totalSteps + 1 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{
              position: 'relative',
              left: `${i * segmentPx}px`,
              transform: 'translateX(-50%)',
              width: 0,
            }}
          >
            <span className="font-bold text-[8px] leading-none mb-0.5">
              {i * unitMeters}
              {i === totalSteps ? 'm' : ''}
            </span>
          </div>
        ))}
      </div>

      {/* The Alternating Bar */}
      <div
        className="flex border border-slate-950 h-2 bg-slate-950 mt-0.5 overflow-hidden shadow-2xs"
        style={{ width: `${segmentPx * totalSteps}px` }}
      >
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-full border-r border-slate-950 ${i % 2 === 0 ? 'bg-slate-950' : 'bg-white'}`}
            style={{ width: `${segmentPx}px` }}
          />
        ))}
      </div>

      {/* Nominal Scale reference */}
      <span className="text-[7.5px] text-slate-600 font-semibold mt-0.5">
        Escala Nominal {scaleText}
      </span>
    </div>
  );
};
