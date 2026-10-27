import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  APIProvider,
  Map,
  useMap,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { LatLng, CroquiProject, UTMCoordinate } from '../types/croqui';
import { latLngToUtm, utmToLatLng, distanceUtm } from '../utils/utm';
import {
  Search,
  Maximize2,
  RotateCw,
  RotateCcw,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  Crosshair,
  Layers,
  MapPin,
  Square,
  Sparkles,
  Pencil,
  Check,
  Undo2,
  X,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { PlacesSearchBar } from './PlacesSearchBar';
import { simplifyDrawnPolygon } from '../utils/simplify';
import { useLicense } from '../context/LicenseContext';

interface MapEditorProps {
  apiKey: string;
  project: CroquiProject;
  metrics: {
    areaSqMeters: number;
    perimeterMeters: number;
    coordinates: UTMCoordinate[];
    center: LatLng;
    utmCenter: { easting: number; northing: number };
    zone: number;
    hemisphere: 'N' | 'S';
    centralMeridian: number;
  };
  onUpdateVertices: (vertices: LatLng[]) => void;
  onUpdateProject: (updater: (prev: CroquiProject) => CroquiProject) => void;
}

// Projection Bridge component to access Google Maps MapCanvasProjection for sub-pixel pencil coordinates
const MapProjectionBridge: React.FC<{
  onProjectionUpdate: (proj: google.maps.MapCanvasProjection | null) => void;
}> = ({ onProjectionUpdate }) => {
  const map = useMap('main-editor-map');

  useEffect(() => {
    if (!map) return;
    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => {};
    overlay.draw = () => {
      const p = overlay.getProjection();
      if (p) onProjectionUpdate(p);
    };
    overlay.onRemove = () => {
      onProjectionUpdate(null);
    };
    overlay.setMap(map);

    const timer = setTimeout(() => {
      const p = overlay.getProjection();
      if (p) onProjectionUpdate(p);
    }, 200);

    return () => {
      clearTimeout(timer);
      overlay.setMap(null);
    };
  }, [map, onProjectionUpdate]);

  return null;
};

// Inner Polygon Controller that connects to the Google Maps JS instance
const PolygonLayer: React.FC<{
  vertices: LatLng[];
  isEditing: boolean;
  onUpdateVertices: (vertices: LatLng[]) => void;
}> = ({ vertices, isEditing, onUpdateVertices }) => {
  const map = useMap('main-editor-map');
  const polygonRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!polygonRef.current) {
      polygonRef.current = new google.maps.Polygon({
        paths: vertices,
        strokeColor: '#dc2626',
        strokeOpacity: 0.95,
        strokeWeight: 2.5,
        fillColor: '#22c55e',
        fillOpacity: 0.35,
        editable: false,
        draggable: false,
        map: map,
      });
    } else {
      polygonRef.current.setPaths(vertices);
    }

    return () => {
      if (polygonRef.current) {
        polygonRef.current.setMap(null);
        polygonRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (polygonRef.current) {
      polygonRef.current.setPaths(vertices);
    }
  }, [vertices]);

  return null;
};

