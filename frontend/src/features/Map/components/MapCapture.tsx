/**
 * MapCapture Component
 *
 * Captures the current map view as a composite image (MapBox canvas + DOM overlays + legend).
 * Opens in a new tab with options to copy, save as PNG, download PDF, or print.
 *
 * Adapted from IntelliFire EasyMap3 MapPrinting component.
 */

import { useCallback } from 'react';
import { useMap } from '../context/MapContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * MapCapture button — renders a camera icon that triggers map capture on click.
 */
export function MapCapture() {
  const { map, isLoaded } = useMap();

  const captureMap = useCallback(async () => {
    if (!map || !isLoaded) return;

    // Wait for all layers to finish rendering
    map.triggerRepaint();
    await new Promise<void>((resolve) => {
      map.once('idle', () => resolve());
    });

    const mapCanvas = map.getCanvas();
    const mapContainer = map.getContainer();

    // Step 1: Capture the MapBox GL canvas (base map + tile layers + rasters)
    const mapboxImgData = mapCanvas.toDataURL('image/png');

    // Step 2: Capture DOM overlays (markers, popups, HTML layers)
    const domOverlayCanvas = await html2canvas(mapContainer, {
      backgroundColor: null,
      ignoreElements: (element) => {
        if (element.tagName === 'CANVAS') return true;
        if (element.classList?.contains('mapboxgl-ctrl')) return true;
        // Ignore our map control panels (drawing toolbar, layer panel, etc.)
        if (element.classList?.contains('drawing-toolbar')) return true;
        if (element.classList?.contains('layer-panel')) return true;
        if (element.classList?.contains('layer-panel-toggle')) return true;
        if (element.classList?.contains('measurement-tool')) return true;
        if (element.classList?.contains('basemap-switcher')) return true;
        if (element.classList?.contains('terrain-control')) return true;
        return false;
      },
      logging: false,
      useCORS: true,
      scale: window.devicePixelRatio || 1,
    });

    // Step 3: Create composite canvas
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = mapCanvas.width;
    compositeCanvas.height = mapCanvas.height;
    const compositeCtx = compositeCanvas.getContext('2d');
    if (!compositeCtx) return;

    // Draw MapBox canvas first
    const mapboxImage = new Image();
    mapboxImage.src = mapboxImgData;
    await new Promise((resolve) => { mapboxImage.onload = resolve; });
    compositeCtx.drawImage(mapboxImage, 0, 0);

    // Draw DOM overlays on top
    compositeCtx.drawImage(
      domOverlayCanvas,
      0, 0, domOverlayCanvas.width, domOverlayCanvas.height,
      0, 0, mapCanvas.width, mapCanvas.height
    );

    // Step 4: Capture the raster legend if visible
    const legendEl = document.querySelector('[class*="raster-legend"]') as HTMLElement
      || document.querySelector('[style*="pointerEvents: none"]') as HTMLElement;
    if (legendEl && legendEl.offsetHeight > 0) {
      try {
        const legendCanvas = await html2canvas(legendEl, {
          backgroundColor: 'rgba(255,255,255,0.9)',
          logging: false,
          useCORS: true,
          scale: window.devicePixelRatio || 1,
        });

        const mapRect = mapContainer.getBoundingClientRect();
        const legendRect = legendEl.getBoundingClientRect();
        const scaleX = mapCanvas.width / mapRect.width;
        const scaleY = mapCanvas.height / mapRect.height;

        compositeCtx.drawImage(
          legendCanvas,
          0, 0, legendCanvas.width, legendCanvas.height,
          (legendRect.left - mapRect.left) * scaleX,
          (legendRect.top - mapRect.top) * scaleY,
          legendRect.width * scaleX,
          legendRect.height * scaleY
        );
      } catch {
        // Legend capture failed — proceed without it
      }
    }

    // Step 5: Add border and metadata strip
    const zoom = map.getZoom();
    const earthCircumference = 40075016.686;
    const tileSize = 256;
    const scale = earthCircumference / (Math.pow(2, zoom) * tileSize);

    const borderSize = 5;
    const stripHeight = 40;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = compositeCanvas.width + borderSize * 2;
    finalCanvas.height = compositeCanvas.height + borderSize * 2 + stripHeight;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    // Black border
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    // Map image
    ctx.drawImage(compositeCanvas, borderSize, borderSize);

    // Metadata strip
    const fontSize = Math.max(14, Math.min(20, finalCanvas.width / 60));
    ctx.font = `${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'white';

    const scaleText = `Scale 1:${Math.round(scale).toLocaleString()}`;
    const timestamp = new Date().toLocaleString();
    const username = localStorage.getItem('nomad_username') || '';
    const caption = username
      ? `${scaleText}  •  Captured by ${username} from Project Nomad on ${timestamp}`
      : `${scaleText}  •  Captured from Project Nomad on ${timestamp}`;

    ctx.fillText(caption, borderSize + 8, finalCanvas.height - stripHeight / 2 + fontSize / 3);

    // Step 6: Generate outputs and open in new tab
    const imgData = finalCanvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [finalCanvas.width, finalCanvas.height],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, finalCanvas.width, finalCanvas.height);
    const pdfData = pdf.output('datauristring');

    const safeName = `NomadMap_${new Date().toISOString().slice(0, 10)}`;

    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>Project Nomad — Map Capture</title>
            <style>
              body { font-family: system-ui, sans-serif; text-align: center; margin: 0; padding: 20px; background: #f5f5f5; }
              .container { position: relative; display: inline-block; }
              img { max-width: 100%; height: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.2); border-radius: 4px; }
              .actions { margin-top: 16px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
              .btn { padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 6px; text-decoration: none; cursor: pointer; border: none; }
              .btn-primary { background: #ff6b35; color: white; }
              .btn-secondary { background: #1f2937; color: white; }
              .hint { margin-top: 12px; color: #666; font-size: 13px; }
              @media print { .actions, .hint { display: none; } }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${imgData}" alt="Project Nomad Map Capture" />
              <div class="actions">
                <a href="${pdfData}" download="${safeName}.pdf" class="btn btn-primary">Download PDF</a>
                <a href="${imgData}" download="${safeName}.png" class="btn btn-secondary">Download PNG</a>
                <button class="btn btn-secondary" onclick="window.print()">Print</button>
              </div>
              <p class="hint">You can also right-click the image to copy or save it directly.</p>
            </div>
          </body>
        </html>
      `);
    }
  }, [map, isLoaded]);

  if (!map || !isLoaded) return null;

  return (
    <button
      onClick={captureMap}
      title="Capture map as image"
      style={{
        padding: 'clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)',
        fontSize: 'clamp(12px, 2.5vw, 16px)',
        fontWeight: 'bold',
        color: 'white',
        backgroundColor: '#059669',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        textShadow: '1.5px 1.5px 3px rgba(0, 0, 0, 0.6)',
        whiteSpace: 'nowrap' as const,
      }}
    >
      <i className="fa-solid fa-camera" />
    </button>
  );
}
