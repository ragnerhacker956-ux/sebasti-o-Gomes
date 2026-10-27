import { BuildingFootprint, LatLng } from '../types/croqui';

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = (a.lng > point.lng) !== (b.lng > point.lng) &&
      point.lat < ((b.lat - a.lat) * (point.lng - a.lng)) / ((b.lng - a.lng) || Number.EPSILON) + a.lat;
    if (crosses) inside = !inside;
  }
  return inside;
}

function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function distanceToPolygon(point: LatLng, polygon: LatLng[]): number {
  return Math.min(...polygon.map((p) => distanceMeters(point, p)));
}

/** Procura edifícios no OpenStreetMap; não analisa pixels de satélite. */
export async function findBuildingAtPoint(point: LatLng): Promise<BuildingFootprint | null> {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) ||
      point.lat < -90 || point.lat > 90 || point.lng < -180 || point.lng > 180) {
    throw new Error('Coordenadas inválidas para procurar o edifício.');
  }

  const query = `[out:json][timeout:20];(way["building"](around:45,${point.lat},${point.lng}););out tags geom;`;
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 22000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`O serviço cartográfico respondeu com erro (${response.status}).`);
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !Array.isArray((payload as any).elements)) {
        throw new Error('A resposta do serviço cartográfico não tem um formato válido.');
      }

      const candidates = (payload as any).elements
        .filter((item: any) => item?.type === 'way' && Array.isArray(item.geometry) && item.geometry.length >= 3)
        .map((item: any) => ({
          item,
          coordinates: item.geometry
            .filter((p: any) => Number.isFinite(p?.lat) && Number.isFinite(p?.lon))
            .map((p: any) => ({ lat: p.lat, lng: p.lon } as LatLng)),
        }))
        .filter((candidate: any) => candidate.coordinates.length >= 3);

      const containing = candidates.find((candidate: any) => pointInPolygon(point, candidate.coordinates));
      const nearest = containing || candidates
        .map((candidate: any) => ({ ...candidate, distance: distanceToPolygon(point, candidate.coordinates) }))
        .filter((candidate: any) => candidate.distance <= 20)
        .sort((a: any, b: any) => a.distance - b.distance)[0];

      if (!nearest) return null;
      const item = nearest.item;
      return {
        id: `osm-building-${item.id}`,
        name: typeof item.tags?.name === 'string' ? item.tags.name : undefined,
        source: 'openstreetmap',
        osmId: String(item.id),
        detectedAt: new Date().toISOString(),
        coordinates: nearest.coordinates,
      } satisfies BuildingFootprint;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof Error && lastError.name === 'AbortError') {
    throw new Error('A consulta demorou demasiado. Tente novamente dentro de alguns segundos.');
  }
  throw new Error('Não foi possível consultar os dados do OpenStreetMap. Verifique a ligação à Internet e tente novamente.');
}
