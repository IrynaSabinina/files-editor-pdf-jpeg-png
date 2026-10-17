import React, { useRef, useState } from 'react';
import { Upload, FileUp, Sparkles, Shield, Image as ImageIcon, FileText } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSamples: () => void;
  compact?: boolean;
  isLoading?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSamples,
  compact = false,
  isLoading = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter((file) => {
      const name = file.name.toLowerCase();
      return (
        name.endsWith('.pdf') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp') ||
        file.type === 'application/pdf' ||
        file.type.startsWith('image/')
      );
    });

    if (droppedFiles.length > 0) {
      onFilesSelected(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onFilesSelected(selected);
      // Reset input so re-selecting same file triggers onChange
      e.target.value = '';
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center justify-between p-3.5 rounded-xl border border-dashed transition-all ${
          isDragOver
            ? 'border-sky-400 bg-sky-950/20'
            : 'border-neutral-700 bg-neutral-850/50 hover:border-neutral-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400">
            <Upload className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-200">
              Drag & drop more PDF or JPG files here
            </p>
            <p className="text-[11px] text-neutral-400">
              Supports .pdf, .jpg, .jpeg, .png to insert additional pages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <FileUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Browse Device</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed transition-all text-center p-8 sm:p-12 overflow-hidden ${
        isDragOver
          ? 'border-sky-400 bg-sky-950/20 scale-[0.995]'
          : 'border-neutral-700/80 bg-neutral-850/60 hover:border-neutral-600 hover:bg-neutral-850'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isLoading}
      />

      <div className="max-w-xl mx-auto flex flex-col items-center">
        {/* Visual Icons */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div className="text-neutral-500 font-bold text-sm">+</div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-sm">
            <ImageIcon className="w-6 h-6" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          Select or drop PDF and JPG files
        </h2>

        <p className="text-sm text-neutral-400 mb-6 max-w-md">
          Upload separate PDF documents and photos from your device to rearrange pages, rotate, stamp, and merge into one single PDF.
        </p>

        {/* Primary Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="px-6 py-3 text-sm font-semibold text-neutral-950 bg-sky-400 hover:bg-sky-300 rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Upload className="w-4 h-4" />
            <span>Select Files from Device</span>
          </button>

          <button
            type="button"
            onClick={onLoadSamples}
            disabled={isLoading}
            className="px-4 py-3 text-sm font-medium text-neutral-200 bg-neutral-800 hover:bg-neutral-750 hover:text-white border border-neutral-700 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Load Demo Samples (2 PDFs + 1 JPG)</span>
          </button>
        </div>

        {/* Formats & Privacy Assurance */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="text-neutral-200 font-medium">Formats:</span> PDF, JPG, PNG, WEBP
          </span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span className="flex items-center gap-1.5 text-neutral-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Client-side · Zero server uploads</span>
          </span>
        </div>
      </div>
    </div>
  );
};
