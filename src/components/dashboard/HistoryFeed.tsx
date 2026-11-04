import React from 'react';
import { Search, FolderOpen, Trash2, Clipboard } from 'lucide-react';
import type { HistoryItem } from '../../types';
import { HistoryCard } from './HistoryCard';
import type { PreviewImage } from '../../hooks/useDashboardState';

interface HistoryFeedProps {
  history: HistoryItem[];
  filter: 'all' | 'clipboard' | 'file';
  search: string;
  apiBase: string;
  copiedItem: string | null;
  onFilterChange: (filter: 'all' | 'clipboard' | 'file') => void;
  onSearchChange: (search: string) => void;
  onOpenFolder: () => void;
  onClearHistory: () => void;
  onPreviewImage: (image: PreviewImage) => void;
  onOpenFile: (filePath?: string) => void;
  onOpenLink: (url: string) => void;
  onCopyText: (id: string, text: string) => void;
}

export const HistoryFeed: React.FC<HistoryFeedProps> = ({
  history,
  filter,
  search,
  apiBase,
  copiedItem,
  onFilterChange,
  onSearchChange,
  onOpenFolder,
  onClearHistory,
  onPreviewImage,
  onOpenFile,
  onOpenLink,
  onCopyText,
}) => {
  const filteredHistory = history.filter((item) => {
    if (filter !== 'all' && item.item_type !== filter) return false;
    if (search.trim()) {
      return item.content.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col flex-1 h-full min-h-[560px]">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-zinc-100">История обмена</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
            {filteredHistory.length}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Поиск по истории..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <button
            onClick={onOpenFolder}
            title="Открыть папку загрузок"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors shrink-0 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">Папка LocalDrop</span>
          </button>

          <button
            onClick={onClearHistory}
            title="Очистить историю"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 text-zinc-400 text-xs font-medium transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Очистить</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 py-3 border-b border-zinc-800 text-xs font-medium">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'all'
              ? 'bg-blue-600 text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => onFilterChange('clipboard')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'clipboard'
              ? 'bg-blue-600 text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          Буфер
        </button>
        <button
          onClick={() => onFilterChange('file')}
          className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            filter === 'file'
              ? 'bg-blue-600 text-white font-medium'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          Файлы и фото
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 flex flex-col gap-3 pt-3 pr-3.5 pb-3">
        {filteredHistory.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 py-12 text-sm">
            <Clipboard className="w-9 h-9 mb-2 stroke-1 text-zinc-600" />
            <p>История пока пуста</p>
            <p className="text-xs text-zinc-600 mt-1">Скопируйте текст или сделайте скриншот (Win+Shift+S)</p>
          </div>
        ) : (
          filteredHistory.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              apiBase={apiBase}
              copiedItem={copiedItem}
              onPreviewImage={onPreviewImage}
              onOpenFile={onOpenFile}
              onOpenLink={onOpenLink}
              onCopyText={onCopyText}
            />
          ))
        )}
      </div>
    </div>
  );
};
