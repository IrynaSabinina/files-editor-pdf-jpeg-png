import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  FileText,
  Layers,
  Upload,
  Plus,
  Trash2,
  Undo2,
  Sparkles,
  Info,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Check,
} from 'lucide-react';
import {
  DocumentSourceFile,
  DocumentPageItem,
  MergeOptions,
  processUploadedFile,
  mergePagesToPdf,
  downloadFile,
  createSampleDocuments,
  formatBytes,
} from './utils/pdfManager';
import { Header } from './components/Header';
import { DropZone } from './components/DropZone';
import { PageOrganizer } from './components/PageOrganizer';
import { FilesListView } from './components/FilesListView';
import { MergeSettingsDrawer } from './components/MergeSettingsDrawer';
import { PagePreviewModal } from './components/PagePreviewModal';
import { DownloadModal } from './components/DownloadModal';

export default function App() {
  // State: Source files and individual pages
  const [sourceFiles, setSourceFiles] = useState<DocumentSourceFile[]>([]);
  const [pages, setPages] = useState<DocumentPageItem[]>([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());

  // Deleted pages history for quick Undo
  const [deletedPagesStack, setDeletedPagesStack] = useState<{
    page: DocumentPageItem;
    originalIndex: number;
  }[]>([]);

  // Navigation & View Mode
  const [activeView, setActiveView] = useState<'pages' | 'files'>('pages');

  // Loading & Merging States
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings & Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewingPage, setPreviewingPage] = useState<DocumentPageItem | null>(null);
  const [downloadModalData, setDownloadModalData] = useState<{
    isOpen: boolean;
    filename: string;
    blob: Blob | null;
    size: number;
    pageCount: number;
    originalFileCount: number;
    previewUrl: string | null;
  }>({
    isOpen: false,
    filename: 'merged_document.pdf',
    blob: null,
    size: 0,
    pageCount: 0,
    originalFileCount: 0,
    previewUrl: null,
  });

  // Merge Options Configuration
  const [mergeOptions, setMergeOptions] = useState<MergeOptions>({
    filename: 'merged_document.pdf',
    imagePageSize: 'a4',
    addPageNumbers: false,
    pageNumberPosition: 'bottom-center',
    pageNumberFormat: 'page-of-total',
    pageNumberStart: 1,
    addWatermark: false,
    watermarkText: 'CONFIDENTIAL',
    watermarkOpacity: 0.18,
    watermarkColor: 'slate',
    watermarkAngle: 45,
    watermarkFontSize: 42,
    documentTitle: 'Merged Document',
    documentAuthor: '',
  });

  // Source files lookup map
  const sourceFilesMap = useMemo(() => {
    const map = new Map<string, DocumentSourceFile>();
    sourceFiles.forEach((sf) => map.set(sf.id, sf));
    return map;
  }, [sourceFiles]);

  // Page count by file
  const pagesCountByFile = useMemo(() => {
    const map = new Map<string, number>();
    pages.forEach((p) => {
      map.set(p.sourceFileId, (map.get(p.sourceFileId) || 0) + 1);
    });
    return map;
  }, [pages]);

  // Total size in bytes of all uploaded source files
  const totalOriginalSize = useMemo(() => {
    return sourceFiles.reduce((acc, f) => acc + f.size, 0);
  }, [sourceFiles]);

  // Helper to show transient toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  /**
   * Handle user uploading / selecting files from device
   */
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setIsLoadingFiles(true);
    setErrorMessage(null);

    const newSourceFiles: DocumentSourceFile[] = [];
    const newPages: DocumentPageItem[] = [];
    let errorCount = 0;

    for (const file of files) {
      try {
        const { sourceFile, pages: extractedPages } = await processUploadedFile(file);
        newSourceFiles.push(sourceFile);
        newPages.push(...extractedPages);
      } catch (err: unknown) {
        errorCount++;
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    if (newSourceFiles.length > 0) {
      setSourceFiles((prev) => [...prev, ...newSourceFiles]);
      setPages((prev) => [...prev, ...newPages]);
      showToast(
        `Added ${newSourceFiles.length} ${newSourceFiles.length === 1 ? 'file' : 'files'} (${newPages.length} ${newPages.length === 1 ? 'page' : 'pages'})`
      );
    }

    if (errorCount > 0) {
      setErrorMessage(`Failed to load ${errorCount} unsupported or corrupted files.`);
    }

    setIsLoadingFiles(false);
  };

  /**
   * 1-Click Load Sample Documents (2 PDFs + 1 JPG diagram)
   */
  const handleLoadSamples = async () => {
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      const sampleFiles = await createSampleDocuments();
      await handleFilesSelected(sampleFiles);
      showToast('Loaded sample documents: Contract (PDF), Invoice (PDF), Diagram (JPG)');
    } catch (err) {
      console.error('Failed to create sample documents:', err);
      setErrorMessage('Could not generate sample files.');
      setIsLoadingFiles(false);
    }
  };

  /**
   * Page Reordering & Manipulation
   */
  const handleReorderPages = (newPages: DocumentPageItem[]) => {
    setPages(newPages);
  };

  const handleMovePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    setPages(newPages);
  };

  const handleRotatePages = (pageIds: string[], angleDelta: number) => {
    const idsSet = new Set(pageIds);
    setPages((prev) =>
      prev.map((page) => {
        if (!idsSet.has(page.id)) return page;
        const newRotation = (page.rotation + angleDelta + 360) % 360;
        return { ...page, rotation: newRotation };
      })
    );
    showToast(`Rotated ${pageIds.length} ${pageIds.length === 1 ? 'page' : 'pages'} by ${angleDelta > 0 ? '+90°' : '-90°'}`);
  };

  const handleDeletePages = (pageIds: string[]) => {
    const idsSet = new Set(pageIds);
    const pagesToDelete = pages.filter((p) => idsSet.has(p.id));

    // Push to undo stack
    const undoEntries = pagesToDelete.map((p) => ({
      page: p,
      originalIndex: pages.findIndex((item) => item.id === p.id),
    }));
    setDeletedPagesStack((prev) => [...prev, ...undoEntries]);

    setPages((prev) => prev.filter((p) => !idsSet.has(p.id)));
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => next.delete(id));
      return next;
    });

    showToast(`Removed ${pageIds.length} ${pageIds.length === 1 ? 'page' : 'pages'}`);
  };

  const handleUndoDelete = () => {
    if (deletedPagesStack.length === 0) return;
    const lastDeleted = deletedPagesStack[deletedPagesStack.length - 1];
    setDeletedPagesStack((prev) => prev.slice(0, prev.length - 1));

    setPages((prev) => {
      const newPages = [...prev];
      const insertAt = Math.min(lastDeleted.originalIndex, newPages.length);
      newPages.splice(insertAt, 0, lastDeleted.page);
      return newPages;
    });
    showToast(`Restored page from ${lastDeleted.page.sourceFileName}`);
  };

  const handleDuplicatePage = (pageId: string) => {
    const index = pages.findIndex((p) => p.id === pageId);
    if (index === -1) return;
    const original = pages[index];
    const clone: DocumentPageItem = {
      ...original,
      id: `clone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      displayPageNumber: original.displayPageNumber,
    };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, clone);
    setPages(newPages);
    showToast(`Duplicated page ${index + 1}`);
  };

  /**
   * File-level actions
   */
  const handleMoveFile = (fileIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= sourceFiles.length) return;
    const newFiles = [...sourceFiles];
    const [movedFile] = newFiles.splice(fileIndex, 1);
    newFiles.splice(targetIndex, 0, movedFile);
    setSourceFiles(newFiles);

    // Re-group pages to follow the new file order
    const sortedPages: DocumentPageItem[] = [];
    newFiles.forEach((f) => {
      const filePages = pages.filter((p) => p.sourceFileId === f.id);
      sortedPages.push(...filePages);
    });
    setPages(sortedPages);
    showToast(`Reordered ${movedFile.name}`);
  };

  const handleRemoveFile = (fileId: string) => {
    setSourceFiles((prev) => prev.filter((f) => f.id !== fileId));
    setPages((prev) => prev.filter((p) => p.sourceFileId !== fileId));
    setSelectedPageIds((prev) => {
      const next = new Set<string>();
      pages.forEach((p) => {
        if (p.sourceFileId !== fileId && prev.has(p.id)) next.add(p.id);
      });
      return next;
    });
    showToast('File and all its pages removed');
  };

  /**
   * Selection Handling
   */
  const handleToggleSelect = (pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPageIds(new Set(pages.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedPageIds(new Set());
  };

  const handleResetOrder = () => {
    // Re-extract pages in chronological order of files
    const resetPages: DocumentPageItem[] = [];
    sourceFiles.forEach((file) => {
      const originalFilePages = pages
        .filter((p) => p.sourceFileId === file.id)
        .sort((a, b) => a.sourcePageIndex - b.sourcePageIndex);
      resetPages.push(...originalFilePages);
    });
    setPages(resetPages);
    showToast('Reset pages to default sequence');
  };

  /**
   * Primary Action: Merge & Download PDF to client device
   */
  const handleMergeAndDownload = async () => {
    if (pages.length === 0) {
      setErrorMessage('Please add at least one PDF or image file first.');
      return;
    }

    setIsMerging(true);
    setErrorMessage(null);

    try {
      const result = await mergePagesToPdf(pages, sourceFilesMap, mergeOptions);

      // Download file directly to client device
      const outputFilename = mergeOptions.filename.trim() || 'merged_document.pdf';
      downloadFile(result.blob, outputFilename);

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 },
        });
      } catch (e) {
        // Confetti optional
      }

      // Show completion modal
      setDownloadModalData({
        isOpen: true,
        filename: outputFilename,
        blob: result.blob,
        size: result.size,
        pageCount: pages.length,
        originalFileCount: sourceFiles.length,
        previewUrl: result.url,
      });

      showToast(`Successfully merged ${pages.length} pages and downloaded to device!`);
    } catch (err: unknown) {
      console.error('Error merging PDF:', err);
      const msg = err instanceof Error ? err.message : 'Failed to merge documents.';
      setErrorMessage(msg);
    } finally {
      setIsMerging(false);
    }
  };

  /**
   * Reset / Start Fresh
   */
  const handleStartFresh = () => {
    setSourceFiles([]);
    setPages([]);
    setSelectedPageIds(new Set());
    setDeletedPagesStack([]);
    setDownloadModalData((prev) => ({ ...prev, isOpen: false, blob: null, previewUrl: null }));
    showToast('Cleared workspace. Ready for new files.');
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Bar Contract */}
      <Header
        pageCount={pages.length}
        totalSize={totalOriginalSize}
        fileCount={sourceFiles.length}
        isMerging={isMerging}
        onMergeAndDownload={handleMergeAndDownload}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-xl flex items-center justify-between text-xs text-red-200 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-100 font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 p-3 bg-neutral-800 border border-neutral-700 text-neutral-100 text-xs rounded-xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Undo Floating Pill if pages were recently deleted */}
        {deletedPagesStack.length > 0 && (
          <div className="fixed bottom-6 left-6 z-40">
            <button
              type="button"
              onClick={handleUndoDelete}
              className="px-3.5 py-2 bg-neutral-800/95 hover:bg-neutral-750 text-neutral-200 hover:text-white border border-neutral-700 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Undo2 className="w-4 h-4 text-sky-400" />
              <span>Undo Delete ({deletedPagesStack.length})</span>
            </button>
          </div>
        )}

        {/* Hero Drop Zone or Workspace */}
        {sourceFiles.length === 0 ? (
          <div className="py-8">
            <DropZone
              onFilesSelected={handleFilesSelected}
              onLoadSamples={handleLoadSamples}
              compact={false}
              isLoading={isLoadingFiles}
            />

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-5 bg-neutral-850/60 rounded-xl border border-neutral-800">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-1">
                  PDF & JPG File Download/Ingestion
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Select separate PDF documents and JPG or PNG pictures directly from your device. Images are automatically converted to crisp PDF pages.
                </p>
              </div>

              <div className="p-5 bg-neutral-850/60 rounded-xl border border-neutral-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-1">
                  Visual Page Organizer & Rotate
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Rearrange pages in any sequence with drag-and-drop, rotate orientations (90°/180°), duplicate sheets, or delete unwanted pages.
                </p>
              </div>

              <div className="p-5 bg-neutral-850/60 rounded-xl border border-neutral-800">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-1">
                  100% Private Client Execution
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Merging occurs entirely inside your local browser memory using pure WebAssembly and JavaScript. Zero files leave your computer.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Compact Ingestion Bar for adding more documents */}
            <DropZone
              onFilesSelected={handleFilesSelected}
              onLoadSamples={handleLoadSamples}
              compact={true}
              isLoading={isLoadingFiles}
            />

            {/* Quick Summary Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-neutral-850 rounded-xl border border-neutral-750">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {mergeOptions.filename}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 tabular-nums">
                    <span>{pages.length} total pages</span>
                    <span aria-hidden="true">·</span>
                    <span>{sourceFiles.length} source documents</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatBytes(totalOriginalSize)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {mergeOptions.addWatermark || mergeOptions.addPageNumbers
                      ? 'Options Active'
                      : 'Add Watermark / Numbers'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleMergeAndDownload}
                  disabled={pages.length === 0 || isMerging}
                  className="px-4 py-2 text-xs font-bold text-neutral-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  <span>Merge & Save File</span>
                </button>
              </div>
            </div>

            {/* Switchable View: Individual Pages Grid vs Source Files List */}
            {activeView === 'pages' ? (
              <PageOrganizer
                pages={pages}
                sourceFilesMap={sourceFilesMap}
                selectedPageIds={selectedPageIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onRotatePages={handleRotatePages}
                onDeletePages={handleDeletePages}
                onDuplicatePage={handleDuplicatePage}
                onMovePage={handleMovePage}
                onReorderPages={handleReorderPages}
                onPreviewPage={(page) => setPreviewingPage(page)}
                onResetOrder={handleResetOrder}
              />
            ) : (
              <FilesListView
                files={sourceFiles}
                pagesCountByFile={pagesCountByFile}
                onMoveFile={handleMoveFile}
                onRemoveFile={handleRemoveFile}
                onSwitchToPages={() => setActiveView('pages')}
              />
            )}
          </div>
        )}
      </main>

      {/* Settings / Options Drawer */}
      <MergeSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={mergeOptions}
        onOptionsChange={setMergeOptions}
      />

      {/* Full Page High-Resolution Preview Modal */}
      <PagePreviewModal
        page={previewingPage}
        pages={pages}
        sourceFilesMap={sourceFilesMap}
        onClose={() => setPreviewingPage(null)}
        onNavigate={(newPage) => setPreviewingPage(newPage)}
        onRotate={(pageId, delta) => handleRotatePages([pageId], delta)}
      />

      {/* Merge & Download Success Celebration Modal */}
      <DownloadModal
        isOpen={downloadModalData.isOpen}
        onClose={() => setDownloadModalData((prev) => ({ ...prev, isOpen: false }))}
        filename={downloadModalData.filename}
        blob={downloadModalData.blob}
        size={downloadModalData.size}
        pageCount={downloadModalData.pageCount}
        originalFileCount={downloadModalData.originalFileCount}
        previewUrl={downloadModalData.previewUrl}
        onDownloadAgain={() => {
          if (downloadModalData.blob) {
            downloadFile(downloadModalData.blob, downloadModalData.filename);
            showToast('Triggered download to your device');
          }
        }}
        onStartNew={handleStartFresh}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800/80 bg-neutral-900/60 py-6 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-300">PDF Studio</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>Client-side PDF & JPG Document Editor</span>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Private & Secure · Processed Locally</span>
            </span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span>Supports .pdf, .jpg, .png</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
