import React, { useEffect, useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Image as ImageIcon,
  GripVertical,
  Check,
  Hash,
} from 'lucide-react';
import { DocumentPageItem, DocumentSourceFile } from '../utils/pdfManager';
import { getPdfPageThumbnail } from '../utils/pdfThumbnail';

interface PageCardProps {
  page: DocumentPageItem;
  sourceFile?: DocumentSourceFile;
  index: number;
  totalCount: number;
  isSelected: boolean;
  onToggleSelect: (pageId: string) => void;
  onRotate: (pageId: string, angleDelta: number) => void;
  onDelete: (pageId: string) => void;
  onDuplicate: (pageId: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onPreview: (page: DocumentPageItem) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export const PageCard: React.FC<PageCardProps> = ({
  page,
  sourceFile,
  index,
  totalCount,
  isSelected,
  onToggleSelect,
  onRotate,
  onDelete,
  onDuplicate,
  onMove,
  onPreview,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(page.thumbnailUrl || null);
  const [isLoadingThumb, setIsLoadingThumb] = useState(!page.thumbnailUrl && !page.isImage);
  const [isHoveredDrag, setIsHoveredDrag] = useState(false);

  // Quick Inline Position Editor state
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [inputPosition, setInputPosition] = useState<string>((index + 1).toString());

  // Keep input in sync with index
  useEffect(() => {
    setInputPosition((index + 1).toString());
  }, [index]);

  // If it's a PDF page, fetch rendered canvas thumbnail
  useEffect(() => {
    let isMounted = true;

    if (page.isImage && page.thumbnailUrl) {
      setThumbnailUrl(page.thumbnailUrl);
      setIsLoadingThumb(false);
      return;
    }

    if (sourceFile && !page.isImage) {
      setIsLoadingThumb(true);
      getPdfPageThumbnail(sourceFile.data, page.sourcePageIndex, page.rotation, 300)
        .then((url) => {
          if (isMounted) {
            setThumbnailUrl(url);
            setIsLoadingThumb(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsLoadingThumb(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [sourceFile, page.sourcePageIndex, page.rotation, page.isImage, page.thumbnailUrl]);

  const handlePositionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = parseInt(inputPosition, 10);
    if (!isNaN(target) && target >= 1 && target <= totalCount) {
      onMove(index, target - 1);
    }
    setIsEditingPosition(false);
  };

  const handleDragOverLocal = (e: React.DragEvent) => {
    setIsHoveredDrag(true);
    onDragOver(e, index);
  };

  const handleDragLeaveLocal = () => {
    setIsHoveredDrag(false);
  };

  const handleDropLocal = (e: React.DragEvent) => {
    setIsHoveredDrag(false);
    onDrop(e, index);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={handleDragOverLocal}
      onDragLeave={handleDragLeaveLocal}
      onDrop={handleDropLocal}
      className={`group relative flex flex-col bg-neutral-850 rounded-xl border transition-all duration-150 select-none ${
        isHoveredDrag
          ? 'border-sky-400 bg-sky-950/30 scale-[1.02] shadow-lg ring-2 ring-sky-400/40'
          : isSelected
          ? 'border-sky-400 ring-2 ring-sky-500/20 shadow-md'
          : 'border-neutral-750 hover:border-neutral-600 shadow-xs'
      }`}
    >
      {/* Top Bar on Card: Page number, Selection Checkbox, Position Editor & Drag Handle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/60 rounded-t-xl text-xs">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(page.id)}
            className="w-4 h-4 rounded text-sky-500 bg-neutral-800 border-neutral-700 focus:ring-sky-500 cursor-pointer"
            aria-label={`Select page ${index + 1}`}
          />

          {isEditingPosition ? (
            <form onSubmit={handlePositionSubmit} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="number"
                min={1}
                max={totalCount}
                value={inputPosition}
                onChange={(e) => setInputPosition(e.target.value)}
                autoFocus
                onBlur={() => setIsEditingPosition(false)}
                className="w-12 px-1 py-0.5 bg-neutral-950 border border-sky-400 rounded text-sky-300 font-mono text-xs text-center focus:outline-none"
              />
              <button
                type="submit"
                className="p-1 bg-sky-500 hover:bg-sky-400 text-neutral-950 rounded"
                title="Move to this page number"
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingPosition(true)}
              className="font-semibold text-neutral-200 hover:text-sky-300 hover:underline decoration-neutral-500 tabular-nums flex items-center gap-1 text-left"
              title="Click to change page position number"
            >
              <span>Page {index + 1}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-neutral-400">
          {page.rotation !== 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-sky-400 border border-neutral-700 tabular-nums">
              {page.rotation}°
            </span>
          )}
          <div
            className="cursor-grab active:cursor-grabbing p-1 text-neutral-500 hover:text-neutral-300"
            title="Drag to reorder page anywhere"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Main Thumbnail Viewport */}
      <div
        onClick={() => onPreview(page)}
        className="relative aspect-[3/4] p-3 flex items-center justify-center bg-neutral-950/40 cursor-pointer overflow-hidden group/thumb"
      >
        {/* Render Thumbnail or Placeholder */}
        {thumbnailUrl ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img
              src={thumbnailUrl}
              alt={`Page ${index + 1} preview`}
              className="max-h-full max-w-full object-contain rounded-sm shadow-sm transition-transform duration-200"
              style={{
                transform: page.isImage ? `rotate(${page.rotation}deg)` : undefined,
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-neutral-900/80 rounded border border-neutral-800 text-center">
            {isLoadingThumb ? (
              <div className="flex flex-col items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-neutral-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span className="text-[11px] text-neutral-500">Rendering preview...</span>
              </div>
            ) : (
              <>
                {page.isImage ? (
                  <ImageIcon className="w-8 h-8 text-sky-400/60 mb-2" />
                ) : (
                  <FileText className="w-8 h-8 text-neutral-500 mb-2" />
                )}
                <span className="text-xs font-semibold text-neutral-300 line-clamp-1">
                  {page.sourceFileName}
                </span>
                <span className="text-[11px] text-neutral-500 mt-1 tabular-nums">
                  {page.width && page.height ? `${Math.round(page.width)} × ${Math.round(page.height)} pt` : 'Standard'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Hover Inspect Overlay */}
        <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
          <div className="px-2.5 py-1.5 rounded-lg bg-neutral-900/90 text-white text-xs font-medium border border-neutral-700 shadow-md flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Enlarge</span>
          </div>
        </div>
      </div>

      {/* Source File Info & Position Helper */}
      <div className="px-3 py-1.5 border-t border-neutral-800/80 text-[11px] flex items-center justify-between text-neutral-400">
        <span className="truncate max-w-[130px]" title={page.sourceFileName}>
          {page.sourceFileName}
        </span>
        <button
          type="button"
          onClick={() => setIsEditingPosition(true)}
          className="text-neutral-500 hover:text-sky-300 text-[10px] font-mono tabular-nums underline decoration-neutral-700"
          title="Click to edit position number"
        >
          pos #{index + 1}
        </button>
      </div>

      {/* Card Footer Actions: Rotate, Movement (First, Left, Right, Last), Duplicate, Delete */}
      <div className="px-2 py-2 border-t border-neutral-800 bg-neutral-900/40 rounded-b-xl flex items-center justify-between gap-1">
        {/* Rotation */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onRotate(page.id, -90)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            title="Rotate Left (-90°)"
            aria-label="Rotate left"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRotate(page.id, 90)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            title="Rotate Right (+90°)"
            aria-label="Rotate right"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Position Movement: First, Prev, Next, Last */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onMove(index, 0)}
            disabled={index === 0}
            className={`p-1.5 rounded transition-colors ${
              index === 0
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Move to First Page"
            aria-label="Move to first"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, index - 1)}
            disabled={index === 0}
            className={`p-1.5 rounded transition-colors ${
              index === 0
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Move left/up"
            aria-label="Move left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, index + 1)}
            disabled={index === totalCount - 1}
            className={`p-1.5 rounded transition-colors ${
              index === totalCount - 1
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Move right/down"
            aria-label="Move right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, totalCount - 1)}
            disabled={index === totalCount - 1}
            className={`p-1.5 rounded transition-colors ${
              index === totalCount - 1
                ? 'text-neutral-600 cursor-not-allowed'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Move to Last Page"
            aria-label="Move to last"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Duplicate & Delete */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onDuplicate(page.id)}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
            title="Duplicate Page"
            aria-label="Duplicate page"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(page.id)}
            className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Delete Page"
            aria-label="Delete page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
