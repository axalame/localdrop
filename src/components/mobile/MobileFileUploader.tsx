import React, { useRef } from 'react';
import { UploadCloud, Image, Film, FolderOpen } from 'lucide-react';
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
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isIOS = isIOSDevice();

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

      {/* Input for photo picker (triggers native Android Photo Picker with multi-select) */}
      <input
        type="file"
        multiple
        accept="image/*"
        ref={photoInputRef}
        onChange={onFileUpload}
        className="hidden"
      />

      {/* Input for video picker */}
      <input
        type="file"
        multiple
        accept="video/*"
        ref={videoInputRef}
        onChange={onFileUpload}
        className="hidden"
      />

      {/* Input for generic file manager */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={onFileUpload}
        className="hidden"
      />

      {isIOS ? (
        /* On iOS (iPhone/iPad): single dashed button that invokes the native iOS action sheet */
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full py-4 border-2 border-dashed border-zinc-700/80 hover:border-zinc-600 bg-zinc-950 rounded-xl flex flex-col items-center justify-center gap-1.5 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
        >
          <UploadCloud className="w-6 h-6 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">
            Выбрать из Фотопленки или Файлов
          </span>
          <span className="text-[11px] text-zinc-500">
            Сохранится в папку «LocalDrop» на ПК
          </span>
        </button>
      ) : (
        /* On Android and other platforms: direct 1-tap action buttons */
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading}
              className="py-3 px-2 bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 active:bg-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Image className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-semibold text-zinc-200">Фото</span>
              <span className="text-[10px] text-zinc-500">Галерея</span>
            </button>

            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className="py-3 px-2 bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 active:bg-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Film className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-semibold text-zinc-200">Видео</span>
              <span className="text-[10px] text-zinc-500">Ролики</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="py-3 px-2 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 active:bg-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-semibold text-zinc-200">Файлы</span>
              <span className="text-[10px] text-zinc-500">Документы</span>
            </button>
          </div>
          <span className="text-[11px] text-zinc-500 text-center">
            Сохранится в папку «LocalDrop» на ПК
          </span>
        </div>
      )}

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
    </div>
  );
};
