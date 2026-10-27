/**
 * High-Performance Slippy Tile Map Engine for Croquis de Localização
 * Composites Esri World Imagery (Satellite), Esri World Street Map, and OpenStreetMap tiles
 * into crystal-clear, CORS-free high-DPI canvases and Data URLs.
 */

export interface TileMapOptions {
  centerLat: number;
  centerLng: number;
  zoom: number;
  width: number;
  height: number;
  type: 'satellite' | 'hybrid' | 'street' | 'topo' | 'osm';
  includeLabels?: boolean;
}

/**
 * Calculates optimal zoom level (level 19 or 20) for the primary localization map to ensure house-level detail.
 * Fits the parcel perimeter cleanly while maximizing close-up clarity of buildings, roofs, driveways, and walls.
 */
export function calculateOptimalZoom(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  viewportWidth: number,
  viewportHeight: number,
  paddingFactor = 1.4
): number {
  const latSpan = Math.max(0.0001, bounds.maxLat - bounds.minLat);
  const lngSpan = Math.max(0.0001, bounds.maxLng - bounds.minLng);
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const latRad = (centerLat * Math.PI) / 180;

  // Real parcel dimensions in meters
  const latMeters = latSpan * 111320;
  const lngMeters = lngSpan * 111320 * Math.cos(latRad);
  const maxSpanMeters = Math.max(latMeters, lngMeters, 20);

  // Available viewport space (reserving margins for UTM ticks and annotations)
  const minPixels = Math.min(viewportWidth - 60, viewportHeight - 40);

  const desiredMetersPerPixel = (maxSpanMeters * paddingFactor) / minPixels;
  const rawZoom = Math.log2((156543.03392 * Math.cos(latRad)) / desiredMetersPerPixel);

  // Target optimal zoom level (level 19 or 20) to guarantee individual house-level detail
  const roundedZoom = Math.round(rawZoom * 2) / 2;
  return Math.max(19.0, Math.min(20.0, roundedZoom));
}

/**
 * Converts a (lat, lng) to pixel coordinates (px, py) on a map viewport
 * centered at (centerLat, centerLng) at zoom level `zoom`.
 */
export function projectLatLngToMapPixels(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
): { px: number; py: number } {
  const n = Math.pow(2, zoom);
  const centerWorldX = ((centerLng + 180) / 360) * n * 256;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerWorldY =
    ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) *
    n *
    256;

  const pointWorldX = ((lng + 180) / 360) * n * 256;
  const pointLatRad = (lat * Math.PI) / 180;
  const pointWorldY =
    ((1 - Math.log(Math.tan(pointLatRad) + 1 / Math.cos(pointLatRad)) / Math.PI) / 2) *
    n *
    256;

  return {
    px: viewportWidth / 2 + (pointWorldX - centerWorldX),
    py: viewportHeight / 2 + (pointWorldY - centerWorldY),
  };
}

/**
 * Inverse projection: converts (px, py) on the map back to (lat, lng).
 */
export function projectMapPixelsToLatLng(
  px: number,
  py: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const centerWorldX = ((centerLng + 180) / 360) * n * 256;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerWorldY =
    ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) *
    n *
    256;

  const pointWorldX = centerWorldX + (px - viewportWidth / 2);
  const pointWorldY = centerWorldY + (py - viewportHeight / 2);

  const lng = (pointWorldX / (n * 256)) * 360 - 180;
  const normY = pointWorldY / (n * 256);
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * normY)));
  const lat = (latRad * 180) / Math.PI;

  return { lat, lng };
}

/**
 * Returns tile URL for a given (x, y, z) and layer type
 */
