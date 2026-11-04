import React from 'react';
import { Camera, FolderOpen, Download, X } from 'lucide-react';
import { formatSize } from '../../utils/formatters';
import type { PreviewImage } from '../../hooks/useDashboardState';
import { isTauri } from '../../services/api';

interface ImagePreviewModalProps {
  previewImage: PreviewImage;
  onClose: () => void;
  onOpenFile: (filePath?: string) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  previewImage,
  onClose,
  onOpenFile,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      {/* Top modal bar */}
      <div
        className="flex items-center justify-between pb-3 text-white max-w-6xl mx-auto w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Camera className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-mono text-sm font-semibold truncate text-zinc-100">
            {previewImage.title}
          </span>
          {previewImage.size && (
            <span className="text-xs text-zinc-400 font-mono shrink-0">
              ({formatSize(previewImage.size)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {previewImage.filePath && isTauri && (
            <button
              onClick={() => onOpenFile(previewImage.filePath)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Показать в проводнике"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>В папке</span>
            </button>
          )}
          {!isTauri && (
            <a
              href={previewImage.url}
              download={previewImage.title}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Скачать файл"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Скачать</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Закрыть (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Display */}
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto py-2">
        <img
          src={previewImage.url}
          alt={previewImage.title}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl border border-zinc-800/60 select-none cursor-zoom-out"
          onClick={onClose}
        />
      </div>
      <p className="text-center text-xs text-zinc-500 pt-2">
        Нажмите в любом месте или клавишу Esc для закрытия
      </p>
    </div>
  );
};
