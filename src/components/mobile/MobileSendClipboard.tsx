import React from 'react';
import { Clipboard, Send, Check } from 'lucide-react';

export interface MobileSendClipboardProps {
  sendText: string;
  sentSuccess: boolean;
  onSendTextChange: (text: string) => void;
  onPasteFromIphone: () => void;
  onSendToWindows: () => void;
}

export const MobileSendClipboard: React.FC<MobileSendClipboardProps> = ({
  sendText,
  sentSuccess,
  onSendTextChange,
  onPasteFromIphone,
  onSendToWindows,
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clipboard className="w-4 h-4 text-zinc-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Отправить в буфер Windows
          </h2>
        </div>
        <button
          onClick={onPasteFromIphone}
          className="text-xs text-blue-400 font-medium active:underline"
        >
          Вставить из буфера
        </button>
      </div>

      <textarea
        rows={3}
        placeholder="Введите или вставьте текст/ссылку для ПК..."
        value={sendText}
        onChange={(e) => onSendTextChange(e.target.value)}
        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
      />

      <button
        onClick={onSendToWindows}
        disabled={!sendText.trim()}
        className={`w-full py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
          sentSuccess
            ? 'bg-emerald-600 text-white'
            : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white'
        }`}
      >
        {sentSuccess ? (
          <>
            <Check className="w-4 h-4 text-white" />
            <span>Отправлено! (В буфере ПК)</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Отправить в буфер ПК</span>
          </>
        )}
      </button>
    </div>
  );
};
