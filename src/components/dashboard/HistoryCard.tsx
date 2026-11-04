import React from 'react';
import { Camera, FileText, Clipboard, Maximize2, Eye, FolderOpen, Download, ExternalLink, Check, Copy, Star } from 'lucide-react';
import type { HistoryItem } from '../../types';
import { formatSize, formatTime, isImageFile, extractFirstUrl } from '../../utils/formatters';
import { ClickableText } from '../common/ClickableText';
import type { PreviewImage } from '../../hooks/useDashboardState';
import { isTauri } from '../../services/api';

interface HistoryCardProps {
  item: HistoryItem;
  apiBase: string;
  copiedItem: string | null;
  onPreviewImage: (image: PreviewImage) => void;
  onOpenFile: (filePath?: string) => void;
  onOpenLink: (url: string) => void;
  onCopyText: (id: string, text: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({
  item,
  apiBase,
  copiedItem,
  onPreviewImage,
  onOpenFile,
  onOpenLink,
  onCopyText,
  onToggleFavorite,
}) => {
  const isFile = item.item_type === 'file';
  const isImage = isFile && isImageFile(item.content);
  const fromIphone = item.direction === 'ios_to_win';
  const itemUrl = !isFile ? extractFirstUrl(item.content) : null;
  const viewUrl = `${apiBase}/api/view/${item.id}`;
  const displayDevice = item.device_name || (fromIphone ? 'С телефона' : 'С ПК');

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700/80 rounded-xl p-3.5 transition-colors flex flex-col gap-2.5 group box-border shrink-0">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {isImage ? (
            <span className="p-1 rounded-md bg-blue-500/10 text-blue-400" title="Скриншот / Изображение">
              <Camera className="w-3.5 h-3.5" />
            </span>
          ) : isFile ? (
            <span className="p-1 rounded-md bg-zinc-800 text-zinc-300">
              <FileText className="w-3.5 h-3.5" />
            </span>
          ) : (
            <span className="p-1 rounded-md bg-zinc-800 text-zinc-300">
              <Clipboard className="w-3.5 h-3.5" />
            </span>
          )}

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
              fromIphone
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/50'
                : 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
            }`}
          >
            {displayDevice}
          </span>

          {isFile && item.size && (
            <span className="text-zinc-500 font-mono text-[11px]">{formatSize(item.size)}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(item.id)}
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                item.is_favorite
                  ? 'text-amber-400 hover:text-amber-300'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
              title={item.is_favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              <Star className={`w-3.5 h-3.5 ${item.is_favorite ? 'fill-amber-400' : ''}`} />
            </button>
          )}
          <span className="text-zinc-500 font-mono text-[11px]">{formatTime(item.timestamp)}</span>
        </div>
      </div>

      {/* Content Section: with Thumbnail for Images */}
      {isImage ? (
        <div className="flex items-start gap-3 bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800/60">
          <button
            type="button"
            onClick={() =>
              onPreviewImage({
                url: viewUrl,
                title: item.content,
                size: item.size,
                filePath: item.file_path,
              })
            }
            className="relative group/thumb shrink-0 rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-950 w-24 h-20 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors shadow-sm"
            title="Нажмите для просмотра в полный размер"
          >
            <img
              src={viewUrl}
              alt={item.content}
              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium">
              <Maximize2 className="w-4 h-4" />
            </div>
          </button>

          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
            <div>
              <div
                className="text-sm text-zinc-200 font-mono font-medium truncate select-text"
                title={item.content}
              >
                {item.content}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Нажмите на миниатюру для полноэкранного просмотра
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() =>
                  onPreviewImage({
                    url: viewUrl,
                    title: item.content,
                    size: item.size,
                    filePath: item.file_path,
                  })
                }
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Просмотр</span>
              </button>
              {item.file_path && isTauri && (
                <button
                  onClick={() => onOpenFile(item.file_path)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>В папке</span>
                </button>
              )}
              {!isTauri && (
                <a
                  href={`${apiBase}/api/download/${item.id}`}
                  download={item.content}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-200 font-mono break-all line-clamp-3 select-text bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/50">
          {isFile ? (
            <span>{item.content}</span>
          ) : (
            <ClickableText text={item.content} onOpenLink={onOpenLink} />
          )}
        </div>
      )}

      {/* Bottom Actions for non-images */}
      {!isImage && (
        <div className="flex items-center justify-end gap-2 pt-0.5">
          {isFile ? (
            <>
              {item.file_path && isTauri && (
                <button
                  onClick={() => onOpenFile(item.file_path)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Показать в папке</span>
                </button>
              )}
              {!isTauri && (
                <a
                  href={`${apiBase}/api/download/${item.id}`}
                  download={item.content}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 font-medium px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать</span>
                </a>
              )}
            </>
          ) : (
            <>
              {itemUrl && (
                <button
                  onClick={() => onOpenLink(itemUrl)}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Открыть ссылку в браузере"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Открыть ссылку</span>
                </button>
              )}
              <button
                onClick={() => onCopyText(item.id, item.content)}
                className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white font-medium px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {copiedItem === item.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать в буфер</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
