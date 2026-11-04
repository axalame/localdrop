import React from 'react';
import { Laptop, Camera, ExternalLink, Check, Copy } from 'lucide-react';
import { ClickableText } from '../common/ClickableText';
import { extractFirstUrl } from '../../utils/formatters';

export interface MobileIncomingClipboardProps {
  activeClipboard: string;
  copiedSuccess: boolean;
  onCopyToIphone: () => void;
}

export const MobileIncomingClipboard: React.FC<MobileIncomingClipboardProps> = ({
  activeClipboard,
  copiedSuccess,
  onCopyToIphone,
}) => {
  const activeClipUrl = extractFirstUrl(activeClipboard);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Laptop className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Буфер с Windows (ПК)
          </h2>
        </div>
        {activeClipboard && (
          <span className="text-[11px] text-zinc-500 font-mono">
            {activeClipboard.length} симв.
          </span>
        )}
      </div>

      <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 min-h-[75px] max-h-48 overflow-y-auto">
        {activeClipboard ? (
          activeClipboard.startsWith('📷') ? (
            <div className="flex items-center gap-2 text-zinc-200 text-sm font-medium">
              <Camera className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{activeClipboard}</span>
            </div>
          ) : (
            <p className="text-sm font-mono text-zinc-200 select-text break-all whitespace-pre-wrap">
              <ClickableText text={activeClipboard} />
            </p>
          )
        ) : (
          <p className="text-xs text-zinc-500 italic text-center py-3">
            Скопируйте текст или сделайте скриншот (Win+Shift+S) на ПК!
          </p>
        )}
      </div>

      {activeClipUrl && (
        <a
          href={activeClipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-blue-400 flex items-center justify-center gap-1.5 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Открыть ссылку в Safari</span>
        </a>
      )}

      <button
        onClick={onCopyToIphone}
        disabled={!activeClipboard}
        className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
          copiedSuccess
            ? 'bg-emerald-600 text-white'
            : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'
        }`}
      >
        {copiedSuccess ? (
          <>
            <Check className="w-4 h-4 text-white" />
            <span>Скопировано в буфер iPhone!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Скопировать в буфер iPhone</span>
          </>
        )}
      </button>
    </div>
  );
};
