import React from 'react';
import { UTMCoordinate } from '../types/croqui';

interface GeometryStampProps {
  coordinates: UTMCoordinate[];
  className?: string;
}

export const GeometryStamp: React.FC<GeometryStampProps> = ({ coordinates, className = '' }) => {
  if (coordinates.length < 3) {
    return (
      <div className={`flex items-center justify-center text-xs text-gray-400 border border-gray-300 p-2 ${className}`}>
        Desenhe pelo menos 3 vértices
      </div>
    );
  }

  // Calculate local bounding box in meters
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  coordinates.forEach((c) => {
    if (c.easting < minX) minX = c.easting;
    if (c.easting > maxX) maxX = c.easting;
    if (c.northing < minY) minY = c.northing;
    if (c.northing > maxY) maxY = c.northing;
  });

  const widthMeters = Math.max(maxX - minX, 1);
  const heightMeters = Math.max(maxY - minY, 1);

  // SVG viewBox with margins for labels and dimension tags
  const svgWidth = 140;
  const svgHeight = 110;
  const padding = 24;

  const innerWidth = svgWidth - padding * 2;
  const innerHeight = svgHeight - padding * 2;

  const scale = Math.min(innerWidth / widthMeters, innerHeight / heightMeters);

  // Center offsets
  const renderedWidth = widthMeters * scale;
  const renderedHeight = heightMeters * scale;
  const offsetX = padding + (innerWidth - renderedWidth) / 2;
  const offsetY = padding + (innerHeight - renderedHeight) / 2;

  // Convert UTM to SVG coordinates (Northing increases up, SVG increases down)
  const pts = coordinates.map((c) => {
    const x = offsetX + (c.easting - minX) * scale;
    const y = offsetY + (maxY - c.northing) * scale;
    return { x, y, c };
  });

  const polygonPath = pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className={`relative flex items-center justify-center bg-white ${className}`}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-full max-h-32 select-none overflow-visible"
      >
        <defs>
          <pattern id="cadastralHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#16a34a" strokeWidth="0.8" opacity="0.3" />
          </pattern>
        </defs>

        {/* Background cadastral fill */}
        <polygon
          points={polygonPath}
          fill="url(#cadastralHatch)"
          stroke="#16a34a"
          strokeWidth="1.5"
          className="transition-all"
        />

        {/* Outer border highlight */}
        <polygon
          points={polygonPath}
          fill="#86efac"
          fillOpacity="0.35"
          stroke="#15803d"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Side dimension labels (Cotas) */}
        {pts.map((p1, idx) => {
          const p2 = pts[(idx + 1) % pts.length];
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const dist = p1.c.distanceToNext;

          // Normal vector for offset away from polygon center
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          const labelX = midX + nx * 7;
          const labelY = midY + ny * 7;

          // Angle of the edge
          let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (angleDeg > 90 || angleDeg < -90) {
            angleDeg += 180;
          }

          if (dist === undefined) return null;

          return (
            <g key={`dim-${idx}`} transform={`rotate(${angleDeg}, ${labelX}, ${labelY})`}>
              <rect
                x={labelX - 14}
                y={labelY - 5}
                width={28}
                height={10}
                fill="#ffffff"
                fillOpacity="0.85"
                rx="1"
              />
              <text
                x={labelX}
                y={labelY + 2.5}
                textAnchor="middle"
                fontSize="6"
                fontWeight="700"
                fill="#0f172a"
                fontFamily="sans-serif"
              >
                {dist.toFixed(2)} m
              </text>
            </g>
          );
        })}

        {/* Vertex markers, numbers, and interior angles */}
        {pts.map((p, idx) => (
          <g key={`vtx-${idx}`}>
            <circle cx={p.x} cy={p.y} r="2.8" fill="#15803d" stroke="#ffffff" strokeWidth="1" />
            <text
              x={p.x}
              y={p.y - 4}
              textAnchor="middle"
              fontSize="6"
              fontWeight="800"
              fill="#1e293b"
              fontFamily="sans-serif"
            >
              {p.c.id}
            </text>
            {p.c.interiorAngleDeg !== undefined && (
              <text
                x={p.x}
                y={p.y + 7.5}
                textAnchor="middle"
                fontSize="4.5"
                fontWeight="700"
                fill="#b45309"
                fontFamily="monospace"
              >
                {Math.round(p.c.interiorAngleDeg)}°
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};
