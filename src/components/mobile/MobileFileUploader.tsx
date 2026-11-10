import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { MobileUploadSourceModal } from './MobileUploadSourceModal';
import { isIOSDevice } from '../../utils/device';

export interface MobileFileUploaderProps {
  uploading: boolean;
  uploadProgress: number;
  uploadMessage: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const MobileFileUploader: React.FC<MobileFileUploaderProps> = ({
  uploading,
  uploadProgress,
  uploadMessage,
  fileInputRef,
  onFileUpload,
}) => {
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = () => {
    if (uploading) return;

    // On iOS (iPhone/iPad), the native browser file input already shows a system sheet
    // with "Photo Library", "Take Photo", and "Choose File".
    // On Android and other platforms, open the custom modal to choose between Gallery and File Manager.
    if (isIOSDevice()) {
      fileInputRef.current?.click();
    } else {
      setIsSourceModalOpen(true);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Передать фото и файлы
          </h2>
        </div>
        <span className="text-[11px] text-zinc-500">Без сжатия</span>
      </div>

      {/* Input for visual photo & video picker (Gallery) */}
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        ref={mediaInputRef}
        onChange={onFileUpload}
        className="hidden"
      />

      {/* Input for generic file manager (All files & documents) */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={onFileUpload}
        className="hidden"
      />

      <button
        onClick={handleOpenModal}
        disabled={uploading}
        className="w-full py-4 border-2 border-dashed border-zinc-700/80 hover:border-zinc-600 bg-zinc-950 rounded-xl flex flex-col items-center justify-center gap-1.5 active:scale-[0.99] transition-all cursor-pointer"
      >
        <UploadCloud className="w-6 h-6 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-200">
          Выбрать из Фотопленки или Файлов
        </span>
        <span className="text-[11px] text-zinc-500">
          Сохранится в папку «LocalDrop» на ПК
        </span>
      </button>

      {uploading && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Передача...</span>
            <span className="font-mono">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="h-full bg-blue-600 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {uploadMessage && (
        <div className="p-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 text-center font-medium">
          {uploadMessage}
        </div>
      )}

      <MobileUploadSourceModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onSelectMedia={() => mediaInputRef.current?.click()}
        onSelectAllFiles={() => fileInputRef.current?.click()}
      />
    </div>
  );
};