export function getTileUrl(
  x: number,
  y: number,
  z: number,
  type: 'satellite' | 'hybrid' | 'street' | 'topo' | 'osm'
): string {
  if (type === 'satellite' || type === 'hybrid') {
    // Esri World Imagery (high-resolution aerial photography, sub-meter, global, CORS enabled)
    return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  } else if (type === 'street') {
    // Esri World Street Map (high-detail urban streets, avenues, neighborhood names, municipal grid)
    return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`;
  } else if (type === 'topo') {
    // Esri World Topo Map (traditional cartographic context with roads and terrain)
    return `https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`;
  } else {
    // OpenStreetMap standard cartography
    return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
}

/**
 * Returns Esri World Boundaries and Places overlay tile (street names, avenues, labels)
 */
export function getOverlayTileUrl(x: number, y: number, z: number): string {
  return `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${x}`;
}

/**
 * Helper to load an image with promise
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

/**
 * Renders slippy map tiles into an HTML5 Canvas and returns a Base64 data URL.
 * Accurately handles both integer and fractional zoom levels with sub-pixel alignment.
 */
export async function renderMapToCanvas(
  canvas: HTMLCanvasElement,
  options: TileMapOptions
): Promise<string> {
  const { centerLat, centerLng, zoom, width, height, type, includeLabels } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // High-DPI 2.5x scale for razor-sharp PDF print output
  const dpr = 2.5;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.scale(dpr, dpr);

  // Background fallback
  ctx.fillStyle = type === 'satellite' || type === 'hybrid' ? '#1e293b' : '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // Base integer zoom level for tile server requests (supports native level 19 imagery)
  const baseZ = Math.min(19, Math.max(1, Math.floor(zoom)));
  const scaleFactor = Math.pow(2, zoom - baseZ);

  // Continuous world coordinate at target zoom level
  const n = Math.pow(2, zoom);
  const centerWorldX = ((centerLng + 180) / 360) * n * 256;
  const centerLatRad = (centerLat * Math.PI) / 180;
  const centerWorldY =
    ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) *
    n *
    256;

  const minWorldX = centerWorldX - width / 2;
  const maxWorldX = centerWorldX + width / 2;
  const minWorldY = centerWorldY - height / 2;
  const maxWorldY = centerWorldY + height / 2;

  // Tile coordinates at baseZ: each tile at baseZ has size 256 * scaleFactor in zoom-space
  const tileSizeOnScreen = 256 * scaleFactor;
  const minTileX = Math.floor(minWorldX / tileSizeOnScreen);
  const maxTileX = Math.floor(maxWorldX / tileSizeOnScreen);
  const minTileY = Math.floor(minWorldY / tileSizeOnScreen);
  const maxTileY = Math.floor(maxWorldY / tileSizeOnScreen);

  const tilePromises: Promise<void>[] = [];
  const shouldAddStreetLabels = type === 'hybrid' || (type === 'satellite' && includeLabels);

  for (let tx = minTileX; tx <= maxTileX; tx++) {
    for (let ty = minTileY; ty <= maxTileY; ty++) {
      const tileDestX = tx * tileSizeOnScreen - minWorldX;
      const tileDestY = ty * tileSizeOnScreen - minWorldY;

      // Wrap longitudinal tile coordinate
      const maxTiles = Math.pow(2, baseZ);
      const wrappedTx = ((tx % maxTiles) + maxTiles) % maxTiles;

      if (ty < 0 || ty >= maxTiles) continue;

      const primaryUrl = getTileUrl(wrappedTx, ty, baseZ, type);

      const p = (async () => {
        try {
          const img = await loadImage(primaryUrl);
          ctx.drawImage(img, tileDestX, tileDestY, tileSizeOnScreen, tileSizeOnScreen);
        } catch {
          // If tile fails at baseZ, try parent tile zoom level as fallback
          if (baseZ > 13) {
            try {
              const parentZ = baseZ - 1;
              const parentTx = Math.floor(wrappedTx / 2);
              const parentTy = Math.floor(ty / 2);
              const fallbackUrl = getTileUrl(parentTx, parentTy, parentZ, type);
              const fallbackImg = await loadImage(fallbackUrl);
              const subX = (wrappedTx % 2) * 128;
              const subY = (ty % 2) * 128;
              ctx.drawImage(
                fallbackImg,
                subX,
                subY,
                128,
                128,
                tileDestX,
                tileDestY,
                tileSizeOnScreen,
                tileSizeOnScreen
              );
            } catch {
              // Ignore fallback error
            }
          }
        }

        // Layer Street Names / Places Overlay if requested (Hybrid mode)
        if (shouldAddStreetLabels && baseZ <= 18) {
          try {
            const overlayUrl = getOverlayTileUrl(wrappedTx, ty, baseZ);
            const overlayImg = await loadImage(overlayUrl);
            ctx.drawImage(overlayImg, tileDestX, tileDestY, tileSizeOnScreen, tileSizeOnScreen);
          } catch {
            // Overlay optional, continue
          }
        }
      })();

      tilePromises.push(p);
    }
  }

  await Promise.all(tilePromises);

  // Return crisp data URL with 96% JPEG quality for high-resolution PDF rendering
  try {
    return canvas.toDataURL('image/jpeg', 0.96);
  } catch {
    return '';
  }
}
