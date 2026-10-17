import React from 'react';
import { X, Sparkles, FileText, Stamp, Hash, Check } from 'lucide-react';
import { MergeOptions } from '../utils/pdfManager';

interface MergeSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  options: MergeOptions;
  onOptionsChange: (newOptions: MergeOptions) => void;
}

export const MergeSettingsDrawer: React.FC<MergeSettingsDrawerProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof MergeOptions>(key: K, value: MergeOptions[K]) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="relative w-full max-w-md bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h2 className="text-base font-bold text-white">Merge & Export Options</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close options"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-neutral-300">
          {/* File Name */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-200">
              Output PDF Filename
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={options.filename}
                onChange={(e) => handleChange('filename', e.target.value)}
                placeholder="merged_document.pdf"
                className="w-full px-3 py-2 bg-neutral-850 rounded-lg border border-neutral-700 text-neutral-100 text-xs focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-neutral-500">
              Will be saved directly to your device downloads folder.
            </p>
          </div>

          {/* Image Pages Sizing */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <label className="block text-xs font-semibold text-neutral-200">
              Image Sizing (JPG & PNG pages)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'fit', label: 'Original Size', desc: 'Exact pixels' },
                { id: 'a4', label: 'Standard A4', desc: 'With margins' },
                { id: 'letter', label: 'US Letter', desc: 'With margins' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => handleChange('imagePageSize', fmt.id as MergeOptions['imagePageSize'])}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    options.imagePageSize === fmt.id
                      ? 'border-sky-500 bg-sky-950/30 text-white'
                      : 'border-neutral-800 bg-neutral-850 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <p className="font-semibold text-neutral-200">{fmt.label}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Page Numbering */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-neutral-200">Stamp Page Numbers</span>
              </div>
              <input
                type="checkbox"
                checked={options.addPageNumbers}
                onChange={(e) => handleChange('addPageNumbers', e.target.checked)}
                className="w-4 h-4 rounded text-sky-500 bg-neutral-800 border-neutral-700 focus:ring-sky-500 cursor-pointer"
              />
            </div>

            {options.addPageNumbers && (
              <div className="space-y-3 p-3.5 bg-neutral-850/60 rounded-xl border border-neutral-800">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                    Position on Page
                  </label>
                  <select
                    value={options.pageNumberPosition}
                    onChange={(e) => handleChange('pageNumberPosition', e.target.value as MergeOptions['pageNumberPosition'])}
                    className="w-full px-2.5 py-1.5 bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg text-xs"
                  >
                    <option value="bottom-center">Bottom Center (Standard)</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-right">Top Right</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                    Format
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'page-of-total', label: 'Page 1 of 5' },
                      { id: 'simple', label: '1, 2, 3' },
                      { id: 'hyphenated', label: '— 1 —' },
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleChange('pageNumberFormat', fmt.id as MergeOptions['pageNumberFormat'])}
                        className={`p-1.5 text-[11px] font-mono rounded border text-center transition-all ${
                          options.pageNumberFormat === fmt.id
                            ? 'border-sky-500 bg-sky-950/40 text-sky-300'
                            : 'border-neutral-700 bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Watermark */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stamp className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-semibold text-neutral-200">Diagonal Watermark</span>
              </div>
              <input
                type="checkbox"
                checked={options.addWatermark}
                onChange={(e) => handleChange('addWatermark', e.target.checked)}
                className="w-4 h-4 rounded text-sky-500 bg-neutral-800 border-neutral-700 focus:ring-sky-500 cursor-pointer"
              />
            </div>

            {options.addWatermark && (
              <div className="space-y-3 p-3.5 bg-neutral-850/60 rounded-xl border border-neutral-800">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={options.watermarkText}
                    onChange={(e) => handleChange('watermarkText', e.target.value)}
                    placeholder="CONFIDENTIAL"
                    className="w-full px-3 py-1.5 bg-neutral-800 rounded-lg border border-neutral-700 text-neutral-200 text-xs font-semibold tracking-wider uppercase focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {['CONFIDENTIAL', 'DRAFT', 'SAMPLE', 'APPROVED'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleChange('watermarkText', preset)}
                        className="px-2 py-0.5 text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Opacity</span>
                    <span className="tabular-nums font-mono">{Math.round(options.watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.8"
                    step="0.05"
                    value={options.watermarkOpacity}
                    onChange={(e) => handleChange('watermarkOpacity', parseFloat(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                </div>

                {/* Color Choices */}
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5">
                    Color Tint
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'slate', name: 'Slate Gray', bg: 'bg-neutral-400' },
                      { id: 'red', name: 'Warning Red', bg: 'bg-red-500' },
                      { id: 'blue', name: 'Navy Blue', bg: 'bg-sky-500' },
                      { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-500' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => handleChange('watermarkColor', col.id as MergeOptions['watermarkColor'])}
                        className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 border ${
                          options.watermarkColor === col.id
                            ? 'border-white bg-neutral-750 text-white'
                            : 'border-neutral-700 bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${col.bg}`} />
                        <span>{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Document Metadata */}
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-neutral-200">PDF Metadata (Optional)</span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={options.documentTitle || ''}
                  onChange={(e) => handleChange('documentTitle', e.target.value)}
                  placeholder="e.g. Consolidated Contract Package"
                  className="w-full px-2.5 py-1.5 bg-neutral-850 rounded-lg border border-neutral-700 text-xs text-neutral-200"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  Author / Organization
                </label>
                <input
                  type="text"
                  value={options.documentAuthor || ''}
                  onChange={(e) => handleChange('documentAuthor', e.target.value)}
                  placeholder="e.g. Legal Operations"
                  className="w-full px-2.5 py-1.5 bg-neutral-850 rounded-lg border border-neutral-700 text-xs text-neutral-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Done button */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-900/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply & Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
