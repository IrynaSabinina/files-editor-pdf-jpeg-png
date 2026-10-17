import * as pdfjsLib from 'pdfjs-dist';

// Configure worker safely with CDN fallback
try {
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn('Could not initialize pdfjs worker via CDN:', e);
}

// In-memory thumbnail cache: `${sourceFileId}_${pageIndex}_${rotation}` -> dataURL
const thumbnailCache = new Map<string, string>();

/**
 * Render a single PDF page into a base64 PNG data URL thumbnail
 */
export async function getPdfPageThumbnail(
  pdfBytes: Uint8Array,
  pageIndex: number,
  rotation = 0,
  targetWidth = 320
): Promise<string | null> {
  const cacheKey = `${pdfBytes.length}_${pageIndex}_${rotation}_${targetWidth}`;
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: pdfBytes.slice(),
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    if (pageIndex >= pdfDoc.numPages) {
      return null;
    }

    const page = await pdfDoc.getPage(pageIndex + 1); // 1-indexed in pdfjs
    const unscaledViewport = page.getViewport({ scale: 1, rotation });
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale, rotation });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // @ts-expect-error standard pdfjs render parameters
    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    thumbnailCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn(`PDF.js thumbnail generation failed for page ${pageIndex}:`, err);
    return null;
  }
}
