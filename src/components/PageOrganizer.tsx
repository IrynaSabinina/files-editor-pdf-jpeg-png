import React, { useState } from 'react';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  ArrowUpDown,
  CheckSquare,
  Square,
  Undo2,
  Filter,
  Layers,
  ListOrdered,
  Sparkles,
} from 'lucide-react';
import { DocumentPageItem, DocumentSourceFile } from '../utils/pdfManager';
import { PageCard } from './PageCard';
import { ReorderPagesModal } from './ReorderPagesModal';

interface PageOrganizerProps {
  pages: DocumentPageItem[];
  sourceFilesMap: Map<string, DocumentSourceFile>;
  selectedPageIds: Set<string>;
  onToggleSelect: (pageId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onRotatePages: (pageIds: string[], delta: number) => void;
  onDeletePages: (pageIds: string[]) => void;
  onDuplicatePage: (pageId: string) => void;
  onMovePage: (fromIndex: number, toIndex: number) => void;
  onReorderPages: (newPages: DocumentPageItem[]) => void;
  onPreviewPage: (page: DocumentPageItem) => void;
  onResetOrder: () => void;
}

export const PageOrganizer: React.FC<PageOrganizerProps> = ({
  pages,
  sourceFilesMap,
  selectedPageIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onRotatePages,
  onDeletePages,
  onDuplicatePage,
  onMovePage,
  onReorderPages,
  onPreviewPage,
  onResetOrder,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [filterSourceFile, setFilterSourceFile] = useState<string>('all');
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Handle Drag & Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newPages = [...pages];
    const [moved] = newPages.splice(draggedIndex, 1);
    newPages.splice(targetIndex, 0, moved);
    onReorderPages(newPages);
    setDraggedIndex(null);
  };

  // Reverse page order
  const handleReverseOrder = () => {
    onReorderPages([...pages].reverse());
  };

  // Unique source files for filtering
  const sourceFileOptions = Array.from(sourceFilesMap.values());

  const displayedPages = filterSourceFile === 'all'
    ? pages
    : pages.filter((p) => p.sourceFileId === filterSourceFile);

  const selectedCount = selectedPageIds.size;
  const isAllSelected = pages.length > 0 && selectedCount === pages.length;

  return (
    <div className="space-y-4">
      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-850/80 rounded-xl border border-neutral-750">
        {/* Left: Selection & Bulk Operations */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
            className="px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            {isAllSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5 text-neutral-400" />
                <span>Select All ({pages.length})</span>
              </>
            )}
          </button>

          {selectedCount > 0 && (
            <>
              <div className="h-4 w-px bg-neutral-700 mx-1" />
              <button
                type="button"
                onClick={() => onRotatePages(Array.from(selectedPageIds), 90)}
                className="px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5"
                title="Rotate selected pages 90° clockwise"
              >
                <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Rotate ({selectedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => onDeletePages(Array.from(selectedPageIds))}
                className="px-2.5 py-1.5 text-xs font-medium text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/50 rounded-lg border border-red-800/60 transition-colors flex items-center gap-1.5"
                title="Remove selected pages"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedCount})</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Dedicated Edit Page Order Modal Trigger + Layout Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {sourceFileOptions.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={filterSourceFile}
                onChange={(e) => setFilterSourceFile(e.target.value)}
                className="text-xs bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500"
              >
                <option value="all">All Documents ({pages.length} pages)</option>
                {sourceFileOptions.map((sf) => (
                  <option key={sf.id} value={sf.id}>
                    {sf.name} ({pages.filter((p) => p.sourceFileId === sf.id).length} pages)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Primary "Edit Page Order" Action */}
          <button
            type="button"
            onClick={() => setIsReorderModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-sky-300 hover:text-white bg-sky-950/50 hover:bg-sky-900/60 rounded-lg border border-sky-800/60 transition-all flex items-center gap-1.5 shadow-xs"
            title="Open advanced sequence editor and page sorter"
          >
            <ListOrdered className="w-3.5 h-3.5 text-sky-400" />
            <span>Edit Page Order</span>
          </button>

          <button
            type="button"
            onClick={handleReverseOrder}
            className="px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5"
            title="Invert order of pages"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <span>Reverse</span>
          </button>

          <button
            type="button"
            onClick={onResetOrder}
            className="px-2.5 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-800/60 hover:bg-neutral-700 rounded-lg border border-neutral-700/60 transition-colors flex items-center gap-1.5"
            title="Reset to uploaded order"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      {displayedPages.length === 0 ? (
        <div className="p-12 text-center bg-neutral-850/40 rounded-2xl border border-neutral-800">
          <Layers className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-300 mb-1">
            No pages to display
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            Pages may have been deleted or filtered out.
          </p>
          <button
            type="button"
            onClick={onResetOrder}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg border border-neutral-700"
          >
            Restore All Pages
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {displayedPages.map((page, index) => (
            <PageCard
              key={page.id}
              page={page}
              sourceFile={sourceFilesMap.get(page.sourceFileId)}
              index={index}
              totalCount={displayedPages.length}
              isSelected={selectedPageIds.has(page.id)}
              onToggleSelect={onToggleSelect}
              onRotate={(pageId, delta) => onRotatePages([pageId], delta)}
              onDelete={(pageId) => onDeletePages([pageId])}
              onDuplicate={onDuplicatePage}
              onMove={onMovePage}
              onPreview={onPreviewPage}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* Reorder Pages Modal */}
      <ReorderPagesModal
        isOpen={isReorderModalOpen}
        onClose={() => setIsReorderModalOpen(false)}
        pages={pages}
        sourceFilesMap={sourceFilesMap}
        onApplyNewOrder={onReorderPages}
      />
    </div>
  );
};
