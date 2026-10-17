import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface DocumentSourceFile {
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'image';
  mimeType: string;
  data: Uint8Array;
  originalPageCount: number;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

export interface DocumentPageItem {
  id: string; // unique page item ID
  sourceFileId: string;
  sourceFileName: string;
  sourcePageIndex: number; // 0-indexed page in original file
  displayPageNumber: number; // calculated 1-indexed position in current merged list
  rotation: number; // 0, 90, 180, 270 degrees
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  isImage: boolean;
  imageData?: Uint8Array;
  imageMimeType?: string;
  deleted?: boolean;
}

export interface MergeOptions {
  filename: string;
  imagePageSize: 'fit' | 'a4' | 'letter';
  addPageNumbers: boolean;
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center';
  pageNumberFormat: 'page-of-total' | 'simple' | 'hyphenated';
  pageNumberStart: number;
  addWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: number;
  watermarkColor: 'slate' | 'red' | 'blue' | 'emerald';
  watermarkAngle: number;
  watermarkFontSize: number;
  documentTitle?: string;
  documentAuthor?: string;
}

/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Load a single PDF or image file and extract its pages
 */
export async function processUploadedFile(file: File): Promise<{
  sourceFile: DocumentSourceFile;
  pages: DocumentPageItem[];
}> {
  const fileBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(fileBuffer);
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

  if (isPdf) {
    const loadedPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const pageCount = loadedPdf.getPageCount();
    const pages: DocumentPageItem[] = [];

    for (let i = 0; i < pageCount; i++) {
      const page = loadedPdf.getPage(i);
      const { width, height } = page.getSize();
      const currentRotation = page.getRotation().angle;

      pages.push({
        id: `page_${fileId}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        sourceFileId: fileId,
        sourceFileName: file.name,
        sourcePageIndex: i,
        displayPageNumber: i + 1,
        rotation: currentRotation,
        width,
        height,
        isImage: false,
      });
    }

    const sourceFile: DocumentSourceFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: 'pdf',
      mimeType: 'application/pdf',
      data: fileBytes,
      originalPageCount: pageCount,
      uploadedAt: new Date(),
    };

    return { sourceFile, pages };
  } else if (isImage) {
    const imageUrl = URL.createObjectURL(file);
    const mimeType = file.type || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

    const sourceFile: DocumentSourceFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: 'image',
      mimeType,
      data: fileBytes,
      originalPageCount: 1,
      thumbnailUrl: imageUrl,
      uploadedAt: new Date(),
    };

    // Calculate image dimensions using Image element
    const dimensions = await getImageDimensions(imageUrl);

    const page: DocumentPageItem = {
      id: `page_${fileId}_0_${Math.random().toString(36).substring(2, 7)}`,
      sourceFileId: fileId,
      sourceFileName: file.name,
      sourcePageIndex: 0,
      displayPageNumber: 1,
      rotation: 0,
      width: dimensions.width,
      height: dimensions.height,
      thumbnailUrl: imageUrl,
      isImage: true,
      imageData: fileBytes,
      imageMimeType: mimeType,
    };

    return { sourceFile, pages: [page] };
  } else {
    throw new Error(`Unsupported file type: ${file.name}. Please select PDF or JPG/PNG files.`);
  }
}

/**
 * Helper to get image dimensions in browser
 */
function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 600, height: img.naturalHeight || 800 });
    };
    img.onerror = () => {
      resolve({ width: 595, height: 842 }); // Default A4
    };
    img.src = url;
  });
}

/**
 * Merge the configured pages into a new single PDFDocument and return binary bytes
 */
export async function mergePagesToPdf(
  pages: DocumentPageItem[],
  sourceFilesMap: Map<string, DocumentSourceFile>,
  options: MergeOptions
): Promise<{ pdfBytes: Uint8Array; blob: Blob; url: string; size: number }> {
  const mergedPdf = await PDFDocument.create();

  // Cache loaded source PDF documents to avoid re-parsing the same file multiple times
  const loadedPdfCache = new Map<string, PDFDocument>();

  for (const pageItem of pages) {
    if (pageItem.deleted) continue;

    const sourceFile = sourceFilesMap.get(pageItem.sourceFileId);
    if (!sourceFile) continue;

    if (pageItem.isImage && pageItem.imageData) {
      // Embed Image as PDF page
      let embeddedImage;
      const isPng = pageItem.imageMimeType?.includes('png') || sourceFile.name.toLowerCase().endsWith('.png');

      try {
        if (isPng) {
          embeddedImage = await mergedPdf.embedPng(pageItem.imageData);
        } else {
          // Default to JPG embedding
          embeddedImage = await mergedPdf.embedJpg(pageItem.imageData);
        }
      } catch (err) {
        // If JPG fails (e.g. webp or png mismatch), try converting via HTML canvas
        console.warn('Direct embedding failed, falling back to canvas conversion:', err);
        const canvasJpgBytes = await convertImageToJpgBytes(pageItem.imageData, pageItem.imageMimeType || 'image/jpeg');
        embeddedImage = await mergedPdf.embedJpg(canvasJpgBytes);
      }

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      let pageWidth = imgWidth;
      let pageHeight = imgHeight;
      let drawX = 0;
      let drawY = 0;
      let drawWidth = imgWidth;
      let drawHeight = imgHeight;

      if (options.imagePageSize === 'a4') {
        // Standard A4: 595.28 x 841.89 points
        const isLandscape = imgWidth > imgHeight;
        pageWidth = isLandscape ? 841.89 : 595.28;
        pageHeight = isLandscape ? 595.28 : 841.89;

        // Margin of 28 points (~10mm)
        const margin = 28;
        const availableW = pageWidth - margin * 2;
        const availableH = pageHeight - margin * 2;

        const scale = Math.min(availableW / imgWidth, availableH / imgHeight, 1);
        drawWidth = imgWidth * scale;
        drawHeight = imgHeight * scale;
        drawX = (pageWidth - drawWidth) / 2;
        drawY = (pageHeight - drawHeight) / 2;
      } else if (options.imagePageSize === 'letter') {
        // US Letter: 612 x 792 points
        const isLandscape = imgWidth > imgHeight;
        pageWidth = isLandscape ? 792 : 612;
        pageHeight = isLandscape ? 612 : 792;

        const margin = 36; // 0.5 inch
        const availableW = pageWidth - margin * 2;
        const availableH = pageHeight - margin * 2;

        const scale = Math.min(availableW / imgWidth, availableH / imgHeight, 1);
        drawWidth = imgWidth * scale;
        drawHeight = imgHeight * scale;
        drawX = (pageWidth - drawWidth) / 2;
        drawY = (pageHeight - drawHeight) / 2;
      }

      const newPage = mergedPdf.addPage([pageWidth, pageHeight]);
      newPage.drawImage(embeddedImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });

      if (pageItem.rotation !== 0) {
        newPage.setRotation(degrees(pageItem.rotation));
      }
    } else {
      // PDF Page
      let sourcePdf = loadedPdfCache.get(sourceFile.id);
      if (!sourcePdf) {
        sourcePdf = await PDFDocument.load(sourceFile.data, { ignoreEncryption: true });
        loadedPdfCache.set(sourceFile.id, sourcePdf);
      }

      const [copiedPage] = await mergedPdf.copyPages(sourcePdf, [pageItem.sourcePageIndex]);
      
      // Apply rotation (base rotation + user delta)
      const targetRotation = pageItem.rotation % 360;
      copiedPage.setRotation(degrees(targetRotation));

      mergedPdf.addPage(copiedPage);
    }
  }

  const finalPageCount = mergedPdf.getPageCount();

  // If no pages were added, return empty document
  if (finalPageCount === 0) {
    throw new Error('No pages selected to merge.');
  }

  // Load standard font for page numbers and watermark
  const helveticaFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);

  // Apply Watermark if enabled
  if (options.addWatermark && options.watermarkText.trim()) {
    let colorRgb = rgb(0.4, 0.4, 0.4);
    if (options.watermarkColor === 'red') colorRgb = rgb(0.85, 0.15, 0.15);
    if (options.watermarkColor === 'blue') colorRgb = rgb(0.15, 0.35, 0.85);
    if (options.watermarkColor === 'emerald') colorRgb = rgb(0.1, 0.6, 0.35);

    const watermarkText = options.watermarkText.trim();
    const fontSize = options.watermarkFontSize || 42;
    const textWidth = helveticaBold.widthOfTextAtSize(watermarkText, fontSize);
    const textHeight = helveticaBold.heightAtSize(fontSize);

    for (let i = 0; i < finalPageCount; i++) {
      const page = mergedPdf.getPage(i);
      const { width, height } = page.getSize();

      const centerX = width / 2;
      const centerY = height / 2;

      page.drawText(watermarkText, {
        x: centerX - textWidth / 2,
        y: centerY - textHeight / 2,
        size: fontSize,
        font: helveticaBold,
        color: colorRgb,
        opacity: Math.max(0.05, Math.min(1, options.watermarkOpacity)),
        rotate: degrees(options.watermarkAngle || 45),
      });
    }
  }

  // Apply Page Numbering if enabled
  if (options.addPageNumbers) {
    const fontSize = 10;
    const margin = 28;

    for (let i = 0; i < finalPageCount; i++) {
      const page = mergedPdf.getPage(i);
      const { width, height } = page.getSize();
      const currentNumber = (options.pageNumberStart || 1) + i;

      let numString = `${currentNumber}`;
      if (options.pageNumberFormat === 'page-of-total') {
        numString = `Page ${currentNumber} of ${finalPageCount}`;
      } else if (options.pageNumberFormat === 'hyphenated') {
        numString = `— ${currentNumber} —`;
      }

      const numWidth = helveticaFont.widthOfTextAtSize(numString, fontSize);

      let x = margin;
      let y = margin;

      switch (options.pageNumberPosition) {
        case 'bottom-center':
          x = (width - numWidth) / 2;
          y = margin;
          break;
        case 'bottom-right':
          x = width - numWidth - margin;
          y = margin;
          break;
        case 'bottom-left':
          x = margin;
          y = margin;
          break;
        case 'top-center':
          x = (width - numWidth) / 2;
          y = height - margin;
          break;
        case 'top-right':
          x = width - numWidth - margin;
          y = height - margin;
          break;
      }

      page.drawText(numString, {
        x,
        y,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.3, 0.3, 0.35),
      });
    }
  }

  // Apply Document Metadata
  if (options.documentTitle) mergedPdf.setTitle(options.documentTitle);
  if (options.documentAuthor) mergedPdf.setAuthor(options.documentAuthor);
  mergedPdf.setCreator('PDF Merge & Document Studio');
  mergedPdf.setProducer('PDF Merge & Document Studio');

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  return {
    pdfBytes,
    blob,
    url,
    size: pdfBytes.length,
  };
}

/**
 * Fallback image converter using canvas in browser
 */
async function convertImageToJpgBytes(imageData: Uint8Array, mimeType: string): Promise<Uint8Array> {
  const blob = new Blob([new Uint8Array(imageData).buffer as ArrayBuffer], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas context not available'));
        return;
      }

      // Fill white background for transparency (PNG to JPG)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        async (convertedBlob) => {
          URL.revokeObjectURL(objectUrl);
          if (!convertedBlob) {
            reject(new Error('Failed to convert image to blob'));
            return;
          }
          const buf = await convertedBlob.arrayBuffer();
          resolve(new Uint8Array(buf));
        },
        'image/jpeg',
        0.92
      );
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

/**
 * Trigger client browser download of file
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Generate built-in realistic sample PDFs for quick user testing
 */
export async function createSampleDocuments(): Promise<File[]> {
  const files: File[] = [];

  // Sample 1: Service Agreement (2 pages)
  const agreementDoc = await PDFDocument.create();
  const font = await agreementDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await agreementDoc.embedFont(StandardFonts.HelveticaBold);

  const page1 = agreementDoc.addPage([595.28, 841.89]);
  page1.drawText('MASTER SERVICES AGREEMENT', {
    x: 50,
    y: 780,
    size: 20,
    font: fontBold,
    color: rgb(0.09, 0.13, 0.24),
  });
  page1.drawText('Document Reference: MSA-2026-0881 · Confidential', {
    x: 50,
    y: 755,
    size: 10,
    font,
    color: rgb(0.4, 0.45, 0.55),
  });
  page1.drawLine({
    start: { x: 50, y: 740 },
    end: { x: 545, y: 740 },
    thickness: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  page1.drawText('1. PARTIES & SCOPE', {
    x: 50,
    y: 705,
    size: 13,
    font: fontBold,
    color: rgb(0.12, 0.15, 0.2),
  });
  const clause1 = [
    'This Agreement is entered into between Acme Cloud Global Inc ("Provider") and',
    'the Client Company ("Customer"). The parties agree to the terms herein regarding',
    'enterprise document processing, digital infrastructure hosting, and workflow automation.',
    'All intellectual property remains the sole property of the respective creator.',
  ];
  let currentY = 680;
  for (const line of clause1) {
    page1.drawText(line, { x: 50, y: currentY, size: 10, font, color: rgb(0.2, 0.25, 0.3) });
    currentY -= 16;
  }

  page1.drawText('2. PERFORMANCE SLA & SECURITY OBLIGATIONS', {
    x: 50,
    y: 590,
    size: 13,
    font: fontBold,
    color: rgb(0.12, 0.15, 0.2),
  });
  const clause2 = [
    '• 99.95% availability uptime guarantee with zero-data-loss architecture.',
    '• Client data processing strictly contained within the client runtime boundary.',
    '• Automatic SOC-2 Type II audit logging and ISO-27001 compliant procedures.',
    '• 24/7 dedicated engineering support with sub-15 minute critical response window.',
  ];
  currentY = 565;
  for (const line of clause2) {
    page1.drawText(line, { x: 50, y: currentY, size: 10, font, color: rgb(0.2, 0.25, 0.3) });
    currentY -= 18;
  }

  // Page 2 of agreement
  const page2 = agreementDoc.addPage([595.28, 841.89]);
  page2.drawText('SIGNATURE & EXECUTION PAGE', {
    x: 50,
    y: 780,
    size: 18,
    font: fontBold,
    color: rgb(0.09, 0.13, 0.24),
  });
  page2.drawText('Section 3: Binding Authorizations', {
    x: 50,
    y: 755,
    size: 10,
    font,
    color: rgb(0.4, 0.45, 0.55),
  });

  page2.drawRectangle({
    x: 50,
    y: 600,
    width: 220,
    height: 110,
    borderColor: rgb(0.7, 0.75, 0.82),
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1.0),
  });
  page2.drawText('PROVIDER SIGNATURE', { x: 65, y: 685, size: 9, font: fontBold, color: rgb(0.4, 0.45, 0.5) });
  page2.drawText('Authorized Signature: _________________', { x: 65, y: 645, size: 8, font, color: rgb(0.3, 0.35, 0.4) });
  page2.drawText('Date: October 17, 2026', { x: 65, y: 620, size: 8, font, color: rgb(0.3, 0.35, 0.4) });

  page2.drawRectangle({
    x: 320,
    y: 600,
    width: 220,
    height: 110,
    borderColor: rgb(0.7, 0.75, 0.82),
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1.0),
  });
  page2.drawText('CUSTOMER ACCEPTANCE', { x: 335, y: 685, size: 9, font: fontBold, color: rgb(0.4, 0.45, 0.5) });
  page2.drawText('Authorized Signature: _________________', { x: 335, y: 645, size: 8, font, color: rgb(0.3, 0.35, 0.4) });
  page2.drawText('Date: October 17, 2026', { x: 335, y: 620, size: 8, font, color: rgb(0.3, 0.35, 0.4) });

  const agreementBytes = await agreementDoc.save();
  files.push(new File([new Uint8Array(agreementBytes).buffer as ArrayBuffer], 'Service_Agreement_v2.pdf', { type: 'application/pdf' }));

  // Sample 2: Commercial Invoice (1 page)
  const invoiceDoc = await PDFDocument.create();
  const invFont = await invoiceDoc.embedFont(StandardFonts.Helvetica);
  const invBold = await invoiceDoc.embedFont(StandardFonts.HelveticaBold);

  const invPage = invoiceDoc.addPage([595.28, 841.89]);
  invPage.drawText('TAX INVOICE', { x: 50, y: 780, size: 24, font: invBold, color: rgb(0.08, 0.38, 0.74) });
  invPage.drawText('Invoice Number: INV-9042', { x: 380, y: 780, size: 12, font: invBold, color: rgb(0.2, 0.2, 0.2) });
  invPage.drawText('Date: Oct 17, 2026 · Due: Net 30', { x: 380, y: 762, size: 9, font: invFont, color: rgb(0.4, 0.4, 0.4) });

  invPage.drawRectangle({
    x: 50,
    y: 620,
    width: 495,
    height: 30,
    color: rgb(0.12, 0.2, 0.35),
  });
  invPage.drawText('ITEM DESCRIPTION', { x: 60, y: 632, size: 10, font: invBold, color: rgb(1, 1, 1) });
  invPage.drawText('QTY', { x: 330, y: 632, size: 10, font: invBold, color: rgb(1, 1, 1) });
  invPage.drawText('RATE', { x: 410, y: 632, size: 10, font: invBold, color: rgb(1, 1, 1) });
  invPage.drawText('TOTAL', { x: 490, y: 632, size: 10, font: invBold, color: rgb(1, 1, 1) });

  const invoiceItems = [
    { desc: 'Document Processing Cloud Engine - Enterprise', qty: '1', rate: '$1,200.00', total: '$1,200.00' },
    { desc: 'High-Throughput PDF Optimization Module', qty: '1', rate: '$450.00', total: '$450.00' },
    { desc: 'Dedicated Client Integration Support (Hours)', qty: '10', rate: '$150.00', total: '$1,500.00' },
  ];

  let itemY = 585;
  for (const item of invoiceItems) {
    invPage.drawText(item.desc, { x: 60, y: itemY, size: 10, font: invFont, color: rgb(0.15, 0.2, 0.25) });
    invPage.drawText(item.qty, { x: 340, y: itemY, size: 10, font: invFont, color: rgb(0.15, 0.2, 0.25) });
    invPage.drawText(item.rate, { x: 405, y: itemY, size: 10, font: invFont, color: rgb(0.15, 0.2, 0.25) });
    invPage.drawText(item.total, { x: 485, y: itemY, size: 10, font: invBold, color: rgb(0.15, 0.2, 0.25) });
    invPage.drawLine({
      start: { x: 50, y: itemY - 10 },
      end: { x: 545, y: itemY - 10 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.92),
    });
    itemY -= 36;
  }

  invPage.drawText('Total Due: $3,150.00 USD', { x: 380, y: itemY - 20, size: 14, font: invBold, color: rgb(0.08, 0.38, 0.74) });

  const invoiceBytes = await invoiceDoc.save();
  files.push(new File([new Uint8Array(invoiceBytes).buffer as ArrayBuffer], 'Invoice_INV-9042.pdf', { type: 'application/pdf' }));

  // Sample 3: A generated clean JPG image (e.g. Project Diagram / Attachment)
  const imageCanvas = document.createElement('canvas');
  imageCanvas.width = 1200;
  imageCanvas.height = 900;
  const ctx = imageCanvas.getContext('2d');
  if (ctx) {
    // Elegant graphic receipt / design diagram
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1200, 900);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 900);
      ctx.stroke();
    }
    for (let y = 0; y < 900; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Title card
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('TECHNICAL ARCHITECTURE BLUEPRINT', 80, 120);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '22px sans-serif';
    ctx.fillText('Project Alpha · Attached Architectural Diagram (JPG Export)', 80, 160);

    // Box 1
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(80, 240, 300, 220, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('1. Ingestion Layer', 110, 290);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText('• Client PDF / JPG Upload', 110, 330);
    ctx.fillText('• Binary Stream Parser', 110, 360);
    ctx.fillText('• Zero-Upload Local Privacy', 110, 390);

    // Box 2
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#34d399';
    ctx.beginPath();
    ctx.roundRect(450, 240, 300, 220, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('2. Engine Pipeline', 480, 290);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText('• Page Slicing & Reorder', 480, 330);
    ctx.fillText('• Matrix Rotation (0°-270°)', 480, 360);
    ctx.fillText('• Image Page Embedding', 480, 390);

    // Box 3
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.roundRect(820, 240, 300, 220, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('3. Output Artifact', 850, 290);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.fillText('• Single Merged PDF', 850, 330);
    ctx.fillText('• Stamped Watermarks', 850, 360);
    ctx.fillText('• Client Device Download', 850, 390);

    const imageBlob = await new Promise<Blob | null>((res) => imageCanvas.toBlob(res, 'image/jpeg', 0.95));
    if (imageBlob) {
      files.push(new File([imageBlob], 'System_Diagram_Overview.jpg', { type: 'image/jpeg' }));
    }
  }

  return files;
}
