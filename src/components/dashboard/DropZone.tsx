import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneProps {
  isDragging: boolean;
  uploadStatus: string | null;
  onFileUpload: (files: FileList | null) => void;
  onDragStateChange: (dragging: boolean) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  isDragging,
  uploadStatus,
  onFileUpload,
  onDragStateChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragStateChange(true);
      }}
      onDragLeave={() => onDragStateChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragStateChange(false);
        onFileUpload(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 shrink-0 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-950/20'
          : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900'
      }`}
    >
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={(e) => onFileUpload(e.target.files)}
        className="hidden"
      />
      <UploadCloud className="w-7 h-7 text-zinc-400 mb-2" />
      <p className="text-sm font-medium text-zinc-200">
        Перетащите файлы сюда или нажмите для выбора
      </p>
      <p className="text-xs text-zinc-500 mt-1">
        Файлы сохраняются в папку LocalDrop • Для скриншота нажмите <b>Ctrl+V</b>
      </p>
      {uploadStatus && (
        <span className="mt-2.5 text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium">
          {uploadStatus}
        </span>
      )}
    </div>
  );
};
