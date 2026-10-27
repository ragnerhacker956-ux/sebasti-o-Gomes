export interface LatLng {
  lat: number;
  lng: number;
}

export interface UTMCoordinate {
  id: number;
  label: string;
  easting: number;
  northing: number;
  zone: number;
  hemisphere: 'N' | 'S';
  centralMeridian: number;
  latitude: number;
  longitude: number;
  latDms: string;
  lngDms: string;
  distanceToNext?: number;
  interiorAngleDeg?: number;
  interiorAngleDms?: string;
}

export interface TechnicalTeamMember {
  role: 'Campo' | 'Proj.' | 'Des.' | 'Verif.';
  label: string;
  date: string;
  name: string;
}

export interface StampData {
  title: string;
  owner: string;
  district: string;
  municipality: string;
  province: string;
  addressDetails: string;
  scaleText: string;
  imageryType: string;
  purpose: string;
  specialty: string;
  drawingNumber: string;
  sheetNumber: string;
  projectDate: string;
  observations: string;
  companyName: string;
  companySubtitle: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  logoUrl?: string;
  responsibleSurveyor: string;
  responsibleLicense: string;
  team: TechnicalTeamMember[];
}

export type PaperFormat = 'A4_PORTRAIT' | 'A4_LANDSCAPE' | 'A3_PORTRAIT' | 'A3_LANDSCAPE';
export type ViewMode = 'DUAL' | 'SATELLITE_ONLY' | 'MAP_ONLY';

export interface LayoutSettings {
  paperFormat: PaperFormat;
  viewMode: ViewMode;
  showUtmGrid: boolean;
  gridSpacingMeters: number;
  showCoordinateTable: boolean;
  showGeometryStamp: boolean;
  showNorthArrow: boolean;
  showInteriorAngles: boolean;
  angleFormat: 'DEG' | 'DMS';
  utmZoneOverride?: number; // 0 or undefined for auto-detect, or 32, 33, 34
  satelliteZoom: number;
  mapZoom: number;
  satellitePitch: number;
  satelliteHeading: number;
  mapTypeSatellite: 'satellite' | 'hybrid';
  mapTypeContext: 'roadmap' | 'terrain';
}

export interface ReferencePoint {
  id: string;
  label: string;
  lat: number;
  lng: number;
  description?: string;
}

/** Contorno independente de um edifício identificado no mapa. */
export interface BuildingFootprint {
  id: string;
  name?: string;
  source: 'openstreetmap' | 'manual' | 'ai';
  coordinates: LatLng[];
  osmId?: string;
  detectedAt?: string;
}

export interface CroquiProject {
  id: string;
  name: string;
  updatedAt: string;
  vertices: LatLng[];
  referencePoints: ReferencePoint[];
  /** Contornos de edifícios; opcional para manter compatibilidade com projectos antigos. */
  buildings?: BuildingFootprint[];
  stamp: StampData;
  layout: LayoutSettings;
}