// Cadastral Markers Layer: Uses standard Google Maps Markers (does not require a Map ID)
const CadastralMarkersLayer: React.FC<{
  vertices: LatLng[];
  isEditing: boolean;
  onUpdateVertices: (vertices: LatLng[]) => void;
  coordinates: UTMCoordinate[];
  showInteriorAngles: boolean;
  angleFormat: 'DEG' | 'DMS';
  referencePoints: { id: string; label: string; lat: number; lng: number }[];
}> = ({
  vertices,
  isEditing,
  onUpdateVertices,
  coordinates,
  showInteriorAngles,
  angleFormat,
  referencePoints,
}) => {
  const map = useMap('main-editor-map');
  const vertexMarkersRef = useRef<google.maps.Marker[]>([]);
  const refMarkersRef = useRef<google.maps.Marker[]>([]);

  // Manage Vertex Markers
  useEffect(() => {
    if (!map) return;

    // Clean up old markers
    vertexMarkersRef.current.forEach((m) => m.setMap(null));
    vertexMarkersRef.current = [];

    vertexMarkersRef.current = vertices.map((v, i) => {
      const coord = coordinates[i];
      const angleDeg = coord?.interiorAngleDeg;
      const angleLabel =
        angleFormat === 'DMS'
          ? coord?.interiorAngleDms
          : `${angleDeg !== undefined ? angleDeg.toFixed(2) : '-'}°`;

      const title = `Vértice ${i + 1}${
        showInteriorAngles && angleDeg !== undefined ? ` (∠ ${angleLabel})` : ''
      }\nE: ${coord?.easting.toFixed(2)}m | N: ${coord?.northing.toFixed(2)}m`;

      const marker = new google.maps.Marker({
        position: v,
        map,
        draggable: isEditing,
        title,
        label: {
          text: String(i + 1),
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '11px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 13,
          fillColor: '#059669', // Emerald/Teal cadastral marker
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
        cursor: isEditing ? 'grab' : 'default',
        zIndex: 50 + i,
      });

      marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const newVertices = [...vertices];
        newVertices[i] = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        onUpdateVertices(newVertices);
      });

      return marker;
    });

    return () => {
      vertexMarkersRef.current.forEach((m) => m.setMap(null));
      vertexMarkersRef.current = [];
    };
  }, [map, vertices, isEditing, coordinates, showInteriorAngles, angleFormat, onUpdateVertices]);

  // Manage Reference Landmark Markers
  useEffect(() => {
    if (!map) return;

    refMarkersRef.current.forEach((m) => m.setMap(null));
    refMarkersRef.current = [];

    refMarkersRef.current = referencePoints.map((ref) => {
      const marker = new google.maps.Marker({
        position: { lat: ref.lat, lng: ref.lng },
        map,
        title: ref.label,
        label: {
          text: ref.label,
          color: '#0f172a',
          fontWeight: 'bold',
          fontSize: '11px',
        },
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 1.2,
          anchor: new google.maps.Point(12, 22),
          labelOrigin: new google.maps.Point(12, -8),
        },
        zIndex: 30,
      });

      return marker;
    });

    return () => {
      refMarkersRef.current.forEach((m) => m.setMap(null));
      refMarkersRef.current = [];
    };
  }, [map, referencePoints]);

  return null;
};

