/**
 * Geodesy and UTM (Universal Transverse Mercator) conversion engine for WGS84.
 * High-precision algorithms conforming to USGS / NIMA standard formulations.
 */

import { LatLng, UTMCoordinate } from '../types/croqui';

const WGS84_A = 6378137.0; // semi-major axis (meters)
const WGS84_F = 1 / 298.257223563; // flattening
const WGS84_B = WGS84_A * (1 - WGS84_F); // semi-minor axis: 6356752.314245
const WGS84_E2 = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_A * WGS84_A); // first eccentricity squared
const WGS84_EP2 = (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B); // second eccentricity squared
const UTM_K0 = 0.9996; // central scale factor

export function getUtmZone(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

export function getCentralMeridian(zone: number): number {
  return (zone - 1) * 6 - 180 + 3;
}

/**
 * Converts WGS-84 Latitude and Longitude (degrees) to UTM Easting and Northing (meters)
 */
export function latLngToUtm(lat: number, lng: number, forcedZone?: number): {
  easting: number;
  northing: number;
  zone: number;
  hemisphere: 'N' | 'S';
  centralMeridian: number;
} {
  const zone = forcedZone ?? getUtmZone(lng);
  const hemisphere = lat >= 0 ? 'N' : 'S';
  const centralMeridian = getCentralMeridian(zone);

  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  const lambda0 = (centralMeridian * Math.PI) / 180;

  const N = WGS84_A / Math.sqrt(1 - WGS84_E2 * Math.sin(phi) * Math.sin(phi));
  const T = Math.tan(phi) * Math.tan(phi);
  const C = WGS84_EP2 * Math.cos(phi) * Math.cos(phi);
  const A = Math.cos(phi) * (lambda - lambda0);

  // Meridional arc length M
  const e2 = WGS84_E2;
  const M =
    WGS84_A *
    ((1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 * e2) / 256 + (45 * e2 * e2 * e2) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 * e2 * e2) / 3072) * Math.sin(6 * phi));

  // Easting
  const easting =
    UTM_K0 *
      N *
      (A +
        ((1 - T + C) * Math.pow(A, 3)) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * WGS84_EP2) * Math.pow(A, 5)) / 120) +
    500000.0; // False Easting

  // Northing
  let northing =
    UTM_K0 *
    (M +
      N *
        Math.tan(phi) *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * Math.pow(A, 4)) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * WGS84_EP2) * Math.pow(A, 6)) / 720));

  if (lat < 0) {
    northing += 10000000.0; // False Northing for Southern Hemisphere
  }

  return {
    easting: Math.round(easting * 100) / 100,
    northing: Math.round(northing * 100) / 100,
    zone,
    hemisphere,
    centralMeridian,
  };
}

/**
 * Converts UTM Easting and Northing back to WGS-84 Latitude and Longitude
 */
export function utmToLatLng(
  easting: number,
  northing: number,
  zone: number,
  hemisphere: 'N' | 'S'
): LatLng {
  const centralMeridian = getCentralMeridian(zone);
  const lambda0 = (centralMeridian * Math.PI) / 180;

  const x = easting - 500000.0;
  let y = northing;
  if (hemisphere === 'S') {
    y -= 10000000.0;
  }

  const e2 = WGS84_E2;
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const M = y / UTM_K0;
  const mu =
    M /
    (WGS84_A *
      (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));

  const phi1Rad =
    mu +
    ((3 * e1) / 2 - (27 * Math.pow(e1, 3)) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * Math.pow(e1, 4)) / 32) * Math.sin(4 * mu) +
    ((151 * Math.pow(e1, 3)) / 96) * Math.sin(6 * mu) +
    ((1097 * Math.pow(e1, 4)) / 512) * Math.sin(8 * mu);

  const N1 = WGS84_A / Math.sqrt(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 = WGS84_EP2 * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const R1 = (WGS84_A * (1 - e2)) / Math.pow(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * UTM_K0);

  const latRad =
    phi1Rad -
    ((N1 * Math.tan(phi1Rad)) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * WGS84_EP2) * Math.pow(D, 4)) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * WGS84_EP2 - 3 * C1 * C1) *
          Math.pow(D, 6)) /
          720);

  const lngRad =
    lambda0 +
    (D -
      ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * WGS84_EP2 + 24 * T1 * T1) * Math.pow(D, 5)) /
        120) /
      Math.cos(phi1Rad);

  return {
    lat: (latRad * 180) / Math.PI,
    lng: (lngRad * 180) / Math.PI,
  };
}

/**
 * Format decimal degree to Sexagesimal DMS (Degrees, Minutes, Seconds with precision)
 * e.g. 13°11'52.790"E or 8°55'13.304"S
 */
export function decToDms(val: number, isLatitude: boolean): string {
  const isPositive = val >= 0;
  const absVal = Math.abs(val);

  const deg = Math.floor(absVal);
  const minRemainder = (absVal - deg) * 60;
  const min = Math.floor(minRemainder);
  const sec = (minRemainder - min) * 60;

  const hemisphere = isLatitude
    ? isPositive
      ? 'N'
      : 'S'
    : isPositive
    ? 'E'
    : 'W';

  return `${deg}°${String(min).padStart(2, '0')}'${sec.toFixed(3).padStart(6, '0')}"${hemisphere}`;
}

/**
 * Calculates euclidean distance between two UTM points in meters
 */
export function distanceUtm(p1: { easting: number; northing: number }, p2: { easting: number; northing: number }): number {
  const dx = p2.easting - p1.easting;
  const dy = p2.northing - p1.northing;
  return Math.sqrt(dx * dx + dy * dy);
}

