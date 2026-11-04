import React from 'react';
import { Download, X } from 'lucide-react';

export interface MobileImageModalProps {
  previewImage: { url: string; title: string } | null;
  onClose: () => void;
}

export const MobileImageModal: React.FC<MobileImageModalProps> = ({
  previewImage,
  onClose,
}) => {
  if (!previewImage) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="flex items-center justify-between pb-3 text-white">
        <span className="font-mono text-xs truncate max-w-[200px] text-zinc-300">
          {previewImage.title}
        </span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <a
            href={previewImage.url}
            download={previewImage.title}
            className="px-3 py-1 rounded-lg bg-blue-600 text-xs font-medium text-white flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Сохранить</span>
          </a>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-zinc-800 text-zinc-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto">
        <img
          src={previewImage.url}
          alt={previewImage.title}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          onClick={onClose}
        />
      </div>
      <p className="text-center text-xs text-zinc-500 pt-2">
        Нажмите на фото, чтобы закрыть
      </p>
    </div>
  );
};
