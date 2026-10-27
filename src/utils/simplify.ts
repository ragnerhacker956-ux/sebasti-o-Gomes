import { LatLng } from '../types/croqui';
import { latLngToUtm, utmToLatLng, distanceUtm } from './utm';

interface UtmPoint {
  easting: number;
  northing: number;
}

/**
 * Calculates perpendicular distance from point P to line segment AB (in 2D metric units).
 */
function perpendicularDistance(p: UtmPoint, a: UtmPoint, b: UtmPoint): number {
  const dx = b.easting - a.easting;
  const dy = b.northing - a.northing;
  const lineLenSq = dx * dx + dy * dy;

  if (lineLenSq === 0) {
    const px = p.easting - a.easting;
    const py = p.northing - a.northing;
    return Math.sqrt(px * px + py * py);
  }

  const num = Math.abs(
    (b.northing - a.northing) * p.easting -
      (b.easting - a.easting) * p.northing +
      b.easting * a.northing -
      b.northing * a.easting
  );
  return num / Math.sqrt(lineLenSq);
}

/**
 * Standard Ramer-Douglas-Peucker algorithm on an open chain of points in metric space.
 */
function rdp(points: UtmPoint[], epsilonMeters: number): UtmPoint[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilonMeters) {
    const recResults1 = rdp(points.slice(0, index + 1), epsilonMeters);
    const recResults2 = rdp(points.slice(index), epsilonMeters);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [first, last];
  }
}

/**
 * Simplifies a closed or near-closed polygon boundary drawn freehand.
 * - epsilonMeters: Cadastral tolerance in meters (e.g. 2m to 5m for plots).
 * - If points are few (e.g. discrete corner clicks < 12), preserves exact clicks.
 */
export function simplifyDrawnPolygon(
  rawPoints: LatLng[],
  epsilonMeters: number = 3.0,
  zone: number = 33,
  hemisphere: 'N' | 'S' = 'S'
): LatLng[] {
  if (rawPoints.length < 3) return rawPoints;

  // If user only clicked a few points (e.g. 3-8 corners), do not simplify out intentional corners!
  if (rawPoints.length <= 8) {
    return rawPoints;
  }

  // Convert to UTM for physically accurate meter calculations
  const utmPoints: UtmPoint[] = rawPoints.map((p) => {
    const utm = latLngToUtm(p.lat, p.lng, zone);
    return { easting: utm.easting, northing: utm.northing };
  });

  // Ensure closed loop
  const first = utmPoints[0];
  const last = utmPoints[utmPoints.length - 1];
  const closeDist = Math.hypot(last.easting - first.easting, last.northing - first.northing);

  // If start and end are not identical, close the loop
  let workingPoints = [...utmPoints];
  if (closeDist > 0.5) {
    workingPoints.push({ easting: first.easting, northing: first.northing });
  }

  // For a closed polygon, find the point farthest from the first point to split into two chains
  let maxDistFromFirst = 0;
  let splitIndex = Math.floor(workingPoints.length / 2);

  for (let i = 1; i < workingPoints.length - 1; i++) {
    const d = Math.hypot(
      workingPoints[i].easting - first.easting,
      workingPoints[i].northing - first.northing
    );
    if (d > maxDistFromFirst) {
      maxDistFromFirst = d;
      splitIndex = i;
    }
  }

  // Split into two chains: [0 .. splitIndex] and [splitIndex .. end]
  const chain1 = workingPoints.slice(0, splitIndex + 1);
  const chain2 = workingPoints.slice(splitIndex);

  const simplifiedChain1 = rdp(chain1, epsilonMeters);
  const simplifiedChain2 = rdp(chain2, epsilonMeters);

  // Combine: simplifiedChain1 + simplifiedChain2 (excluding overlapping start/end)
  const combined = simplifiedChain1
    .slice(0, -1)
    .concat(simplifiedChain2.slice(0, -1));

  // Convert back to LatLng
  let result = combined.map((p) => utmToLatLng(p.easting, p.northing, zone, hemisphere));

  // Filter out any consecutive duplicate points within 0.5m
  const filtered: LatLng[] = [];
  for (let i = 0; i < result.length; i++) {
    const curr = result[i];
    const prev = filtered[filtered.length - 1];
    if (!prev) {
      filtered.push(curr);
    } else {
      const dist = Math.hypot(curr.lat - prev.lat, curr.lng - prev.lng);
      if (dist > 0.00001) {
        filtered.push(curr);
      }
    }
  }

  // Must have at least 3 vertices
  if (filtered.length >= 3) {
    return filtered;
  }

  // If over-simplified, return original or minimal simplification
  if (rawPoints.length > 3) {
    // Return sample of raw points
    const step = Math.max(1, Math.floor(rawPoints.length / 8));
    return rawPoints.filter((_, idx) => idx % step === 0);
  }

  return rawPoints;
}
