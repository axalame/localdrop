import React, { useEffect } from 'react';
import { Image, FolderOpen, X } from 'lucide-react';

export interface MobileUploadSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: () => void;
  onSelectAllFiles: () => void;
}

export const MobileUploadSourceModal: React.FC<MobileUploadSourceModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  onSelectAllFiles,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Выбор источника файлов"
      className="fixed inset-0 z-50 bg-black/75 flex flex-col justify-end sm:justify-center items-center p-4 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1 border-b border-zinc-800/80">
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-zinc-100">
              Выберите источник
            </h3>
            <p className="text-xs text-zinc-400">
              Как вы хотите выбрать файлы для отправки?
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              onClose();
              onSelectMedia();
            }}
            className="w-full p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 active:bg-zinc-800/80 flex items-center gap-3.5 transition-all text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Image className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-zinc-100">
                Галерея (Фото и видео)
              </span>
              <span className="text-xs text-zinc-400 truncate">
                Фотопленка, альбомы и недавние кадры
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              onSelectAllFiles();
            }}
            className="w-full p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 active:bg-zinc-800/80 flex items-center gap-3.5 transition-all text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-zinc-100">
                Все файлы и документы
              </span>
              <span className="text-xs text-zinc-400 truncate">
                Файловый менеджер, документы, архивы
              </span>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs text-center transition-colors cursor-pointer"
        >
          Отмена
        </button>
      </div>
    </div>
  );
};
