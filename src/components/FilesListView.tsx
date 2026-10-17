import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  ChevronUp,
  ChevronDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { DocumentSourceFile, formatBytes } from '../utils/pdfManager';

interface FilesListViewProps {
  files: DocumentSourceFile[];
  pagesCountByFile: Map<string, number>;
  onMoveFile: (index: number, targetIndex: number) => void;
  onRemoveFile: (fileId: string) => void;
  onSwitchToPages: () => void;
}

export const FilesListView: React.FC<FilesListViewProps> = ({
  files,
  pagesCountByFile,
  onMoveFile,
  onRemoveFile,
  onSwitchToPages,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Source Documents & Images</h3>
          <p className="text-xs text-neutral-400">
            Reorder whole files to quickly arrange their pages in bulk.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToPages}
          className="px-3 py-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-950/30 hover:bg-sky-950/50 border border-sky-800/40 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <span>Organize Individual Pages</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2.5">
        {files.map((file, index) => {
          const pageCount = pagesCountByFile.get(file.id) || file.originalPageCount;
          const isPdf = file.type === 'pdf';

          return (
            <div
              key={file.id}
              className="flex items-center justify-between p-3.5 bg-neutral-850 rounded-xl border border-neutral-750 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isPdf
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                      : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                  }`}
                >
                  {isPdf ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-neutral-200 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                      {isPdf ? 'PDF' : file.name.split('.').pop() || 'IMG'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-400 tabular-nums mt-0.5">
                    <span>{formatBytes(file.size)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 text-neutral-300">
                      <Layers className="w-3 h-3 text-neutral-400" />
                      <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Move Up, Move Down, Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onMoveFile(index, index - 1)}
                  disabled={index === 0}
                  className={`p-1.5 rounded-lg border border-neutral-700 transition-colors ${
                    index === 0
                      ? 'text-neutral-600 bg-neutral-900 border-neutral-800 cursor-not-allowed'
                      : 'text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700'
                  }`}
                  title="Move file higher"
                  aria-label="Move file up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onMoveFile(index, index + 1)}
                  disabled={index === files.length - 1}
                  className={`p-1.5 rounded-lg border border-neutral-700 transition-colors ${
                    index === files.length - 1
                      ? 'text-neutral-600 bg-neutral-900 border-neutral-800 cursor-not-allowed'
                      : 'text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700'
                  }`}
                  title="Move file lower"
                  aria-label="Move file down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveFile(file.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-neutral-700 hover:border-red-500/30 transition-colors ml-1"
                  title="Remove file and pages"
                  aria-label="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