export function formatAngleDms(deg: number): string {
  const d = Math.floor(deg);
  const minRemainder = (deg - d) * 60;
  const m = Math.floor(minRemainder);
  const s = Math.round((minRemainder - m) * 60);
  return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

/**
 * Computes polygon cadastral metrics (Planimetric Area in m², Perimeter in m, side lengths, UTM coordinates, and Interior Angles)
 */
export function calculatePolygonMetrics(vertices: LatLng[], forcedZone?: number) {
  if (vertices.length === 0) {
    const fallbackZone = (forcedZone && forcedZone >= 1 && forcedZone <= 60) ? forcedZone : 33;
    const fallbackMeridian = fallbackZone * 6 - 183;
    return {
      areaSqMeters: 0,
      perimeterMeters: 0,
      coordinates: [] as UTMCoordinate[],
      center: { lat: 0, lng: 0 },
      utmCenter: { easting: 0, northing: 0 },
      zone: fallbackZone,
      hemisphere: 'S' as const,
      centralMeridian: fallbackMeridian,
      bounds: { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 },
      sumInteriorAngles: 0,
      expectedSumInteriorAngles: 0,
      isConvex: true,
    };
  }

  // Calculate center
  let sumLat = 0;
  let sumLng = 0;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  vertices.forEach((v) => {
    sumLat += v.lat;
    sumLng += v.lng;
    if (v.lat < minLat) minLat = v.lat;
    if (v.lat > maxLat) maxLat = v.lat;
    if (v.lng < minLng) minLng = v.lng;
    if (v.lng > maxLng) maxLng = v.lng;
  });

  const centerLat = sumLat / vertices.length;
  const centerLng = sumLng / vertices.length;
  const autoZone = getUtmZone(centerLng);
  const centerZone = (forcedZone && forcedZone >= 1 && forcedZone <= 60) ? forcedZone : autoZone;

  // Convert all vertices to consistent UTM zone
  const utmCoords: UTMCoordinate[] = vertices.map((v, i) => {
    const utm = latLngToUtm(v.lat, v.lng, centerZone);

    return {
      id: i + 1,
      label: String(i + 1),
      easting: utm.easting,
      northing: utm.northing,
      zone: utm.zone,
      hemisphere: utm.hemisphere,
      centralMeridian: utm.centralMeridian,
      latitude: v.lat,
      longitude: v.lng,
      latDms: decToDms(v.lat, true),
      lngDms: decToDms(v.lng, false),
    };
  });

  // Calculate side lengths
  let perimeter = 0;
  for (let i = 0; i < utmCoords.length; i++) {
    const nextIdx = (i + 1) % utmCoords.length;
    const dist = distanceUtm(utmCoords[i], utmCoords[nextIdx]);
    utmCoords[i].distanceToNext = Math.round(dist * 100) / 100;
    perimeter += dist;
  }

  // Planimetric Shoelace Area calculation in UTM projection (m²)
  let signedArea = 0;
  const n = utmCoords.length;
  if (n >= 3) {
    for (let i = 0; i < n; i++) {
      const nextIdx = (i + 1) % n;
      signedArea +=
        utmCoords[i].easting * utmCoords[nextIdx].northing -
        utmCoords[nextIdx].easting * utmCoords[i].northing;
    }
    signedArea = signedArea / 2.0;
  }
  const area = Math.abs(signedArea);
  const isCCW = signedArea > 0;

  // Calculate Interior Angles between adjacent edges
  let sumAngles = 0;
  if (n >= 3) {
    for (let i = 0; i < n; i++) {
      const prevIdx = (i - 1 + n) % n;
      const nextIdx = (i + 1) % n;

      const curr = utmCoords[i];
      const prev = utmCoords[prevIdx];
      const next = utmCoords[nextIdx];

      // Vector from curr to prev
      const v1x = prev.easting - curr.easting;
      const v1y = prev.northing - curr.northing;
      // Vector from curr to next
      const v2x = next.easting - curr.easting;
      const v2y = next.northing - curr.northing;

      const alpha1 = Math.atan2(v1y, v1x);
      const alpha2 = Math.atan2(v2y, v2x);

      let delta = isCCW ? alpha1 - alpha2 : alpha2 - alpha1;
      while (delta < 0) delta += 2 * Math.PI;
      while (delta >= 2 * Math.PI) delta -= 2 * Math.PI;

      const angleDeg = (delta * 180) / Math.PI;
      curr.interiorAngleDeg = Math.round(angleDeg * 100) / 100;
      curr.interiorAngleDms = formatAngleDms(curr.interiorAngleDeg);
      sumAngles += curr.interiorAngleDeg;
    }
  }

  const expectedSum = n >= 3 ? (n - 2) * 180 : 0;
  const utmCenter = latLngToUtm(centerLat, centerLng, centerZone);

  return {
    areaSqMeters: Math.round(area * 100) / 100,
    perimeterMeters: Math.round(perimeter * 100) / 100,
    coordinates: utmCoords,
    center: { lat: centerLat, lng: centerLng },
    utmCenter: { easting: utmCenter.easting, northing: utmCenter.northing },
    zone: centerZone,
    hemisphere: utmCenter.hemisphere,
    centralMeridian: utmCenter.centralMeridian,
    bounds: { minLat, maxLat, minLng, maxLng },
    sumInteriorAngles: Math.round(sumAngles * 100) / 100,
    expectedSumInteriorAngles: expectedSum,
    isConvex: utmCoords.every((c) => (c.interiorAngleDeg || 0) <= 180),
  };
}

