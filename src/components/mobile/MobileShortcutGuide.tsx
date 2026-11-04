import React from 'react';
import { Zap, ChevronDown, ChevronUp } from 'lucide-react';

export interface MobileShortcutGuideProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const MobileShortcutGuide: React.FC<MobileShortcutGuideProps> = ({
  isOpen,
  onToggle,
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left active:bg-zinc-800/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-zinc-800 text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Быстрая команда iOS (1 клик)</h3>
            <p className="text-[11px] text-zinc-400">Отправка буфера по кнопке или постукиванию</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-4 pt-1 border-t border-zinc-800 bg-zinc-950/60 text-xs text-zinc-300 flex flex-col gap-3">
          <p className="leading-relaxed">
            Вы можете настроить отправку буфера обмена прямо с рабочего стола или через <b>двойное постукивание по задней крышке iPhone</b>:
          </p>
          <ol className="list-decimal pl-4 space-y-1.5 text-zinc-300">
            <li>Откройте приложение <b>Команды</b> на iPhone.</li>
            <li>Создайте действие <b>Получить буфер обмена</b>.</li>
            <li>Добавьте действие <b>Получить содержимое URL</b>:
              <div className="mt-1 font-mono text-[11px] bg-zinc-900 p-2 rounded-lg border border-zinc-800 space-y-0.5">
                <div>Метод: POST</div>
                <div>Заголовок: Content-Type &rarr; application/json</div>
                <div>Тело: JSON {`{"text": [Буфер обмена]}`}</div>
              </div>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};
