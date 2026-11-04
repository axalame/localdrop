import React from 'react';
import { Smartphone, Copy, Check } from 'lucide-react';

interface QrCardProps {
  qrSvg: string;
  mobileUrl: string;
  isCopiedLink: boolean;
  onCopyLink: () => void;
}

export const QrCard: React.FC<QrCardProps> = ({
  qrSvg,
  mobileUrl,
  isCopiedLink,
  onCopyLink,
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200">
            Подключение смартфона (iPhone / Android)
          </h2>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
          Wi-Fi локальная сеть
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
        <div className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-center shrink-0 border border-zinc-700/50">
          {qrSvg ? (
            <div
              className="w-36 h-36 [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="w-36 h-36 flex items-center justify-center text-zinc-500 text-xs">
              Генерация QR...
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3 text-center sm:text-left overflow-hidden">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Наведите камеру <span className="font-semibold text-white">iPhone или Android</span> на QR-код для открытия в браузере Safari или Chrome.
          </p>

          <div className="w-full flex items-center gap-2 bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300 group overflow-hidden">
            <span className="truncate flex-1 min-w-0">{mobileUrl}</span>
            <button
              onClick={onCopyLink}
              title="Скопировать ссылку"
              className="text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              {isCopiedLink ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className="text-amber-400 font-bold">⚡</span>
            <span>Поддерживает Быстрые команды iOS (Shortcuts)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
