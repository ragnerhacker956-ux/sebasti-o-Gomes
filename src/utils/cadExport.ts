import { UTMCoordinate, LatLng, CroquiProject } from '../types/croqui';

/**
 * Export coordinates as CSV file
 */
export function exportCoordinatesCsv(coordinates: UTMCoordinate[], projectName: string) {
  const headers = [
    'Vértice',
    'Este_X_m',
    'Norte_Y_m',
    'Longitude_WGS84',
    'Latitude_WGS84',
    'Longitude_DMS',
    'Latitude_DMS',
    'Distancia_Prox_m',
    'Angulo_Interno_Deg',
    'Angulo_Interno_DMS',
  ];

  const rows = coordinates.map((c) => [
    c.id,
    c.easting.toFixed(2),
    c.northing.toFixed(2),
    c.longitude.toFixed(7),
    c.latitude.toFixed(7),
    `"${c.lngDms}"`,
    `"${c.latDms}"`,
    c.distanceToNext ? c.distanceToNext.toFixed(2) : '0.00',
    c.interiorAngleDeg !== undefined ? c.interiorAngleDeg.toFixed(2) : '',
    c.interiorAngleDms ? `"${c.interiorAngleDms}"` : '',
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

  triggerDownload(csvContent, `${sanitizeName(projectName)}_coordenadas_UTM.csv`);
}

/**
 * Export polygon as GeoJSON (standard RFC 7946 for QGIS, ArcGIS, CAD)
 */
export function exportPolygonGeoJson(project: CroquiProject, coordinates: UTMCoordinate[], areaM2: number, perimeterM: number) {
  if (project.vertices.length < 3) {
    alert('São necessários pelo menos 3 vértices para exportar o polígono em GeoJSON.');
    return;
  }

  // GeoJSON coordinates are [longitude, latitude] and first point must repeat at the end
  const ring = project.vertices.map((v) => [v.lng, v.lat]);
  ring.push([project.vertices[0].lng, project.vertices[0].lat]);

  const geojson = {
    type: 'FeatureCollection',
    name: project.name,
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
      },
    },
    features: [
      {
        type: 'Feature',
        properties: {
          nome: project.name,
          proprietario: project.stamp.owner,
          provincia: project.stamp.province,
          municipio: project.stamp.municipality,
          distrito: project.stamp.district,
          area_m2: areaM2,
          perimetro_m: perimeterM,
          escala: project.stamp.scaleText,
          responsavel: project.stamp.responsibleSurveyor,
          empresa: project.stamp.companyName,
          data: new Date().toLocaleDateString('pt-PT'),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      },
      ...(project.buildings || []).map((building) => {
        const ring = building.coordinates.map((pt) => [pt.lng, pt.lat]);
        ring.push([building.coordinates[0].lng, building.coordinates[0].lat]);
        return {
          type: 'Feature',
          properties: {
            tipo: 'edificio',
            nome: building.name || 'Edifício seleccionado',
            origem: building.source,
            osm_id: building.osmId || null,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ring],
          },
        };
      }),
      ...coordinates.map((c) => ({
        type: 'Feature',
        properties: {
          vertice: c.id,
          este_x: c.easting,
          norte_y: c.northing,
          zona_utm: c.zone,
          distancia_prox_m: c.distanceToNext,
        },
        geometry: {
          type: 'Point',
          coordinates: [c.longitude, c.latitude],
        },
      })),
    ],
  };

  const jsonContent = 'data:application/geo+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(geojson, null, 2));
  triggerDownload(jsonContent, `${sanitizeName(project.name)}_cadastral.geojson`);
}

/**
 * Export polygon and vertices as KML (Google Earth)
 */
export function exportPolygonKml(project: CroquiProject, coordinates: UTMCoordinate[], areaM2: number) {
  if (project.vertices.length < 3) return;

  const ringKml = project.vertices
    .map((v) => `${v.lng},${v.lat},0`)
    .concat([`${project.vertices[0].lng},${project.vertices[0].lat},0`])
    .join(' ');

  const placemarksVertices = coordinates
    .map(
      (c) => `
    <Placemark>
      <name>V${c.id}</name>
      <description><![CDATA[
        <b>Vértice ${c.id}</b><br/>
        Este (X): ${c.easting.toFixed(2)} m<br/>
        Norte (Y): ${c.northing.toFixed(2)} m<br/>
        Coord: ${c.latDms}, ${c.lngDms}
      ]]></description>
      <Point>
        <coordinates>${c.longitude},${c.latitude},0</coordinates>
      </Point>
    </Placemark>`
    )
    .join('');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(project.name)}</name>
    <description>Croqui Cadastral - ${escapeXml(project.stamp.owner)} (${escapeXml(project.stamp.municipality)}, ${escapeXml(project.stamp.province)})</description>
    <Style id="polyStyle">
      <LineStyle>
        <color>ff0000ff</color>
        <width>3</width>
      </LineStyle>
      <PolyStyle>
        <color>4d00ff00</color>
      </PolyStyle>
    </Style>
    <Placemark>
      <name>Polígono do Lote</name>
      <description><![CDATA[
        <b>Proprietário:</b> ${escapeXml(project.stamp.owner)}<br/>
        <b>Área:</b> ${areaM2.toLocaleString('pt-PT')} m²<br/>
        <b>Município:</b> ${escapeXml(project.stamp.municipality)}<br/>
        <b>Província:</b> ${escapeXml(project.stamp.province)}
      ]]></description>
      <styleUrl>#polyStyle</styleUrl>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${ringKml}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    ${placemarksVertices}
  </Document>
</kml>`;

  const kmlContent = 'data:application/vnd.google-earth.kml+xml;charset=utf-8,' + encodeURIComponent(kml);
  triggerDownload(kmlContent, `${sanitizeName(project.name)}_GoogleEarth.kml`);
}

/**
 * Export project as complete JSON backup
 */
export function exportProjectJson(project: CroquiProject) {
  const content = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
  triggerDownload(content, `${sanitizeName(project.name)}_projeto_croquigis.json`);
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement('a');
  link.setAttribute('href', href);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
