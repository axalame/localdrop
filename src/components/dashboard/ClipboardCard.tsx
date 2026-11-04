import React from 'react';
import { Laptop, Camera, ExternalLink, Check, Copy, Send } from 'lucide-react';
import { ClickableText } from '../common/ClickableText';
import { extractFirstUrl } from '../../utils/formatters';

interface ClipboardCardProps {
  activeClipboard: string;
  manualText: string;
  copiedItem: string | null;
  onManualTextChange: (text: string) => void;
  onSendManualText: () => void;
  onPasteFromClipboard: () => void;
  onCopyText: (id: string, text: string) => void;
  onOpenLink: (url: string) => void;
}

export const ClipboardCard: React.FC<ClipboardCardProps> = ({
  activeClipboard,
  manualText,
  copiedItem,
  onManualTextChange,
  onSendManualText,
  onPasteFromClipboard,
  onCopyText,
  onOpenLink,
}) => {
  const activeClipUrl = extractFirstUrl(activeClipboard);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col gap-3.5 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Laptop className="w-4 h-4 text-zinc-400 shrink-0" />
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200 truncate">
            Буфер обмена
          </h2>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono shrink-0 whitespace-nowrap">
          Ctrl+C
        </span>
      </div>

      <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 min-h-[85px] flex flex-col justify-between">
        <div className="text-xs sm:text-[13px] text-zinc-200 line-clamp-3 font-mono select-text break-all whitespace-pre-wrap leading-relaxed">
          {activeClipboard ? (
            activeClipboard.startsWith('📷') ? (
              <div className="flex items-center gap-2 text-zinc-200 font-sans font-medium">
                <Camera className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{activeClipboard}</span>
              </div>
            ) : (
              <ClickableText text={activeClipboard} onOpenLink={onOpenLink} />
            )
          ) : (
            <span className="text-zinc-500 italic text-xs">
              Буфер обмена пуст... Скопируйте текст или сделайте скриншот (Win+Shift+S)
            </span>
          )}
        </div>

        {activeClipboard && (
          <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-xs">
            <span className="text-zinc-500 text-[11px] font-mono shrink-0 whitespace-nowrap">
              {activeClipboard.length} симв.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {activeClipUrl && (
                <button
                  onClick={() => onOpenLink(activeClipUrl)}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
                  title="Открыть ссылку в браузере"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Открыть</span>
                </button>
              )}
              <button
                onClick={() => onCopyText('active', activeClipboard)}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors font-medium cursor-pointer"
              >
                {copiedItem === 'active' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Отправить текст на устройства..."
            value={manualText}
            onChange={(e) => onManualTextChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSendManualText()}
            className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={onSendManualText}
            disabled={!manualText.trim()}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Отправить</span>
          </button>
        </div>

        <button
          onClick={onPasteFromClipboard}
          className="w-full py-2.5 px-3 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl text-xs font-medium text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4 text-blue-400" />
          <span>Вставить скриншот из буфера (Ctrl+V)</span>
        </button>
      </div>
    </div>
  );
};
