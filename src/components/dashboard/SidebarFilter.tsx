import React from 'react';
import {
  LayoutGrid,
  Star,
  FileText,
  AlignLeft,
  Image as ImageIcon,
  File,
  ExternalLink,
  Code,
  MonitorSmartphone,
  Laptop,
  Smartphone,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { ContentType, TagType } from '../../types';

export interface SidebarFilterProps {
  activeCategory: 'all' | 'favorites';
  onSelectCategory: (cat: 'all' | 'favorites') => void;
  selectedType: 'all' | ContentType;
  onSelectType: (t: 'all' | ContentType) => void;
  selectedTag: 'all' | TagType;
  onSelectTag: (t: 'all' | TagType) => void;
  selectedSource: 'all' | string;
  onSelectSource: (s: 'all' | string) => void;
  selectedTime: 'all' | 'today' | 'yesterday' | 'week';
  onSelectTime: (t: 'all' | 'today' | 'yesterday' | 'week') => void;
  counts: {
    all: number;
    favorites: number;
    text: number;
    rich_text: number;
    image: number;
    file: number;
    link: number;
    code: number;
  };
  availableSources: string[];
  isEncrypted?: boolean;
}

export const SidebarFilter: React.FC<SidebarFilterProps> = ({
  activeCategory,
  onSelectCategory,
  selectedType,
  onSelectType,
  selectedTag,
  onSelectTag,
  selectedSource,
  onSelectSource,
  selectedTime,
  onSelectTime,
  counts,
  availableSources,
  isEncrypted = true,
}) => {
  const renderItem = (
    label: string,
    icon: React.ReactNode,
    isActive: boolean,
    onClick: () => void,
    badge?: number
  ) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
        isActive
          ? 'bg-blue-600 text-white font-semibold shadow-sm'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-zinc-400'}`}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            isActive ? 'bg-blue-700 text-white' : 'bg-zinc-800 text-zinc-500'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <aside className="w-44 md:w-48 xl:w-54 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3 flex flex-col gap-3 shrink-0 text-xs shadow-md h-full overflow-hidden">
      {/* Encryption badge */}
      {isEncrypted && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[11px] font-medium shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span className="truncate">XChaCha20-Poly1305</span>
        </div>
      )}

      {/* Scrollable filter list */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-3.5 pr-1">
        {/* Primary Category: All & Favorites */}
        <div className="flex flex-col gap-1 shrink-0">
          {renderItem('Все', <LayoutGrid className="w-4 h-4" />, activeCategory === 'all' && selectedType === 'all' && selectedTag === 'all', () => {
            onSelectCategory('all');
            onSelectType('all');
            onSelectTag('all');
          }, counts.all)}
          {renderItem('Избранное', <Star className="w-4 h-4" />, activeCategory === 'favorites', () => {
            onSelectCategory('favorites');
            onSelectType('all');
            onSelectTag('all');
          }, counts.favorites)}
        </div>

        {/* TYPE */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="px-3 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Тип</span>
          {renderItem('Текст', <FileText className="w-4 h-4" />, selectedType === 'text', () => onSelectType(selectedType === 'text' ? 'all' : 'text'), counts.text)}
          {renderItem('Форматированный текст', <AlignLeft className="w-4 h-4" />, selectedType === 'rich_text', () => onSelectType(selectedType === 'rich_text' ? 'all' : 'rich_text'), counts.rich_text)}
          {renderItem('Изображение', <ImageIcon className="w-4 h-4" />, selectedType === 'image', () => onSelectType(selectedType === 'image' ? 'all' : 'image'), counts.image)}
          {renderItem('Файл', <File className="w-4 h-4" />, selectedType === 'file', () => onSelectType(selectedType === 'file' ? 'all' : 'file'), counts.file)}
        </div>

        {/* TAG */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="px-3 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Тег</span>
          {renderItem('Ссылка', <ExternalLink className="w-4 h-4" />, selectedTag === 'link', () => onSelectTag(selectedTag === 'link' ? 'all' : 'link'), counts.link)}
          {renderItem('Код', <Code className="w-4 h-4" />, selectedTag === 'code', () => onSelectTag(selectedTag === 'code' ? 'all' : 'code'), counts.code)}
          {renderItem('Изображение', <ImageIcon className="w-4 h-4" />, selectedTag === 'image', () => onSelectTag(selectedTag === 'image' ? 'all' : 'image'), counts.image)}
        </div>

        {/* SOURCE */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="px-3 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Источник</span>
          {renderItem('Все источники', <MonitorSmartphone className="w-4 h-4" />, selectedSource === 'all', () => onSelectSource('all'))}
          {availableSources.map((src) => {
            const isPhone = /iPhone|Android|Mobile/i.test(src);
            const icon = isPhone ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />;
            return (
              <React.Fragment key={src}>
                {renderItem(src, icon, selectedSource === src, () => onSelectSource(selectedSource === src ? 'all' : src))}
              </React.Fragment>
            );
          })}
        </div>

        {/* TIME */}
        <div className="flex flex-col gap-1 shrink-0">
          <span className="px-3 text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">Время</span>
          {renderItem('За всё время', <Clock className="w-4 h-4" />, selectedTime === 'all', () => onSelectTime('all'))}
          {renderItem('Сегодня', <Clock className="w-4 h-4" />, selectedTime === 'today', () => onSelectTime('today'))}
          {renderItem('Вчера', <Clock className="w-4 h-4" />, selectedTime === 'yesterday', () => onSelectTime('yesterday'))}
          {renderItem('На этой неделе', <Clock className="w-4 h-4" />, selectedTime === 'week', () => onSelectTime('week'))}
        </div>
      </div>
    </aside>
  );
};
