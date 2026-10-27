import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CroquiProject, UTMCoordinate } from '../types/croqui';
import { NorthArrow } from './NorthArrow';
import { GeometryStamp } from './GeometryStamp';
import { GraphicScaleBar } from './GraphicScaleBar';
import {
  projectLatLngToMapPixels,
  projectMapPixelsToLatLng,
  renderMapToCanvas,
  calculateOptimalZoom,
} from '../utils/tileImagery';
import { Layers, ZoomIn, ZoomOut, Compass, MapPin, Lock } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';

interface CroquiDocumentProps {
  apiKey: string;
  project: CroquiProject;
  metrics: {
    areaSqMeters: number;
    perimeterMeters: number;
    coordinates: UTMCoordinate[];
    center: { lat: number; lng: number };
    utmCenter: { easting: number; northing: number };
    zone: number;
    hemisphere: 'N' | 'S';
    centralMeridian: number;
    sumInteriorAngles: number;
    expectedSumInteriorAngles: number;
    isConvex: boolean;
  };
  documentRef?: React.RefObject<HTMLDivElement | null>;
}

export const CroquiDocument: React.FC<CroquiDocumentProps> = ({
  project,
  metrics,
  documentRef,
}) => {
  const { isLicenseActive, checkLicenseBeforeAction } = useLicense();
  const { stamp, layout } = project;
  const center = metrics.center;
  const utmCenter = metrics.utmCenter;

  // Sheet dimension calculation based on layout paper format
  const isLandscape = layout.paperFormat === 'A4_LANDSCAPE' || layout.paperFormat === 'A3_LANDSCAPE';
  const isA3 = layout.paperFormat === 'A3_PORTRAIT' || layout.paperFormat === 'A3_LANDSCAPE';

  const sheetWidth = isA3 ? (isLandscape ? 1587 : 1123) : (isLandscape ? 1123 : 794);
  const sheetMinHeight = isA3 ? (isLandscape ? 1123 : 1587) : (isLandscape ? 794 : 1120);

  // Inner viewport dimensions
  const mapInnerWidth = sheetWidth - 36;
  const aerialHeight = isLandscape ? (isA3 ? 460 : 320) : (isA3 ? 560 : 380);
  const contextHeight = isLandscape ? (isA3 ? 380 : 250) : (isA3 ? 460 : 310);

  // Zoom and map rendering controls
  const [aerialZoomOffset, setAerialZoomOffset] = useState<number>(0);
  const [contextZoomOffset, setContextZoomOffset] = useState<number>(0);
  const [showSatelliteLabels, setShowSatelliteLabels] = useState<boolean>(true);
  const [contextMapType, setContextMapType] = useState<'street' | 'osm' | 'topo'>('street');
  const [showDimensionsOnMap, setShowDimensionsOnMap] = useState(true);
  const [showAnglesOnMap, setShowAnglesOnMap] = useState(true);

  // Base64 images rendered from high-res tile compositor
  const [aerialDataUrl, setAerialDataUrl] = useState<string>('');
  const [contextDataUrl, setContextDataUrl] = useState<string>('');
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);

  // Offscreen canvases for compositing
  const aerialCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Polygon bounding box in Lat/Lng
  const polygonBounds = useMemo(() => {
    if (project.vertices.length === 0) {
      return {
        minLat: center.lat - 0.001,
        maxLat: center.lat + 0.001,
        minLng: center.lng - 0.001,
        maxLng: center.lng + 0.001,
      };
    }
    const lats = project.vertices.map((v) => v.lat);
    const lngs = project.vertices.map((v) => v.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [project.vertices, center]);

  // Automatically adjust Google Maps satellite view to optimal zoom level (level 19 or 20) for primary localization map to ensure house-level detail
  const baseAerialZoom = useMemo(() => {
    // Automatically calculate optimal zoom level (targeting level 19 or 20) for house-level detail
    const autoOptimal = calculateOptimalZoom(polygonBounds, mapInnerWidth, aerialHeight);

    // If project layout has an explicit high-detail zoom set (>= 18.5), honor it; otherwise use the calculated optimal level (19 or 20)
    if (project.layout.satelliteZoom && project.layout.satelliteZoom >= 18.5) {
      return project.layout.satelliteZoom;
    }
    return autoOptimal;
  }, [project.layout.satelliteZoom, polygonBounds, mapInnerWidth, aerialHeight]);

  const effectiveAerialZoom = Math.max(18.0, Math.min(20.5, baseAerialZoom + aerialZoomOffset));

  // Maintain a wider, contextual view for the secondary overview map (~3-5 km across)
  const effectiveContextZoom = Math.max(12.5, Math.min(15.0, 14.0 + contextZoomOffset));

  // Render aerial satellite map onto canvas
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingMaps(true);

    const renderAerial = async () => {
      let canvas = aerialCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        aerialCanvasRef.current = canvas;
      }

      const dataUrl = await renderMapToCanvas(canvas, {
        centerLat: center.lat,
        centerLng: center.lng,
        zoom: effectiveAerialZoom,
        width: mapInnerWidth,
        height: aerialHeight,
        type: showSatelliteLabels ? 'hybrid' : 'satellite',
        includeLabels: showSatelliteLabels,
      });

      if (!isCancelled && dataUrl) {
        setAerialDataUrl(dataUrl);
      }
    };

    const renderContext = async () => {
      let canvas = contextCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        contextCanvasRef.current = canvas;
      }

      const dataUrl = await renderMapToCanvas(canvas, {
        centerLat: center.lat,
        centerLng: center.lng,
        zoom: effectiveContextZoom,
        width: mapInnerWidth,
        height: contextHeight,
        type: contextMapType,
      });

      if (!isCancelled && dataUrl) {
        setContextDataUrl(dataUrl);
      }
    };

    Promise.all([renderAerial(), renderContext()]).finally(() => {
      if (!isCancelled) {
        setIsLoadingMaps(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [
    center.lat,
    center.lng,
    effectiveAerialZoom,
    effectiveContextZoom,
    showSatelliteLabels,
    contextMapType,
    mapInnerWidth,
    aerialHeight,
    contextHeight,
  ]);

  // Project polygon vertices to exact sub-pixel coordinates on the aerial canvas
  const projectedPolygonPoints = useMemo(() => {
    return metrics.coordinates.map((c) => {
      const { px, py } = projectLatLngToMapPixels(
        c.latitude,
        c.longitude,
        center.lat,
        center.lng,
        effectiveAerialZoom,
        mapInnerWidth,
        aerialHeight
      );
      return {
        ...c,
        px,
        py,
      };
    });
  }, [metrics.coordinates, center.lat, center.lng, effectiveAerialZoom, mapInnerWidth, aerialHeight]);

  // SVG polygon path string
  const polygonPathD = useMemo(() => {
    return projectedPolygonPoints.map((p) => `${p.px.toFixed(1)},${p.py.toFixed(1)}`).join(' ');
  }, [projectedPolygonPoints]);

  // Dynamic UTM axis tick labels
  const utmTickInterval = layout.gridSpacingMeters || 100;
  const roundedEast = Math.round(utmCenter.easting / utmTickInterval) * utmTickInterval;
  const roundedNorth = Math.round(utmCenter.northing / utmTickInterval) * utmTickInterval;

  const eastTicks = [
    roundedEast - utmTickInterval * 1.5,
    roundedEast - utmTickInterval * 0.5,
    roundedEast + utmTickInterval * 0.5,
    roundedEast + utmTickInterval * 1.5,
  ];

  const northTicks = [
    roundedNorth + utmTickInterval * 0.7,
    roundedNorth - utmTickInterval * 0.7,
  ];

  return (
    <div className="w-full flex flex-col items-center p-2 sm:p-6 bg-slate-900/60 overflow-x-auto">
      {!isLicenseActive && (
        <div className="no-print mb-3 bg-amber-950/80 border border-amber-600/60 text-amber-200 px-4 py-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl max-w-5xl w-full">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-amber-400 shrink-0" />
            <span>
              <strong>Modo de Consulta (Sem Licença Ativa):</strong> O croqui e coordenadas estão visíveis para conferência, mas exportação oficial em PDF, impressão e edições requerem uma licença ativa do DIOGIS.
            </span>
          </div>
          <button
            onClick={() => checkLicenseBeforeAction('Exportação e impressão oficial')}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition shrink-0"
          >
            Ativar Licença
          </button>
        </div>
      )}

      {/* Top Floating Controls Bar */}
      <div className="no-print mb-3 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 shadow-xl max-w-5xl w-full">
        {/* Top Satellite Map Controls */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400 flex items-center gap-1.5 text-[11px]">
            <Layers size={13} className="text-cyan-400" />
            Foto Satélite (Cima):
          </span>
          <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setAerialZoomOffset((prev) => Math.max(-1.5, prev - 0.5))}
              className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white transition flex items-center gap-0.5"
              title="Afastar foto de satélite"
            >
              <ZoomOut size={12} /> -
            </button>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold text-cyan-300">
              {effectiveAerialZoom.toFixed(1)}z
            </span>
            <button
              type="button"
              onClick={() => setAerialZoomOffset((prev) => Math.min(2.0, prev + 0.5))}
              className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white transition flex items-center gap-0.5"
              title="Aproximar foto de satélite"
            >
              <ZoomIn size={12} /> +
            </button>
          </div>
          <label className="flex items-center gap-1 cursor-pointer text-[10.5px] text-cyan-300 ml-1 select-none">
            <input
              type="checkbox"
              checked={showSatelliteLabels}
              onChange={(e) => setShowSatelliteLabels(e.target.checked)}
              className="rounded border-slate-600 accent-cyan-500"
            />
            <span>Ruas no Satélite</span>
          </label>
        </div>

        {/* Bottom Detailed Street Map Controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold text-[11px]">Mapa de Ruas (Baixo):</span>
          <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setContextZoomOffset((prev) => Math.max(-1.5, prev - 0.5))}
              className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white transition flex items-center gap-0.5"
              title="Afastar mapa de ruas"
            >
              <ZoomOut size={12} /> -
            </button>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold text-amber-300">
              {effectiveContextZoom.toFixed(1)}z
            </span>
            <button
              type="button"
              onClick={() => setContextZoomOffset((prev) => Math.min(2.0, prev + 0.5))}
              className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white transition flex items-center gap-0.5"
              title="Aproximar mapa de ruas"
            >
              <ZoomIn size={12} /> +
            </button>
          </div>

          {/* Bottom Map Style Selector */}
          <select
            value={contextMapType}
            onChange={(e) => setContextMapType(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-200 font-medium"
          >
            <option value="street">Ruas Detalhadas (Esri)</option>
            <option value="osm">OpenStreetMap</option>
            <option value="topo">Topográfico</option>
          </select>
        </div>

        {/* Cadastral Dimension Toggles */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 select-none">
            <input
              type="checkbox"
              checked={showDimensionsOnMap}
              onChange={(e) => setShowDimensionsOnMap(e.target.checked)}
              className="rounded border-slate-600 accent-emerald-500"
            />
            <span>Cotas dos Lados</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 select-none">
            <input
              type="checkbox"
              checked={showAnglesOnMap}
              onChange={(e) => setShowAnglesOnMap(e.target.checked)}
              className="rounded border-slate-600 accent-amber-500"
            />
            <span>Ângulos</span>
          </label>
        </div>
      </div>

      {/* Topographic Document Container */}
      <div
        ref={documentRef}
        id="croqui-print-sheet"
        data-maps-ready={Boolean(aerialDataUrl && contextDataUrl && !isLoadingMaps) ? 'true' : 'false'}
        className="bg-white text-slate-900 shadow-2xl relative flex flex-col font-sans border-2 border-slate-950 transition-all select-none"
        style={{
          width: `${sheetWidth}px`,
          minHeight: `${sheetMinHeight}px`,
          boxSizing: 'border-box',
          padding: '14px',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Outer Frame Double Line (Topographic Cartographic Standard) */}
        <div className="border border-slate-950 p-1 flex-1 flex flex-col bg-white">
          {/* HEADER BANNER */}
          <div className="border border-slate-950 bg-sky-200/90 px-4 py-2 flex items-center justify-between relative shadow-xs">
            {/* North Arrow on the Left */}
            <div className="w-16 flex items-center justify-center">
              <NorthArrow size={44} />
            </div>

            {/* Title */}
            <div className="flex-1 text-center">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-slate-950 uppercase font-sans drop-shadow-2xs">
                {stamp.title || 'CROQUIS DE LOCALIZAÇÃO'}
              </h1>
            </div>

            {/* Right Spacing / Symmetrical Balance with UTM details */}
            <div className="w-24 flex flex-col items-end text-[9.5px] font-mono text-slate-800 font-bold leading-tight">
              <span>ZONA {metrics.zone}{metrics.hemisphere}</span>
              <span className="text-[8.5px] font-semibold text-slate-600">MC {metrics.centralMeridian}º E</span>
              <span className="text-[8px] font-semibold text-slate-500 uppercase">{layout.paperFormat.replace('_', ' ')}</span>
            </div>
          </div>

          {/* TOP PANEL: ORTOFOTOMAPA / VISTA AÉREA SATÉLITE */}
          <div className="mt-1 border border-slate-950 flex flex-col relative overflow-hidden bg-slate-100">
            {/* UTM Coordinates Top Axis Ticks */}
            {layout.showUtmGrid && (
              <div className="bg-white border-b border-slate-400 flex justify-around py-0.5 text-[9.5px] font-mono font-bold text-slate-800">
                {eastTicks.map((val, idx) => (
                  <span key={`e-top-${idx}`}>{val.toFixed(0)}</span>
                ))}
              </div>
            )}

            {/* Aerial Map Viewport with High-Res Satellite and Dynamic Cadastral Marking */}
            <div
              className="relative w-full bg-slate-900 overflow-hidden flex items-center justify-center"
              style={{ width: `${mapInnerWidth}px`, height: `${aerialHeight}px` }}
            >
              {/* High Resolution Orthomosaic Raster Background */}
              {aerialDataUrl ? (
                <img
                  src={aerialDataUrl}
                  alt="Fotografia Aérea Ortorretificada"
                  className="w-full h-full object-cover select-none"
                  style={{
                    filter: 'contrast(1.12) brightness(1.02) saturate(1.15)',
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs">
                  <div className="w-8 h-8 rounded-full border-3 border-cyan-500 border-t-transparent animate-spin mb-2"></div>
                  <span>Carregando foto de satélite georreferenciada...</span>
                </div>
              )}

              {/* Dynamic Vector Cadastral Marking SVG Overlay */}
              <svg
                viewBox={`0 0 ${mapInnerWidth} ${aerialHeight}`}
                className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-visible"
              >
                <defs>
                  {/* Cadastral Lot Green Hatch Pattern */}
                  <pattern
                    id="mapHatchPattern"
                    width="6"
                    height="6"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#15803d" strokeWidth="1.2" opacity="0.65" />
                  </pattern>

                  {/* Drop Shadow Filter for text & badges */}
                  <filter id="svgTextShadow" x="-25%" y="-25%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.85" />
                  </filter>
                </defs>

                {/* Target Focus Reticle around property centroid */}
                <g transform={`translate(${mapInnerWidth / 2}, ${aerialHeight / 2})`}>
                  <circle r="36" fill="none" stroke="#0f172a" strokeWidth="1.6" opacity="0.8" />
                  <circle r="38" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 3" />
                  <line x1="-50" y1="0" x2="50" y2="0" stroke="#0f172a" strokeWidth="1.2" opacity="0.7" />
                  <line x1="0" y1="-50" x2="0" y2="50" stroke="#0f172a" strokeWidth="1.2" opacity="0.7" />
                </g>

                {/* THE MARKED POLYGON (Vividly styled, prominent and cadastral) */}
                {projectedPolygonPoints.length >= 3 && (
                  <g>
                    {/* High-contrast white outer outline */}
                    <polygon
                      points={polygonPathD}
                      fill="#22c55e"
                      fillOpacity="0.4"
                      stroke="#ffffff"
                      strokeWidth="5"
                      strokeLinejoin="round"
                    />
                    {/* Inner red cadastral border and engineering hatch fill */}
                    <polygon
                      points={polygonPathD}
                      fill="url(#mapHatchPattern)"
                      stroke="#dc2626"
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                    />
                  </g>
                )}

                {/* Side Dimensions (Cotas perimetrais dos lados) */}
                {showDimensionsOnMap &&
                  projectedPolygonPoints.map((p1, idx) => {
                    const p2 = projectedPolygonPoints[(idx + 1) % projectedPolygonPoints.length];
                    const midX = (p1.px + p2.px) / 2;
                    const midY = (p1.py + p2.py) / 2;
                    const dist = p1.distanceToNext;

                    if (dist === undefined) return null;

                    const dx = p2.px - p1.px;
                    const dy = p2.py - p1.py;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    const nx = -dy / len;
                    const ny = dx / len;

                    const labelX = midX + nx * 12;
                    const labelY = midY + ny * 12;

                    let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                    if (angleDeg > 90 || angleDeg < -90) {
                      angleDeg += 180;
                    }

                    return (
                      <g key={`edge-dim-${idx}`} transform={`rotate(${angleDeg}, ${labelX}, ${labelY})`}>
                        <rect
                          x={labelX - 19}
                          y={labelY - 7}
                          width={38}
                          height={14}
                          fill="#ffffff"
                          stroke="#dc2626"
                          strokeWidth="1.2"
                          rx="3"
                          filter="url(#svgTextShadow)"
                        />
                        <text
                          x={labelX}
                          y={labelY + 3.8}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="900"
                          fill="#0f172a"
                          fontFamily="sans-serif"
                        >
                          {dist.toFixed(2)}m
                        </text>
                      </g>
                    );
                  })}

                {/* Vertex Markers & Numbers (1, 2, 3, 4...) */}
                {projectedPolygonPoints.map((p, idx) => (
                  <g key={`vtx-mark-${idx}`} transform={`translate(${p.px}, ${p.py})`}>
                    {/* Outer Glow */}
                    <circle r="7.5" fill="#ffffff" filter="url(#svgTextShadow)" />
                    {/* Circle Pin */}
                    <circle r="6" fill="#15803d" stroke="#ffffff" strokeWidth="1.3" />
                    <text
                      textAnchor="middle"
                      y="3.2"
                      fontSize="8.5"
                      fontWeight="900"
                      fill="#ffffff"
                      fontFamily="sans-serif"
                    >
                      {p.id}
                    </text>

                    {/* Interior Angle Badge next to vertex */}
                    {showAnglesOnMap && p.interiorAngleDeg !== undefined && (
                      <g transform="translate(10, -8)">
                        <rect
                          x="0"
                          y="0"
                          width="36"
                          height="13"
                          fill="#fef08a"
                          stroke="#ca8a04"
                          strokeWidth="1"
                          rx="2.5"
                          filter="url(#svgTextShadow)"
                        />
                        <text
                          x="18"
                          y="9.5"
                          textAnchor="middle"
                          fontSize="7.5"
                          fontWeight="900"
                          fill="#713f12"
                          fontFamily="monospace"
                        >
                          ∠{Math.round(p.interiorAngleDeg)}°
                        </text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>

              {/* Reference Points On Aerial Map */}
              {project.referencePoints.map((ref) => {
                const { px, py } = projectLatLngToMapPixels(
                  ref.lat,
                  ref.lng,
                  center.lat,
                  center.lng,
                  effectiveAerialZoom,
                  mapInnerWidth,
                  aerialHeight
                );
                if (px < 0 || px > mapInnerWidth || py < 0 || py > aerialHeight) return null;
                return (
                  <div
                    key={ref.id}
                    className="absolute bg-white/95 border border-slate-900 text-slate-950 font-bold text-[9px] px-2 py-0.5 rounded shadow-md pointer-events-none backdrop-blur-2xs z-10"
                    style={{
                      top: `${py}px`,
                      left: `${px}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {ref.label}
                  </div>
                );
              })}

              {/* Left Northing Axis Tick Labels */}
              {layout.showUtmGrid && (
                <div className="absolute left-1 inset-y-0 flex flex-col justify-around pointer-events-none text-[8.5px] font-mono font-bold text-slate-900 bg-white/90 px-1 py-0.5 rounded shadow-2xs z-10">
                  {northTicks.map((val, idx) => (
                    <span key={`n-left-${idx}`} className="-rotate-90 origin-center whitespace-nowrap">
                      {val.toFixed(0)}
                    </span>
                  ))}
                </div>
              )}

              {/* Right Northing Axis Tick Labels */}
              {layout.showUtmGrid && (
                <div className="absolute right-1 inset-y-0 flex flex-col justify-around pointer-events-none text-[8.5px] font-mono font-bold text-slate-900 bg-white/90 px-1 py-0.5 rounded shadow-2xs z-10">
                  {northTicks.map((val, idx) => (
                    <span key={`n-right-${idx}`} className="rotate-90 origin-center whitespace-nowrap">
                      {val.toFixed(0)}
                    </span>
                  ))}
                </div>
              )}

              {/* Topographic Graphical Scale Bar at bottom left of aerial image */}
              <div className="absolute left-3 bottom-3 z-20">
                <GraphicScaleBar scaleText={stamp.scaleText} />
              </div>
            </div>

            {/* Bottom Axis UTM Ticks */}
            {layout.showUtmGrid && (
              <div className="bg-white border-t border-slate-400 flex justify-around py-0.5 text-[9.5px] font-mono font-bold text-slate-800">
                {eastTicks.map((val, idx) => (
                  <span key={`e-bot-${idx}`}>{val.toFixed(0)}</span>
                ))}
              </div>
            )}
          </div>

          {/* LOWER PANEL: ENQUADRAMENTO CARTOGRÁFICO / MAPA TOPOGRÁFICO */}
          <div className="mt-1 border border-slate-950 flex flex-col relative overflow-hidden bg-slate-100 flex-1 min-h-[260px]">
            <div
              className="relative w-full bg-slate-200 overflow-hidden flex items-center justify-center"
              style={{ width: `${mapInnerWidth}px`, height: `${contextHeight}px` }}
            >
              {/* Regional Context Topographic Map Background */}
              {contextDataUrl ? (
                <img
                  src={contextDataUrl}
                  alt="Enquadramento Topográfico Regional"
                  className="w-full h-full object-cover select-none"
                  style={{
                    filter: 'contrast(1.08) brightness(1.02)',
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 text-slate-500 text-xs">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-600 border-t-transparent animate-spin mb-1.5"></div>
                  <span>Carregando enquadramento topográfico regional...</span>
                </div>
              )}

              {/* Property Target Indicator in Context Map */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-900/90 -translate-x-1/2 -translate-y-1/2 absolute"></div>
                  <div className="w-3.5 h-3.5 bg-red-600 rounded-full -translate-x-1/2 -translate-y-1/2 absolute border-2 border-white shadow-xs"></div>
                </div>
              </div>

              {/* Diagonal leader line to "Localização do imóvel" */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1="50%"
                  y1="50%"
                  x2="26%"
                  y2="88%"
                  stroke="#0f172a"
                  strokeWidth="1.8"
                  strokeDasharray="4 2"
                />
              </svg>

              {/* "Localização do imóvel" Label Tag */}
              <div className="absolute left-6 bottom-4 bg-white/95 border-l-4 border-slate-950 px-2 py-1 shadow-md z-10">
                <span className="font-black text-xs text-slate-950 uppercase tracking-tight">
                  Localização do imóvel
                </span>
              </div>

              {/* Floating UTM Coordinates Table (yellow/gold banner matching reference image) */}
              {layout.showCoordinateTable && (
                <div className="absolute right-3 bottom-3 max-w-[350px] w-full bg-white/95 border-2 border-amber-400 rounded-xs shadow-xl backdrop-blur-2xs overflow-hidden z-20">
                  <div className="bg-amber-300 px-2 py-0.5 text-center font-bold text-[9px] text-amber-950 tracking-tight border-b border-amber-400">
                    Projecção UTM baseado em WGS 84 - Zona {metrics.zone}{metrics.hemisphere}
                    <br />
                    Meridiano central {metrics.centralMeridian}º E
                  </div>
                  <table className="w-full text-left text-[8.5px] border-collapse font-mono">
                    <thead>
                      <tr className="bg-amber-100 text-amber-950 font-bold border-b border-amber-300">
                        <th className="py-0.5 px-1.5 border-r border-amber-300 text-center">Id</th>
                        <th className="py-0.5 px-1.5 border-r border-amber-300">Este (X)</th>
                        <th className="py-0.5 px-1.5 border-r border-amber-300">Norte (Y)</th>
                        <th className="py-0.5 px-1 border-r border-amber-300">Longitude</th>
                        <th className="py-0.5 px-1">Latitude</th>
                        {layout.showInteriorAngles && (
                          <th className="py-0.5 px-1 border-l border-amber-300 text-center text-amber-950">Ângulo</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200">
                      {metrics.coordinates.map((c) => (
                        <tr key={c.id} className="hover:bg-amber-50">
                          <td className="py-0.5 px-1.5 border-r border-amber-300 text-center font-bold text-slate-900">
                            {c.id}
                          </td>
                          <td className="py-0.5 px-1.5 border-r border-amber-300 font-semibold text-slate-950">
                            {c.easting.toFixed(2)}
                          </td>
                          <td className="py-0.5 px-1.5 border-r border-amber-300 font-semibold text-slate-950">
                            {c.northing.toFixed(2)}
                          </td>
                          <td className="py-0.5 px-1 border-r border-amber-300 text-slate-800">
                            {c.lngDms}
                          </td>
                          <td className="py-0.5 px-1 text-slate-800">
                            {c.latDms}
                          </td>
                          {layout.showInteriorAngles && (
                            <td className="py-0.5 px-1 border-l border-amber-300 text-center font-bold text-amber-950">
                              {layout.angleFormat === 'DMS'
                                ? c.interiorAngleDms
                                : `${c.interiorAngleDeg !== undefined ? c.interiorAngleDeg.toFixed(1) : '-'}°`}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Signature Line */}
              <div className="absolute right-6 bottom-32 flex flex-col items-center z-10">
                <div className="w-36 border-b border-slate-900 mb-0.5"></div>
                <span className="text-[10px] font-semibold text-slate-900">Assinatura</span>
              </div>
            </div>
          </div>

          {/* BOTTOM CADASTRAL STAMP / SELO / CARIMBO TÉCNICO */}
          <div className="mt-1 border-2 border-slate-950 grid grid-cols-12 bg-white text-slate-900 text-[10px]">
            {/* Box 1: Technical Responsibles & Mini Parcel Geometry (Cols 1-4) */}
            <div className="col-span-4 border-r-2 border-slate-950 p-1.5 flex flex-col justify-between">
              {/* Technical Team Table */}
              <table className="w-full text-[9px] border-collapse mb-1">
                <tbody>
                  {stamp.team.map((member, i) => (
                    <tr key={i} className="border-b border-slate-200">
                      <td className="font-bold text-slate-800 pr-1 py-0.5 w-10">{member.label}</td>
                      <td className="text-slate-600 px-1 py-0.5 w-16">{member.date}</td>
                      <td className="text-slate-900 font-medium px-1 py-0.5 truncate">{member.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Geometry Miniature with Cotas and Angles */}
              {layout.showGeometryStamp && (
                <div className="border border-slate-300 bg-slate-50 p-1 flex items-center justify-center rounded-xs">
                  <GeometryStamp coordinates={metrics.coordinates} className="w-full h-24" />
                </div>
              )}
            </div>

            {/* Box 2: Owner, Location & Scale Metadata (Cols 5-9) */}
            <div className="col-span-5 border-r-2 border-slate-950 p-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-semibold text-slate-500 uppercase block">Proprietário / Requerente:</span>
                <h3 className="font-black text-sm sm:text-base text-slate-950 tracking-wide mt-0.5 truncate">
                  {stamp.owner || 'Proprietário do Imóvel'}
                </h3>
              </div>

              {/* Administrative & Technical Specs Grid */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 my-1 pt-1 border-t border-slate-300 text-[9px]">
                <div>
                  <span className="text-slate-600 font-semibold">Distrito / Comuna:</span>{' '}
                  <span className="font-bold text-slate-950">{stamp.district || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">Escala:</span>{' '}
                  <span className="font-bold text-slate-950">{stamp.scaleText} {stamp.imageryType}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">Município:</span>{' '}
                  <span className="font-bold text-slate-950">{stamp.municipality}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">Área (m²):</span>{' '}
                  <span className="font-black text-emerald-800">
                    {metrics.areaSqMeters.toLocaleString('pt-PT')} m²
                    {metrics.areaSqMeters >= 10000 && ` (${(metrics.areaSqMeters / 10000).toFixed(2)} ha)`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">Província:</span>{' '}
                  <span className="font-bold text-slate-950">{stamp.province}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-semibold">Perímetro (m):</span>{' '}
                  <span className="font-black text-slate-950">{metrics.perimeterMeters.toLocaleString('pt-PT')} m</span>
                </div>
              </div>

              {/* Contém / Finalidade & Observações */}
              <div className="border-t border-slate-300 pt-1 text-[9px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Contém:</span>
                  <span className="text-slate-500 font-mono text-[8px]">Data: {stamp.projectDate || '-'}</span>
                </div>
                <div className="font-bold text-slate-950 uppercase">{stamp.title}</div>
                <div className="text-slate-600 italic text-[8.5px]">{stamp.purpose}</div>
                {stamp.observations && (
                  <div className="mt-1 text-[8px] text-slate-700 bg-slate-50 p-1 rounded border border-slate-200 line-clamp-2">
                    <strong className="text-slate-900">Obs:</strong> {stamp.observations}
                  </div>
                )}
              </div>
            </div>

            {/* Box 3: Company Logo, Contacts, Specialty & Drawing Number (Cols 10-12) */}
            <div className="col-span-3 p-2 flex flex-col justify-between items-center text-center">
              {/* Company Logo or Crest */}
              <div className="w-full flex flex-col items-center">
                <div className="h-10 max-w-[140px] flex items-center justify-center mb-0.5">
                  <img
                    src={stamp.logoUrl || '/assets/aistudio/e5cd372a-3ef9-42cf-a76f-a92015974757_5c21f989.png'}
                    alt={stamp.companyName || 'DioGis'}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <span className="text-[7.5px] text-slate-500 tracking-tight leading-tight mt-0.5 truncate max-w-full font-medium">
                  {stamp.companySubtitle || 'Topografia, Geodesia & Cadastro Predial'}
                </span>

                {/* Company Contacts */}
                {(stamp.companyPhone || stamp.companyEmail) && (
                  <div className="text-[7px] text-slate-600 mt-0.5 leading-tight">
                    {stamp.companyPhone && <span>Tel: {stamp.companyPhone}</span>}
                    {stamp.companyPhone && stamp.companyEmail && <span> | </span>}
                    {stamp.companyEmail && <span>{stamp.companyEmail}</span>}
                  </div>
                )}
              </div>

              {/* Specialty */}
              <div className="w-full py-0.5 border-y border-slate-300 my-1">
                <span className="text-[7.5px] text-slate-500 uppercase block font-semibold">Especialidade</span>
                <span className="font-black text-[11px] text-slate-950 tracking-wider">
                  {stamp.specialty || 'TOPOGRAFIA'}
                </span>
              </div>

              {/* Drawing Number & References */}
              <div className="w-full text-left text-[8.5px] space-y-0.5">
                <div className="flex justify-between border-b border-slate-200 pb-0.5">
                  <span className="font-semibold text-slate-600">Desenho Nº</span>
                  <span className="font-bold text-slate-950">{stamp.drawingNumber}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Folha:</span>
                  <span className="font-semibold text-slate-800">{stamp.sheetNumber || '01/01'}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Responsável:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[90px]" title={stamp.responsibleSurveyor}>
                    {stamp.responsibleSurveyor}
                  </span>
                </div>
                {stamp.responsibleLicense && (
                  <div className="text-[7.5px] text-slate-500 truncate" title={stamp.responsibleLicense}>
                    {stamp.responsibleLicense}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

