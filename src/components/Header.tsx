import React from 'react';
import { Download, FileText, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { formatBytes } from '../utils/pdfManager';

interface HeaderProps {
  pageCount: number;
  totalSize: number;
  fileCount: number;
  isMerging: boolean;
  onMergeAndDownload: () => void;
  onOpenSettings: () => void;
  activeView: 'pages' | 'files';
  onViewChange: (view: 'pages' | 'files') => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageCount,
  totalSize,
  fileCount,
  isMerging,
  onMergeAndDownload,
  onOpenSettings,
  activeView,
  onViewChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white whitespace-nowrap">
                PDF Studio
              </span>
              <span className="text-xs text-neutral-400 hidden sm:inline-block">· Merge & Edit</span>
            </div>
          </div>
        </div>

        {/* Zone 2: View Switcher & Document Status */}
        <div className="flex items-center gap-4">
          {fileCount > 0 && (
            <div className="flex items-center p-1 bg-neutral-800/80 rounded-lg border border-neutral-700/50">
              <button
                type="button"
                onClick={() => onViewChange('pages')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'pages'
                    ? 'bg-neutral-700 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Pages ({pageCount})</span>
              </button>
              <button
                type="button"
                onClick={() => onViewChange('files')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeView === 'files'
                    ? 'bg-neutral-700 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Files ({fileCount})</span>
              </button>
            </div>
          )}

          {fileCount > 0 && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400 tabular-nums">
              <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
              <span aria-hidden="true" className="text-neutral-600">·</span>
              <span>{formatBytes(totalSize)} total</span>
            </div>
          )}
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-750 hover:text-white rounded-lg border border-neutral-700 transition-colors whitespace-nowrap flex items-center gap-1.5"
            title="Configure Watermark, Page Numbering & Format"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Options</span>
          </button>

          <button
            type="button"
            onClick={onMergeAndDownload}
            disabled={pageCount === 0 || isMerging}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${
              pageCount === 0 || isMerging
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
                : 'bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold active:scale-[0.98]'
            }`}
          >
            {isMerging ? (
              <>
                <svg className="animate-spin h-4 w-4 text-neutral-950" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Merging PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Merge & Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
