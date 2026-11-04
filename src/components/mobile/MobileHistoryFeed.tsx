import React, { useState } from 'react';
import { FileText, Clipboard, ExternalLink } from 'lucide-react';
import type { HistoryItem } from '../../types';
import { isImageFile, extractFirstUrl } from '../../utils/formatters';

export interface MobileHistoryFeedProps {
  history: HistoryItem[];
  onPreviewImage: (preview: { url: string; title: string }) => void;
}

export const MobileHistoryFeed: React.FC<MobileHistoryFeedProps> = ({
  history,
  onPreviewImage,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (history.length === 0) {
    return null;
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Недавние файлы и тексты
      </h2>
      <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
        {history.slice(0, 15).map((item) => {
          const isFile = item.item_type === 'file';
          const isImage = isFile && isImageFile(item.content);
          const itemUrl = !isFile ? extractFirstUrl(item.content) : null;
          const viewUrl = `/api/view/${item.id}`;
          const isCopied = copiedId === item.id;

          return (
            <div
              key={item.id}
              className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 flex flex-col gap-2 text-xs"
            >
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span className="font-semibold text-zinc-400">
                  {item.direction === 'ios_to_win' ? 'С телефона' : 'С ПК'}
                </span>
                <span>
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {isImage ? (
                /* Image / Screenshot Item */
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onPreviewImage({ url: viewUrl, title: item.content })}
                    className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 cursor-pointer active:scale-95 transition-transform"
                  >
                    <img
                      src={viewUrl}
                      alt={item.content}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <p className="truncate font-mono text-zinc-200 text-xs font-medium">
                      {item.content}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Нажмите на фото для просмотра
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => onPreviewImage({ url: viewUrl, title: item.content })}
                        className="text-blue-400 font-medium cursor-pointer"
                      >
                        Смотреть
                      </button>
                      <span className="text-zinc-600">•</span>
                      <a
                        href={`/api/download/${item.id}`}
                        download={item.content}
                        className="text-zinc-300 font-medium"
                      >
                        Скачать
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                /* Text or generic file */
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isFile ? (
                      <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                    ) : (
                      <Clipboard className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                    <span className="truncate text-zinc-300 font-mono">
                      {item.content}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isFile ? (
                      <a
                        href={`/api/download/${item.id}`}
                        download={item.content}
                        className="text-zinc-300 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-medium"
                      >
                        Скачать
                      </a>
                    ) : (
                      <>
                        {itemUrl && (
                          <a
                            href={itemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-medium flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Открыть</span>
                          </a>
                        )}
                        <button
                          onClick={() => handleCopy(item.id, item.content)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                          }`}
                        >
                          {isCopied ? 'Скопировано!' : 'Копировать'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
