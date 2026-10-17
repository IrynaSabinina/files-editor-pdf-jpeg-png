import React from 'react';
import { CheckCircle2, Download, ExternalLink, FileText, Sparkles, RefreshCw, X } from 'lucide-react';
import { formatBytes } from '../utils/pdfManager';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  blob: Blob | null;
  size: number;
  pageCount: number;
  originalFileCount: number;
  previewUrl: string | null;
  onDownloadAgain: () => void;
  onStartNew: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  filename,
  size,
  pageCount,
  originalFileCount,
  previewUrl,
  onDownloadAgain,
  onStartNew,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-750 rounded-2xl shadow-2xl p-6 text-center space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            PDF Merged & Downloaded!
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Your consolidated document has been saved directly to your device.
          </p>
        </div>

        {/* File Card Summary */}
        <div className="p-4 bg-neutral-850 rounded-xl border border-neutral-750 text-left space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-neutral-200 truncate font-mono">
                {filename}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 tabular-nums">
                <span>{formatBytes(size)}</span>
                <span aria-hidden="true">·</span>
                <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Sources combined:</span>
            <span className="text-neutral-200 font-medium">{originalFileCount} files (PDFs / JPGs)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onDownloadAgain}
            className="w-full py-2.5 px-4 text-xs font-bold text-neutral-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Again to Device</span>
          </button>

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-750 hover:text-white border border-neutral-700 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4 text-sky-400" />
              <span>Open in New Browser Tab</span>
            </a>
          )}
        </div>

        {/* Footer options */}
        <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-xs"
          >
            Continue Editing
          </button>

          <button
            type="button"
            onClick={onStartNew}
            className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Start Fresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
