import React, { useState } from 'react';
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
  const [isBlurred, setIsBlurred] = useState(true);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Smartphone className="w-4 h-4 text-blue-500 shrink-0" />
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200 truncate">
            Подключение
          </h2>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium shrink-0 whitespace-nowrap">
          Локальная сеть
        </span>
      </div>

      <div className="flex flex-col items-center gap-2.5 pt-0.5 text-center">
        {/* QR container with frosted glass effect and light transparency */}
        <div
          onClick={() => setIsBlurred((prev) => !prev)}
          className="relative group overflow-hidden bg-white p-2.5 rounded-2xl shadow-md border border-zinc-200/80 flex items-center justify-center shrink-0 cursor-pointer select-none transition-all duration-300 hover:shadow-lg"
          title={isBlurred ? 'Нажмите, чтобы показать QR-код' : 'Нажмите, чтобы скрыть QR-код'}
        >
          {qrSvg ? (
            <div
              className={`w-28 h-28 sm:w-32 sm:h-32 [&>svg]:w-full [&>svg]:h-full transition-all duration-300 ease-out ${
                isBlurred
                  ? 'filter blur-[5px] scale-[0.98] opacity-75'
                  : 'filter blur-0 scale-100 opacity-100'
              }`}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          ) : (
            <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center text-zinc-500 text-xs">
              Генерация QR...
            </div>
          )}

          {/* Frosted glass surface overlay with light transparency */}
          <div
            className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300 ease-out ${
              isBlurred
                ? 'opacity-100 backdrop-blur-[1px] bg-white/10 border border-white/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(0,0,0,0.03)]'
                : 'opacity-0 backdrop-blur-none bg-transparent border-transparent'
            }`}
          />
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed px-1">
          Наведите камеру смартфона на QR-код или откройте ссылку в браузере:
        </p>

        <div className="w-full flex items-center gap-2 bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800 text-xs font-mono text-zinc-300 group overflow-hidden">
          <span className="truncate flex-1 min-w-0 text-left">{mobileUrl}</span>
          <button
            onClick={onCopyLink}
            title="Скопировать ссылку"
            className="text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer p-0.5"
          >
            {isCopiedLink ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
