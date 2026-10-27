/**
 * High-Resolution Satellite & Topographic Imagery Engine for Croquis de Localização
 * Generates georeferenced aerial imagery with CORS support and sub-pixel coordinate projection.
 */

export interface BoundingBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
  widthMeters: number;
  heightMeters: number;
}

/**
 * Calculates a georeferenced bounding box centered at (centerLat, centerLng)
 * spanning a specified width and height in meters.
 */
export function computeBoundingBox(
  centerLat: number,
  centerLng: number,
  widthMeters: number,
  heightMeters: number
): BoundingBox {
  const latMetersPerDeg = 111320;
  const latRad = (centerLat * Math.PI) / 180;
  const lngMetersPerDeg = 111320 * Math.cos(latRad);

  const latSpan = heightMeters / latMetersPerDeg;
  const lngSpan = widthMeters / (lngMetersPerDeg || 1);

  return {
    minLng: centerLng - lngSpan / 2,
    maxLng: centerLng + lngSpan / 2,
    minLat: centerLat - latSpan / 2,
    maxLat: centerLat + latSpan / 2,
    widthMeters,
    heightMeters,
  };
}

/**
 * Converts a (lat, lng) point to (px, py) on a canvas of (width, height)
 * based on the georeferenced bounding box.
 */
export function projectLatLngToPixels(
  lat: number,
  lng: number,
  bbox: BoundingBox,
  pixelWidth: number,
  pixelHeight: number
): { px: number; py: number } {
  const lngRatio = (lng - bbox.minLng) / (bbox.maxLng - bbox.minLng);
  // Latitude goes from south (bottom) to north (top), so inverted in screen coords
  const latRatio = (bbox.maxLat - lat) / (bbox.maxLat - bbox.minLat);

  return {
    px: lngRatio * pixelWidth,
    py: latRatio * pixelHeight,
  };
}

/**
 * Generates an Esri ArcGIS World Imagery export URL
 * Full sub-meter global aerial photography with native CORS enabled.
 */
export function getEsriSatelliteUrl(
  bbox: BoundingBox,
  imageWidth: number = 1520,
  imageHeight: number = 760
): string {
  const bboxStr = `${bbox.minLng.toFixed(6)},${bbox.minLat.toFixed(6)},${bbox.maxLng.toFixed(6)},${bbox.maxLat.toFixed(6)}`;
  return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bboxStr}&bboxSR=4326&imageSR=4326&size=${imageWidth},${imageHeight}&format=jpg&f=image`;
}

/**
 * Generates an Esri ArcGIS World Topo Map export URL
 * Traditional topographic cartography with contour lines, roads, and land cover.
 */
export function getEsriTopoMapUrl(
  bbox: BoundingBox,
  imageWidth: number = 1520,
  imageHeight: number = 680
): string {
  const bboxStr = `${bbox.minLng.toFixed(6)},${bbox.minLat.toFixed(6)},${bbox.maxLng.toFixed(6)},${bbox.maxLat.toFixed(6)}`;
  return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/export?bbox=${bboxStr}&bboxSR=4326&imageSR=4326&size=${imageWidth},${imageHeight}&format=jpg&f=image`;
}

/**
 * Cache for base64 encoded images to avoid duplicate fetches
 */
const dataUrlCache = new Map<string, string>();

/**
 * Fetches an image URL and converts it to a base64 data: URL
 * This guarantees 100% CORS-free rendering in HTML5 Canvas and jsPDF!
 */
export async function convertImageUrlToDataUrl(url: string): Promise<string> {
  if (dataUrlCache.has(url)) {
    return dataUrlCache.get(url)!;
  }

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        dataUrlCache.set(url, base64);
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn(`Failed to convert image to Data URL (${url}):`, err);
    // Return original url as fallback
    return url;
  }
}