export const MapEditor: React.FC<MapEditorProps> = ({
  apiKey,
  project,
  metrics,
  onUpdateVertices,
  onUpdateProject,
}) => {
  const { isLicenseActive, checkLicenseBeforeAction } = useLicense();
  const [mapType, setMapType] = useState<'satellite' | 'hybrid' | 'roadmap' | 'terrain'>('hybrid');
  const [activeTool, setActiveTool] = useState<'select' | 'add_vertex' | 'reference' | 'pencil'>('select');
  const [cursorPos, setCursorPos] = useState<{ lat: number; lng: number } | null>(null);
  const [cursorUtm, setCursorUtm] = useState<{ easting: number; northing: number } | null>(null);
  const [nudgeStep, setNudgeStep] = useState<number>(5); // meters
  const [showRectModal, setShowRectModal] = useState(false);
  const [rectWidth, setRectWidth] = useState(22); // meters
  const [rectLength, setRectLength] = useState(33); // meters
  const [rectAngle, setRectAngle] = useState(0); // degrees
  const [newRefName, setNewRefName] = useState('');
  const [showAddRefModal, setShowAddRefModal] = useState(false);

  // Pencil Drawing Tool State
  const projectionRef = useRef<google.maps.MapCanvasProjection | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const [pencilPoints, setPencilPoints] = useState<LatLng[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pencilTolerance, setPencilTolerance] = useState<'cadastral' | 'fine' | 'raw'>('cadastral');
  const [drawingToast, setDrawingToast] = useState<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);

  // Projection update handler
  const handleProjectionUpdate = useCallback((proj: google.maps.MapCanvasProjection | null) => {
    projectionRef.current = proj;
  }, []);

  // Convert container pixel to LatLng
  const pixelToLatLng = useCallback((pixelX: number, pixelY: number): LatLng | null => {
    if (projectionRef.current) {
      const latLng = projectionRef.current.fromContainerPixelToLatLng(
        new google.maps.Point(pixelX, pixelY)
      );
      if (latLng) {
        return { lat: latLng.lat(), lng: latLng.lng() };
      }
    }
    return null;
  }, []);

  // Convert LatLng to container pixel
  const latLngToPixel = useCallback((pt: LatLng): { x: number; y: number } | null => {
    if (projectionRef.current) {
      const p = projectionRef.current.fromLatLngToContainerPixel(
        new google.maps.LatLng(pt.lat, pt.lng)
      );
      if (p) {
        return { x: p.x, y: p.y };
      }
    }
    return null;
  }, []);

  // Calculate estimated area of pencilPoints
  const estimatedPencilArea = React.useMemo(() => {
    if (pencilPoints.length < 3) return 0;
    const utmPts = pencilPoints.map((p) => latLngToUtm(p.lat, p.lng, metrics.zone));
    let area = 0;
    const n = utmPts.length;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      area += utmPts[i].easting * utmPts[next].northing - utmPts[next].easting * utmPts[i].northing;
    }
    return Math.round(Math.abs(area / 2.0));
  }, [pencilPoints, metrics.zone]);

  // Simplified preview vertices
  const simplifiedVertices = React.useMemo(() => {
    if (pencilPoints.length < 3) return [];
    const eps = pencilTolerance === 'cadastral' ? 3.0 : pencilTolerance === 'fine' ? 1.0 : 0.05;
    return simplifyDrawnPolygon(pencilPoints, eps, metrics.zone, metrics.hemisphere);
  }, [pencilPoints, pencilTolerance, metrics.zone, metrics.hemisphere]);

  // Apply drawn polygon as parcel vertices
  const handleApplyPencilArea = useCallback(async () => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('O cadastro de área com lápis');
      return;
    }
    if (pencilPoints.length < 3) {
      setDrawingToast('Desenhe pelo menos 3 pontos para formar uma área!');
      setTimeout(() => setDrawingToast(null), 3000);
      return;
    }

    const finalVertices = simplifiedVertices.length >= 3 ? simplifiedVertices : pencilPoints;
    onUpdateVertices(finalVertices);
    setPencilPoints([]);
    setIsDrawing(false);
    setActiveTool('select');
    setDrawingToast(`Área de ${estimatedPencilArea.toLocaleString('pt-AO')} m² cadastrada com ${finalVertices.length} vértices!`);
    setTimeout(() => setDrawingToast(null), 4000);
  }, [pencilPoints, simplifiedVertices, estimatedPencilArea, onUpdateVertices, isLicenseActive, checkLicenseBeforeAction]);

  // Cancel and reset pencil
  const handleCancelPencil = () => {
    setPencilPoints([]);
    setIsDrawing(false);
    setActiveTool('select');
  };

  // Clear current stroke
  const handleClearPencil = () => {
    setPencilPoints([]);
    setIsDrawing(false);
  };

  // Undo last point
  const handleUndoPencil = () => {
    setPencilPoints((prev) => prev.slice(0, -1));
  };

  // Pointer event handlers on overlay
  const handleOverlayPointerDown = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'pencil') return;
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('O desenho com lápis');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pt = pixelToLatLng(x, y);
    if (!pt) return;

    // Check for double click to auto-finish
    const now = Date.now();
    if (now - lastClickTimeRef.current < 350 && pencilPoints.length >= 3) {
      handleApplyPencilArea();
      return;
    }
    lastClickTimeRef.current = now;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(true);
    setPencilPoints((prev) => [...prev, pt]);
  };

  const handleOverlayPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'pencil') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pt = pixelToLatLng(x, y);
    if (!pt) return;

    // Update cursor pos for coords display
    setCursorPos(pt);
    const utm = latLngToUtm(pt.lat, pt.lng, metrics.zone);
    setCursorUtm({ easting: utm.easting, northing: utm.northing });

    if (isDrawing) {
      setPencilPoints((prev) => {
        if (prev.length === 0) return [pt];
        const last = prev[prev.length - 1];
        const dist = Math.hypot(pt.lat - last.lat, pt.lng - last.lng);
        // Minimum distance between recorded points (~1.5m)
        if (dist >= 0.000015) {
          return [...prev, pt];
        }
        return prev;
      });
    }
  };

  const handleOverlayPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== 'pencil') return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(false);
  };

  // Generate SVG path string from points
  const getSvgPath = (pts: LatLng[], close: boolean = false) => {
    if (pts.length === 0) return '';
    const screenPts = pts
      .map((p) => latLngToPixel(p))
      .filter((p): p is { x: number; y: number } => p !== null);

    if (screenPts.length === 0) return '';
    const d = screenPts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    return close && screenPts.length >= 3 ? `${d} Z` : d;
  };

  // Center on vertices
  const handleFitBounds = useCallback(() => {
    if (metrics.coordinates.length === 0) return;
  }, [metrics]);

  // Handle map click for adding vertices or reference points
  const handleMapClick = async (e: MapMouseEvent) => {
    if (activeTool === 'pencil') return;
    if (!e.detail.latLng) return;
    const { lat, lng } = e.detail.latLng;

    if (activeTool === 'add_vertex') {
      if (!isLicenseActive) {
        await checkLicenseBeforeAction('A adição de vértices no croquis');
        return;
      }
      onUpdateVertices([...project.vertices, { lat, lng }]);
    } else if (activeTool === 'reference') {
      if (!isLicenseActive) {
        await checkLicenseBeforeAction('A adição de pontos de amarração');
        return;
      }
      const label = newRefName.trim() || `Ponto ${project.referencePoints.length + 1}`;
      onUpdateProject((prev) => ({
        ...prev,
        referencePoints: [
          ...prev.referencePoints,
          { id: `ref-${Date.now()}`, label, lat, lng },
        ],
      }));
      setNewRefName('');
      setActiveTool('select');
    }
  };


  // Nudge polygon in meters
  const nudgePolygon = async (dEast: number, dNorth: number) => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('O deslocamento do polígono');
      return;
    }
    const zone = metrics.zone;
    const hemisphere = metrics.hemisphere;

    const shifted = project.vertices.map((v) => {
      const utm = latLngToUtm(v.lat, v.lng, zone);
      return utmToLatLng(utm.easting + dEast, utm.northing + dNorth, zone, hemisphere);
    });

    onUpdateVertices(shifted);
  };

  // Rotate polygon around its centroid
  const rotatePolygon = async (degrees: number) => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('A rotação do polígono');
      return;
    }
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const cUtm = metrics.utmCenter;
    const zone = metrics.zone;
    const hemisphere = metrics.hemisphere;

    const rotated = project.vertices.map((v) => {
      const utm = latLngToUtm(v.lat, v.lng, zone);
      const dx = utm.easting - cUtm.easting;
      const dy = utm.northing - cUtm.northing;

      const newEast = cUtm.easting + (dx * cos - dy * sin);
      const newNorth = cUtm.northing + (dx * sin + dy * cos);

      return utmToLatLng(newEast, newNorth, zone, hemisphere);
    });

    onUpdateVertices(rotated);
  };

  // Generate standard cadastral rectangle at current center
  const createRectangleLot = async () => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('A inserção de lote retangular');
      setShowRectModal(false);
      return;
    }
    const w = rectWidth;
    const l = rectLength;
    const rad = (rectAngle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const cx = metrics.utmCenter.easting || 301840;
    const cy = metrics.utmCenter.northing || 9013460;
    const zone = metrics.zone || 33;
    const hemisphere = metrics.hemisphere || 'S';

    // 4 corners relative to center
    const halfW = w / 2;
    const halfL = l / 2;
    const rawOffsets = [
      { dx: halfW, dy: halfL },
      { dx: halfW, dy: -halfL },
      { dx: -halfW, dy: -halfL },
      { dx: -halfW, dy: halfL },
    ];

    const newVertices = rawOffsets.map((off) => {
      const rx = off.dx * cos - off.dy * sin;
      const ry = off.dx * sin + off.dy * cos;
      return utmToLatLng(cx + rx, cy + ry, zone, hemisphere);
    });

    onUpdateVertices(newVertices);
    setShowRectModal(false);
  };

  // Handle location selected from Google Places Autocomplete Search Bar
  const handleLocationSelected = async (
    location: LatLng,
    addressName: string,
    addressComponents?: google.maps.places.AddressComponent[]
  ) => {
    if (!isLicenseActive) {
      await checkLicenseBeforeAction('O reposicionamento do croquis');
      return;
    }
    // Shift polygon vertices so the lot centroid repositions at the selected place
    const currCenter = metrics.center;
    const dLat = location.lat - currCenter.lat;
    const dLng = location.lng - currCenter.lng;

    const shifted = project.vertices.map((v) => ({
      lat: v.lat + dLat,
      lng: v.lng + dLng,
    }));
    onUpdateVertices(shifted);

    // Automatically update the stamp administrative fields if address components are present
    if (addressComponents && addressComponents.length > 0) {
      let locality = '';
      let adminArea = '';
      let sublocality = '';

      addressComponents.forEach((comp) => {
        if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
          locality = comp.longText || (comp as any).long_name || '';
        }
        if (comp.types.includes('administrative_area_level_1')) {
          adminArea = comp.longText || (comp as any).long_name || '';
        }
        if (
          comp.types.includes('sublocality') ||
          comp.types.includes('neighborhood') ||
          comp.types.includes('sublocality_level_1')
        ) {
          sublocality = comp.longText || (comp as any).long_name || '';
        }
      });

      onUpdateProject((prev) => ({
        ...prev,
        stamp: {
          ...prev.stamp,
          municipality: locality || prev.stamp.municipality,
          province: adminArea || prev.stamp.province,
          district: sublocality || prev.stamp.district,
          addressDetails: addressName || prev.stamp.addressDetails,
        },
      }));
    }
  };

  const handleMouseMove = (e: MapMouseEvent) => {
    if (e.detail.latLng) {
      const { lat, lng } = e.detail.latLng;
      setCursorPos({ lat, lng });
      const utm = latLngToUtm(lat, lng, metrics.zone);
      setCursorUtm({ easting: utm.easting, northing: utm.northing });
    }
  };

  const defaultCenter = metrics.center.lat !== 0 ? metrics.center : { lat: -8.9204, lng: 13.1978 };

  return (
    <APIProvider apiKey={apiKey} libraries={['places', 'geometry']}>
      <div className="flex flex-col h-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden relative shadow-lg">
        {/* Top Map Controls Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-10 text-white text-xs">
          {/* Google Places API Autocomplete Search Bar */}
          <PlacesSearchBar onLocationSelected={handleLocationSelected} />

          {/* Map Type Toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-700">
            <button
              type="button"
              onClick={() => setMapType('hybrid')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                mapType === 'hybrid' || mapType === 'satellite'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Satélite (Ortofoto)
            </button>
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                mapType === 'roadmap'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Mapa Vetorial
            </button>
            <button
              type="button"
              onClick={() => setMapType('terrain')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                mapType === 'terrain'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Topográfico (Relevo)
            </button>
          </div>

          {/* Drawing & Editing Tools */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              className={`px-2 py-1 rounded flex items-center gap-1 ${
                activeTool === 'select' ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Arrastar vértices do lote no mapa"
            >
              <Move size={13} /> Mover Vértices
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!isLicenseActive) {
                  await checkLicenseBeforeAction('A adição de vértices');
                  return;
                }
                setActiveTool('add_vertex');
              }}
              className={`px-2 py-1 rounded flex items-center gap-1 ${
                activeTool === 'add_vertex' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
              title="Clique no mapa para adicionar novo vértice pontual"
            >
              <Plus size={13} /> + Vértice
            </button>
            {/* Lápis de Desenho Livre / Delimitar Espaço */}
            <button
              type="button"
              onClick={async () => {
                if (!isLicenseActive) {
                  await checkLicenseBeforeAction('O desenho com lápis');
                  return;
                }
                if (activeTool === 'pencil') {
                  setActiveTool('select');
                } else {
                  setActiveTool('pencil');
                  setPencilPoints([]);
                }
              }}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 font-semibold text-xs transition ${
                activeTool === 'pencil'
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-300'
                  : 'bg-teal-900/90 text-amber-300 hover:bg-teal-800 hover:text-white border border-teal-700/60'
              }`}
              title="Desenhar área do terreno com lápis (à mão livre ou clicando nos cantos)"
            >
              <Pencil size={13} className={activeTool === 'pencil' ? 'text-slate-950' : 'text-amber-400'} />
              <span>Desenhar com Lápis</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!isLicenseActive) {
                  await checkLicenseBeforeAction('A geração de lotes retangulares');
                  return;
                }
                setShowRectModal(true);
              }}
              className="px-2 py-1 rounded flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200"
              title="Gerar lote retangular por medidas (ex: 20x33m)"
            >
              <Square size={13} /> Gerar Lote
            </button>
            {/* Interior Angles Visual Toggle */}
            <button
              type="button"
              onClick={() =>
                onUpdateProject((prev) => ({
                  ...prev,
                  layout: {
                    ...prev.layout,
                    showInteriorAngles: !prev.layout.showInteriorAngles,
                  },
                }))
              }
              className={`px-2 py-1 rounded flex items-center gap-1 font-semibold transition ${
                project.layout.showInteriorAngles
                  ? 'bg-amber-500 text-amber-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Calcular e exibir ângulos internos nos vértices em tempo real"
            >
              <span className="font-bold">∠</span> Ângulos {project.layout.showInteriorAngles ? 'ON' : 'OFF'}
            </button>
            {project.layout.showInteriorAngles && (
              <button
                type="button"
                onClick={() =>
                  onUpdateProject((prev) => ({
                    ...prev,
                    layout: {
                      ...prev.layout,
                      angleFormat: prev.layout.angleFormat === 'DEG' ? 'DMS' : 'DEG',
                    },
                  }))
                }
                className="px-1.5 py-1 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono"
                title="Alternar formato: Graus Decimais (ex: 90.00°) vs Sexagesimal DMS (ex: 90°00'00&quot;)"
              >
                {project.layout.angleFormat}
              </button>
            )}
          </div>
        </div>

        {/* Main Map Container */}
        <div className="flex-1 w-full h-full min-h-[380px] relative">
          <Map
            id="main-editor-map"
            defaultCenter={defaultCenter}
            defaultZoom={project.layout.satelliteZoom || 16.5}
            mapTypeId={mapType}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            onClick={handleMapClick}
            onMousemove={handleMouseMove}
            gestureHandling={activeTool === 'pencil' ? 'none' : 'greedy'}
            disableDefaultUI={false}
          >
            {/* Projection bridge for pixel <-> geographic coordinates */}
            <MapProjectionBridge onProjectionUpdate={handleProjectionUpdate} />

            {/* Draw Polygon Boundary */}
            <PolygonLayer
              vertices={project.vertices}
              isEditing={Boolean(isLicenseActive && activeTool === 'select')}
              onUpdateVertices={onUpdateVertices}
            />

            {/* Cadastral Markers Layer (standard Google Maps markers: clean, draggable, zero mapId error) */}
            <CadastralMarkersLayer
              vertices={project.vertices}
              isEditing={Boolean(isLicenseActive && activeTool === 'select')}
              onUpdateVertices={onUpdateVertices}
              coordinates={metrics.coordinates}
              showInteriorAngles={Boolean(project.layout.showInteriorAngles)}
              angleFormat={project.layout.angleFormat}
              referencePoints={project.referencePoints}
            />
          </Map>

          {/* Read-Only Notice Overlay when license is inactive */}
          {!isLicenseActive && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 border border-amber-500/70 text-amber-200 px-4 py-2 rounded-xl text-xs flex items-center gap-3 shadow-xl backdrop-blur-md max-w-[94%]">
              <Lock size={15} className="text-amber-400 shrink-0" />
              <span className="truncate">
                <strong>Modo de Leitura:</strong> A edição de vértices e criação de croquis requerem uma licença ativa.
              </span>
              <button
                type="button"
                onClick={() => checkLicenseBeforeAction('A edição do croquis')}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] shrink-0 transition shadow-xs"
              >
                Ativar Licença
              </button>
            </div>
          )}

          {/* Interactive Pencil Drawing Overlay Surface */}
          {activeTool === 'pencil' && (
            <div
              ref={overlayContainerRef}
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
              className="absolute inset-0 z-20 cursor-crosshair touch-none select-none"
              style={{ touchAction: 'none' }}
            >
              {/* SVG drawing visual representation */}
              <svg className="w-full h-full pointer-events-none">
                <defs>
                  <filter id="pencilGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.8" />
                  </filter>
                  <filter id="vertexGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
                  </filter>
                </defs>

                {/* Drawn Path / Closed polygon preview */}
                {pencilPoints.length >= 2 && (
                  <path
                    d={getSvgPath(pencilPoints, pencilPoints.length >= 3)}
                    fill={pencilPoints.length >= 3 ? 'rgba(5, 150, 105, 0.28)' : 'none'}
                    stroke="#f59e0b"
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    filter="url(#pencilGlow)"
                  />
                )}

                {/* Simplified Cadastral Boundary Preview */}
                {simplifiedVertices.length >= 3 && !isDrawing && (
                  <path
                    d={getSvgPath(simplifiedVertices, true)}
                    fill="rgba(14, 165, 233, 0.15)"
                    stroke="#00ffff"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                )}

                {/* Simplified Cadastral Corner Markers */}
                {simplifiedVertices.map((v, i) => {
                  const p = latLngToPixel(v);
                  if (!p) return null;
                  return (
                    <g key={i} filter="url(#vertexGlow)">
                      <circle cx={p.x} cy={p.y} r="8" fill="#0f172a" stroke="#00ffff" strokeWidth="2.5" />
                      <circle cx={p.x} cy={p.y} r="3.5" fill="#f59e0b" />
                      <text
                        x={p.x}
                        y={p.y - 12}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        V{i + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          {/* Floating Pencil Tool HUD */}
          {activeTool === 'pencil' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/70 rounded-xl p-2.5 sm:p-3 shadow-2xl text-white backdrop-blur-md z-30 flex flex-col md:flex-row items-center gap-2.5 sm:gap-3 max-w-[96%]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40">
                  <Pencil size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <span>LÁPIS CADASTRAL ATIVO</span>
                    {pencilPoints.length >= 3 && (
                      <span className="bg-emerald-600/90 text-white px-2 py-0.5 rounded text-[10px] font-mono">
                        ~{estimatedPencilArea.toLocaleString('pt-AO')} m²
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {pencilPoints.length === 0
                      ? 'Arraste para desenhar o contorno à mão livre ou clique nos cantos do terreno.'
                      : `${pencilPoints.length} pontos traçados → ${simplifiedVertices.length} vértices cadastrais`}
                  </div>
                </div>
              </div>

              {/* Simplification Tolerance Filter */}
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700 text-[11px]">
                <span className="text-slate-400 px-1 text-[10px]">Precisão:</span>
                <button
                  type="button"
                  onClick={() => setPencilTolerance('cadastral')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                    pencilTolerance === 'cadastral'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Tolerância de 3m: transforma curvas manuais em cantos retos limpos"
                >
                  Cadastral (3m)
                </button>
                <button
                  type="button"
                  onClick={() => setPencilTolerance('fine')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                    pencilTolerance === 'fine'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Tolerância de 1m: preserva curvas finas de estradas ou muros"
                >
                  Fino (1m)
                </button>
                <button
                  type="button"
                  onClick={() => setPencilTolerance('raw')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                    pencilTolerance === 'raw'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Todos os pontos sem simplificação"
                >
                  Exato
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleApplyPencilArea}
                  disabled={pencilPoints.length < 3}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    pencilPoints.length >= 3
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                  title="Fechar polígono e aplicar como perímetro oficial do imóvel"
                >
                  <Check size={14} />
                  <span>Concluir Área</span>
                </button>

                <button
                  type="button"
                  onClick={handleUndoPencil}
                  disabled={pencilPoints.length === 0}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg"
                  title="Desfazer último traço/ponto"
                >
                  <Undo2 size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleClearPencil}
                  disabled={pencilPoints.length === 0}
                  className="p-1.5 bg-slate-800 hover:bg-red-900/60 disabled:opacity-40 text-slate-200 hover:text-red-300 rounded-lg"
                  title="Limpar traço desenhado"
                >
                  <Trash2 size={14} />
                </button>

                <button
                  type="button"
                  onClick={handleCancelPencil}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg"
                  title="Sair do modo lápis sem alterar o lote atual"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {drawingToast && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1.5 rounded-lg shadow-xl text-xs font-semibold z-40 animate-bounce flex items-center gap-2">
              <Check size={14} />
              <span>{drawingToast}</span>
            </div>
          )}

          {/* Nudge / Rotation / Fine Adjustment Floating Widget */}
          <div className="absolute top-3 right-3 bg-slate-900/95 border border-slate-700 rounded-lg p-2.5 shadow-xl text-white backdrop-blur-sm z-20 flex flex-col gap-2 w-44">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between border-b border-slate-700 pb-1">
              <span>Ajuste de Posição</span>
              <span className="text-[10px] text-cyan-400 font-mono">UTM Z{metrics.zone}{metrics.hemisphere}</span>
            </div>

            {/* Step Selector */}
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span>Passo:</span>
              <div className="flex gap-1">
                {[1, 5, 20].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNudgeStep(s)}
                    className={`px-1.5 py-0.5 rounded ${
                      nudgeStep === s ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {s}m
                  </button>
                ))}
              </div>
            </div>

            {/* D-Pad Buttons for Transverse Movement */}
            <div className="grid grid-cols-3 gap-1 w-28 mx-auto my-0.5">
              <div></div>
              <button
                onClick={() => nudgePolygon(0, nudgeStep)}
                className="p-1.5 bg-slate-800 hover:bg-cyan-600 rounded flex items-center justify-center transition"
                title="Mover para Norte"
              >
                <ArrowUp size={14} />
              </button>
              <div></div>
              <button
                onClick={() => nudgePolygon(-nudgeStep, 0)}
                className="p-1.5 bg-slate-800 hover:bg-cyan-600 rounded flex items-center justify-center transition"
                title="Mover para Oeste"
              >
                <ArrowLeft size={14} />
              </button>
              <div className="flex items-center justify-center text-[10px] text-slate-400 font-mono">
                {nudgeStep}m
              </div>
              <button
                onClick={() => nudgePolygon(nudgeStep, 0)}
                className="p-1.5 bg-slate-800 hover:bg-cyan-600 rounded flex items-center justify-center transition"
                title="Mover para Este"
              >
                <ArrowRight size={14} />
              </button>
              <div></div>
              <button
                onClick={() => nudgePolygon(0, -nudgeStep)}
                className="p-1.5 bg-slate-800 hover:bg-cyan-600 rounded flex items-center justify-center transition"
                title="Mover para Sul"
              >
                <ArrowDown size={14} />
              </button>
              <div></div>
            </div>

            {/* Rotate Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-700 text-[11px]">
              <button
                onClick={() => rotatePolygon(-5)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-cyan-600 rounded text-xs transition"
                title="Girar -5 graus anti-horário"
              >
                <RotateCcw size={11} /> -5°
              </button>
              <button
                onClick={() => rotatePolygon(5)}
                className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-cyan-600 rounded text-xs transition"
                title="Girar +5 graus horário"
              >
                +5° <RotateCw size={11} />
              </button>
            </div>
          </div>

          {/* Live Coordinate Status Bar at Bottom */}
          <div className="absolute bottom-2 left-2 bg-slate-900/90 border border-slate-700 text-slate-200 px-3 py-1.5 rounded-md shadow-md text-xs font-mono backdrop-blur-xs flex items-center gap-4 z-20">
            <div className="flex items-center gap-1 text-cyan-400">
              <Crosshair size={13} />
              <span>
                {cursorUtm
                  ? `E: ${cursorUtm.easting.toFixed(2)}m | N: ${cursorUtm.northing.toFixed(2)}m`
                  : 'Posicione o mouse no mapa'}
              </span>
            </div>
            {cursorPos && (
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                (Lat: {cursorPos.lat.toFixed(5)}°, Lng: {cursorPos.lng.toFixed(5)}°)
              </span>
            )}
            <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-amber-400 font-sans font-bold">
              Zona {metrics.zone}{metrics.hemisphere}
            </span>
          </div>
        </div>

        {/* Modal: Generate Custom Rectangle Lot */}
        {showRectModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 max-w-sm w-full text-white shadow-2xl">
              <h3 className="font-bold text-base mb-1 flex items-center gap-2 text-cyan-400">
                <Square size={16} /> Gerar Lote por Dimensões
              </h3>
              <p className="text-xs text-slate-300 mb-4">
                Crie um polígono com medidas exatas centralizado no ponto atual.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Largura / Frente (metros):</label>
                  <input
                    type="number"
                    value={rectWidth}
                    onChange={(e) => setRectWidth(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Comprimento / Profundidade (metros):</label>
                  <input
                    type="number"
                    value={rectLength}
                    onChange={(e) => setRectLength(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Ângulo / Orientação (graus):</label>
                  <input
                    type="number"
                    value={rectAngle}
                    onChange={(e) => setRectAngle(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white font-mono"
                  />
                </div>

                {/* Quick Presets */}
                <div className="pt-2">
                  <span className="text-[11px] text-slate-400 block mb-1">Modelos Padrão:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '22m x 33m (726m²)', w: 22, l: 33 },
                      { label: '15m x 25m (375m²)', w: 15, l: 25 },
                      { label: '20m x 40m (800m²)', w: 20, l: 40 },
                      { label: '10m x 20m (200m²)', w: 10, l: 20 },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setRectWidth(p.w);
                          setRectLength(p.l);
                        }}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-cyan-300 border border-slate-700"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-cyan-950/60 border border-cyan-800 p-2.5 rounded text-[11px] text-cyan-200">
                  Área estimada: <strong>{(rectWidth * rectLength).toFixed(2)} m²</strong> | Perímetro: <strong>{(2 * (rectWidth + rectLength)).toFixed(2)} m</strong>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRectModal(false)}
                  className="px-3 py-1.5 border border-slate-600 rounded text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={createRectangleLot}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-semibold text-white transition"
                >
                  Aplicar no Mapa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </APIProvider>
  );
};
