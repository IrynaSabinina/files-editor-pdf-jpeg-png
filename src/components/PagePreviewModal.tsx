import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react';
import { DocumentPageItem, DocumentSourceFile } from '../utils/pdfManager';
import { getPdfPageThumbnail } from '../utils/pdfThumbnail';

interface PagePreviewModalProps {
  page: DocumentPageItem | null;
  pages: DocumentPageItem[];
  sourceFilesMap: Map<string, DocumentSourceFile>;
  onClose: () => void;
  onNavigate: (newPage: DocumentPageItem) => void;
  onRotate: (pageId: string, delta: number) => void;
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({
  page,
  pages,
  sourceFilesMap,
  onClose,
  onNavigate,
  onRotate,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highResUrl, setHighResUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentIndex = page ? pages.findIndex((p) => p.id === page.id) : -1;
  const sourceFile = page ? sourceFilesMap.get(page.sourceFileId) : null;

  useEffect(() => {
    if (!page) return;
    setZoomLevel(1);

    if (page.isImage && page.thumbnailUrl) {
      setHighResUrl(page.thumbnailUrl);
      setIsLoading(false);
      return;
    }

    if (sourceFile && !page.isImage) {
      setIsLoading(true);
      getPdfPageThumbnail(sourceFile.data, page.sourcePageIndex, page.rotation, 1000)
        .then((url) => {
          setHighResUrl(url);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [page, sourceFile]);

  if (!page) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pages.length - 1;

  const handlePrev = () => {
    if (hasPrev) onNavigate(pages[currentIndex - 1]);
  };

  const handleNext = () => {
    if (hasNext) onNavigate(pages[currentIndex + 1]);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md flex flex-col animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="px-4 py-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white font-semibold">
            {page.isImage ? <ImageIcon className="w-4 h-4 text-sky-400" /> : <FileText className="w-4 h-4 text-red-400" />}
            <span>Page {currentIndex + 1} of {pages.length}</span>
          </div>
          <span className="text-neutral-500">·</span>
          <span className="text-neutral-400 truncate max-w-xs">{page.sourceFileName}</span>
          {page.width && page.height && (
            <span className="text-neutral-500 tabular-nums hidden sm:inline">
              ({Math.round(page.width)} × {Math.round(page.height)} pt)
            </span>
          )}
        </div>

        {/* Controls: Zoom, Rotate, Close */}
        <div className="flex items-center gap-2">
          {/* Zoom */}
          <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 border border-neutral-700">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
              className="p-1.5 text-neutral-400 hover:text-white"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] tabular-nums text-neutral-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              className="p-1.5 text-neutral-400 hover:text-white"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-neutral-400 hover:text-white border-l border-neutral-700"
              title="Reset Zoom"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate */}
          <div className="flex items-center bg-neutral-800 rounded-lg p-0.5 border border-neutral-700">
            <button
              type="button"
              onClick={() => onRotate(page.id, -90)}
              className="p-1.5 text-neutral-400 hover:text-white"
              title="Rotate counter-clockwise"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onRotate(page.id, 90)}
              className="p-1.5 text-neutral-400 hover:text-white"
              title="Rotate clockwise"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors ml-2"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-auto">
        {/* Previous Button */}
        {hasPrev && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-6 z-10 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700 shadow-xl transition-all"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Content Box */}
        <div
          className="transition-transform duration-100 flex items-center justify-center max-w-full max-h-full"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-neutral-400">
              <svg className="animate-spin h-8 w-8 text-sky-400 mb-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>Rendering high resolution preview...</span>
            </div>
          ) : highResUrl ? (
            <img
              src={highResUrl}
              alt={`Full view of page ${currentIndex + 1}`}
              className="max-h-[82vh] max-w-[85vw] object-contain rounded-sm shadow-2xl bg-white"
              style={{
                transform: page.isImage ? `rotate(${page.rotation}deg)` : undefined,
              }}
            />
          ) : (
            <div className="p-12 bg-neutral-900 rounded-xl border border-neutral-800 text-center text-neutral-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-neutral-500" />
              <p className="text-sm font-semibold text-neutral-200">{page.sourceFileName}</p>
              <p className="text-xs text-neutral-500 mt-1">Page {page.sourcePageIndex + 1}</p>
            </div>
          )}
        </div>

        {/* Next Button */}
        {hasNext && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-6 z-10 p-3 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700 shadow-xl transition-all"
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Footer Strip */}
      <div className="px-4 py-2.5 bg-neutral-900/90 border-t border-neutral-800 text-center text-xs text-neutral-400 flex items-center justify-center gap-4">
        <span>Use arrow buttons or keyboard to inspect pages</span>
        <span aria-hidden="true">·</span>
        <span>Rotation: {page.rotation}°</span>
      </div>
    </div>
  );
};
