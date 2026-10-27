import jsPDF from 'jspdf';
import { toJpeg, toPng } from 'html-to-image';
import { convertImageUrlToDataUrl } from './satelliteImagery';

export interface ExportPdfOptions {
  fileName?: string;
  paperFormat?: 'A4_PORTRAIT' | 'A4_LANDSCAPE' | 'A3_PORTRAIT' | 'A3_LANDSCAPE';
  onProgress?: (progress: number, stage: string) => void;
}

export async function exportCroquiToPdf(
  element: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<void> {
  const { fileName = 'croquis_de_localizacao.pdf', onProgress } = options;

  onProgress?.(10, 'Aguardando renderização completa dos mapas de satélite e vetorial...');

  // 1. Wait until both maps (satellite orthophoto & context street map) are completely generated
  let waitCount = 0;
  while (element.getAttribute('data-maps-ready') !== 'true' && waitCount < 40) {
    await new Promise((r) => setTimeout(r, 200));
    waitCount++;
  }

  // Ensure all remote HTTP images in the element are pre-converted to Data URLs
  const images = Array.from(element.querySelectorAll('img'));
  
  onProgress?.(25, 'Validando imagens e rasterizações cartográficas...');
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('http')) {
        try {
          const dataUrl = await convertImageUrlToDataUrl(src);
          if (dataUrl && dataUrl.startsWith('data:')) {
            img.src = dataUrl;
          }
        } catch {
          // ignore, continue with current src
        }
      }

      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 2500);
        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
      });
    })
  );

  onProgress?.(50, 'Renderizando prancha técnica em alta resolução ultra-nítida...');

  let imgData: string | null = null;
  let imgWidth = 794;
  let imgHeight = 1120;

  // Primary rendering using html-to-image at 2.5x high-DPI
  // skipFonts: true and fontEmbedCSS: '' prevent SecurityError on cross-origin Google Maps font stylesheets
  try {
    imgData = await toJpeg(element, {
      quality: 0.98,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
      fontEmbedCSS: '',
      filter: (node) => {
        if (node instanceof HTMLElement && node.classList.contains('no-print')) {
          return false;
        }
        return true;
      },
    });
    imgWidth = (element.scrollWidth || 794) * 2.5;
    imgHeight = (element.scrollHeight || 1120) * 2.5;
  } catch (err1) {
    console.warn('Tentando fallback com pixelRatio 2.0:', err1);
    try {
      imgData = await toJpeg(element, {
        quality: 0.96,
        pixelRatio: 2.0,
        backgroundColor: '#ffffff',
        skipFonts: true,
        fontEmbedCSS: '',
        filter: (node) => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        },
      });
      imgWidth = (element.scrollWidth || 794) * 2.0;
      imgHeight = (element.scrollHeight || 1120) * 2.0;
    } catch (err2) {
      console.warn('Fallback png:', err2);
      try {
        imgData = await toPng(element, {
          pixelRatio: 1.5,
          backgroundColor: '#ffffff',
          skipFonts: true,
          fontEmbedCSS: '',
          filter: (node) => {
            if (node instanceof HTMLElement && node.classList.contains('no-print')) {
              return false;
            }
            return true;
          },
        });
        imgWidth = (element.scrollWidth || 794) * 1.5;
        imgHeight = (element.scrollHeight || 1120) * 1.5;
      } catch (err3) {
        console.error('Falha na rasterização, utilizando impressão direta:', err3);
        onProgress?.(85, 'Abrindo diálogo nativo de impressão...');
        window.print();
        onProgress?.(100, 'Concluído via impressão!');
        return;
      }
    }
  }

  if (!imgData) {
    window.print();
    onProgress?.(100, 'Concluído via impressão!');
    return;
  }

  const paperFormat = options.paperFormat || 'A4_PORTRAIT';
  const isLandscape = paperFormat === 'A4_LANDSCAPE' || paperFormat === 'A3_LANDSCAPE';
  const isA3 = paperFormat === 'A3_PORTRAIT' || paperFormat === 'A3_LANDSCAPE';

  onProgress?.(75, `Gerando arquivo PDF ${isA3 ? 'A3' : 'A4'} ${isLandscape ? 'Paisagem' : 'Retrato'} normatizado...`);

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: isA3 ? 'a3' : 'a4',
    compress: true,
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Topographic presentation margins (4mm)
  const margin = 4;
  const contentWidth = pdfWidth - margin * 2;
  const contentHeight = (imgHeight * contentWidth) / imgWidth;

  pdf.addImage(
    imgData,
    'JPEG',
    margin,
    margin,
    contentWidth,
    Math.min(contentHeight, pdfHeight - margin * 2),
    undefined,
    'FAST'
  );

  onProgress?.(95, 'Finalizando download do PDF...');

  pdf.save(fileName);

  onProgress?.(100, 'Croqui exportado com sucesso!');
}

/**
 * Direct print trigger for browser vector print dialog
 */
export function triggerDirectPrint() {
  window.print();
}

/**
 * Export coordinates as CSV file
 */
export function exportCoordinatesCsv(coordinates: any[], projectName: string) {
  const headers = ['Id', 'Este_X_m', 'Norte_Y_m', 'Longitude_DMS', 'Latitude_DMS', 'Distancia_m', 'Angulo_Interno_Deg', 'Angulo_Interno_DMS'];
  const rows = coordinates.map((c) => [
    c.id,
    c.easting.toFixed(2),
    c.northing.toFixed(2),
    `"${c.lngDms}"`,
    `"${c.latDms}"`,
    c.distanceToNext ? c.distanceToNext.toFixed(2) : '0.00',
    c.interiorAngleDeg !== undefined ? c.interiorAngleDeg.toFixed(2) : '',
    c.interiorAngleDms ? `"${c.interiorAngleDms}"` : '',
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${projectName.replace(/\s+/g, '_')}_coordenadas_UTM.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
