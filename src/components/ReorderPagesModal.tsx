import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpDown,
  MoveVertical,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Sparkles,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  ListOrdered,
} from 'lucide-react';
import { DocumentPageItem, DocumentSourceFile } from '../utils/pdfManager';

interface ReorderPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: DocumentPageItem[];
  sourceFilesMap: Map<string, DocumentSourceFile>;
  onApplyNewOrder: (reorderedPages: DocumentPageItem[]) => void;
}

export const ReorderPagesModal: React.FC<ReorderPagesModalProps> = ({
  isOpen,
  onClose,
  pages,
  sourceFilesMap,
  onApplyNewOrder,
}) => {
  // Working copy of pages in modal
  const [workingPages, setWorkingPages] = useState<DocumentPageItem[]>([]);
  const [sequenceInput, setSequenceInput] = useState<string>('');
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'visual' | 'sequence'>('visual');

  // Initialize working copy when opened
  useEffect(() => {
    if (isOpen) {
      setWorkingPages([...pages]);
      setSequenceInput(pages.map((_, i) => i + 1).join(', '));
      setSequenceError(null);
    }
  }, [isOpen, pages]);

  if (!isOpen) return null;

  // Move single item in working list
  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= workingPages.length) return;
    const next = [...workingPages];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setWorkingPages(next);
    setSequenceInput(next.map((p) => pages.findIndex((orig) => orig.id === p.id) + 1).join(', '));
  };

  const moveToStart = (idx: number) => moveItem(idx, 0);
  const moveToEnd = (idx: number) => moveItem(idx, workingPages.length - 1);

  // Presets
  const applyPresetReverse = () => {
    const reversed = [...workingPages].reverse();
    setWorkingPages(reversed);
    setSequenceInput(reversed.map((p) => pages.findIndex((orig) => orig.id === p.id) + 1).join(', '));
  };

  const applyPresetOddEven = () => {
    // Collect 1-indexed odd pages (1, 3, 5...) then even pages (2, 4, 6...)
    const odds: DocumentPageItem[] = [];
    const evens: DocumentPageItem[] = [];
    workingPages.forEach((p, i) => {
      if ((i + 1) % 2 !== 0) odds.push(p);
      else evens.push(p);
    });
    const combined = [...odds, ...evens];
    setWorkingPages(combined);
    setSequenceInput(combined.map((p) => pages.findIndex((orig) => orig.id === p.id) + 1).join(', '));
  };

  const applyPresetGroupByDocument = () => {
    // Sort by source file name, then original source page index
    const sorted = [...workingPages].sort((a, b) => {
      if (a.sourceFileId === b.sourceFileId) {
        return a.sourcePageIndex - b.sourcePageIndex;
      }
      return a.sourceFileName.localeCompare(b.sourceFileName);
    });
    setWorkingPages(sorted);
    setSequenceInput(sorted.map((p) => pages.findIndex((orig) => orig.id === p.id) + 1).join(', '));
  };

  const applyPresetReset = () => {
    setWorkingPages([...pages]);
    setSequenceInput(pages.map((_, i) => i + 1).join(', '));
    setSequenceError(null);
  };

  // Parse sequence string like "1, 3, 2, 4-6"
  const handleParseSequence = () => {
    setSequenceError(null);
    const parts = sequenceInput.split(/[\s,]+/);
    const indices: number[] = [];

    for (const part of parts) {
      if (!part.trim()) continue;

      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);

        if (isNaN(start) || isNaN(end) || start < 1 || end > pages.length) {
          setSequenceError(`Invalid range "${part}". Pages must be between 1 and ${pages.length}.`);
          return;
        }

        if (start <= end) {
          for (let k = start; k <= end; k++) indices.push(k - 1);
        } else {
          for (let k = start; k >= end; k--) indices.push(k - 1);
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > pages.length) {
          setSequenceError(`Invalid page number "${part}". Must be between 1 and ${pages.length}.`);
          return;
        }
        indices.push(pageNum - 1);
      }
    }

    if (indices.length === 0) {
      setSequenceError('Please specify at least one valid page number.');
      return;
    }

    // Build new list according to indices
    const newOrder: DocumentPageItem[] = indices.map((idx) => pages[idx]);
    setWorkingPages(newOrder);
  };

  const handleApply = () => {
    onApplyNewOrder(workingPages);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-750 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Page Order</h2>
              <p className="text-xs text-neutral-400">
                Rearrange, reorder, or customize the exact sequence of {pages.length} pages
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher & Presets Toolbar */}
        <div className="px-5 py-3 bg-neutral-850/80 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Segmented Mode tabs */}
          <div className="flex items-center p-1 bg-neutral-800 rounded-lg border border-neutral-700/60">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                activeTab === 'visual'
                  ? 'bg-neutral-700 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Visual List Sorter
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sequence')}
              className={`px-3 py-1 font-medium rounded-md transition-all ${
                activeTab === 'sequence'
                  ? 'bg-neutral-700 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Type Numbers (e.g. 1, 3, 2-5)
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 font-medium hidden sm:inline">Presets:</span>
            <button
              type="button"
              onClick={applyPresetReverse}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded border border-neutral-700 transition-colors"
              title="Reverse full page order"
            >
              Reverse
            </button>
            <button
              type="button"
              onClick={applyPresetOddEven}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded border border-neutral-700 transition-colors"
              title="Odds first (1, 3, 5...), then evens (2, 4, 6...)"
            >
              Odd / Even
            </button>
            <button
              type="button"
              onClick={applyPresetGroupByDocument}
              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded border border-neutral-700 transition-colors"
              title="Group pages by their source document"
            >
              By Document
            </button>
            <button
              type="button"
              onClick={applyPresetReset}
              className="p-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 rounded border border-neutral-700 transition-colors"
              title="Reset to original order"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'sequence' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1.5">
                  Page Sequence String
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sequenceInput}
                    onChange={(e) => setSequenceInput(e.target.value)}
                    placeholder="e.g. 1, 3, 2, 4-6"
                    className="flex-1 px-3 py-2 bg-neutral-800 rounded-lg border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleParseSequence}
                    className="px-4 py-2 text-xs font-semibold bg-neutral-750 hover:bg-neutral-700 text-sky-400 border border-neutral-600 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Apply Sequence
                  </button>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1.5">
                  Type individual numbers or ranges separated by commas. Example: <code className="text-sky-300">2, 1, 3-5</code>
                </p>
                {sequenceError && (
                  <p className="text-xs text-red-400 mt-2 font-medium">
                    {sequenceError}
                  </p>
                )}
              </div>

              {/* Preview of Current Resulting Order */}
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <span className="text-xs font-semibold text-neutral-300">
                  Resulting Sequence Preview ({workingPages.length} pages):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-3 bg-neutral-850 rounded-xl border border-neutral-750">
                  {workingPages.map((page, idx) => {
                    const origIndex = pages.findIndex((p) => p.id === page.id) + 1;
                    return (
                      <div
                        key={`${page.id}_${idx}`}
                        className="px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs font-mono flex items-center gap-1 text-neutral-200"
                      >
                        <span className="text-neutral-500 text-[10px]">#{idx + 1}</span>
                        <span className="text-sky-400 font-semibold">{page.sourceFileName.slice(0, 10)}</span>
                        <span className="text-neutral-400 text-[10px]">p.{origIndex}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-neutral-400 mb-3">
                Use the position buttons on each row to quickly promote or demote pages to the exact order you want.
              </p>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {workingPages.map((page, index) => {
                  const origIndex = pages.findIndex((p) => p.id === page.id) + 1;
                  const isPdf = !page.isImage;

                  return (
                    <div
                      key={`${page.id}_${index}`}
                      className="flex items-center justify-between p-2.5 bg-neutral-850 rounded-xl border border-neutral-750/70 hover:border-neutral-600 transition-colors"
                    >
                      {/* Left: New Position Number & Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs font-mono text-sky-400 shrink-0">
                          {index + 1}
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <div className="shrink-0 text-neutral-500">
                            {isPdf ? (
                              <FileText className="w-4 h-4 text-red-400" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-sky-400" />
                            )}
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-semibold text-neutral-200 truncate">
                              {page.sourceFileName}
                            </span>
                            <span className="text-[11px] text-neutral-500 ml-2">
                              (Original Page {origIndex})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick movement controls (To Top, Up, Down, To Bottom) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveToStart(index)}
                          disabled={index === 0}
                          className={`p-1.5 rounded transition-colors ${
                            index === 0
                              ? 'text-neutral-600 cursor-not-allowed'
                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          }`}
                          title="Move to first page"
                          aria-label="Move to top"
                        >
                          <ChevronsUp className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveItem(index, index - 1)}
                          disabled={index === 0}
                          className={`p-1.5 rounded transition-colors ${
                            index === 0
                              ? 'text-neutral-600 cursor-not-allowed'
                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          }`}
                          title="Move up one step"
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveItem(index, index + 1)}
                          disabled={index === workingPages.length - 1}
                          className={`p-1.5 rounded transition-colors ${
                            index === workingPages.length - 1
                              ? 'text-neutral-600 cursor-not-allowed'
                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          }`}
                          title="Move down one step"
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveToEnd(index)}
                          disabled={index === workingPages.length - 1}
                          className={`p-1.5 rounded transition-colors ${
                            index === workingPages.length - 1
                              ? 'text-neutral-600 cursor-not-allowed'
                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          }`}
                          title="Move to last page"
                          aria-label="Move to end"
                        >
                          <ChevronsDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-medium text-neutral-400 hover:text-neutral-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 font-semibold text-neutral-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply New Page Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};
