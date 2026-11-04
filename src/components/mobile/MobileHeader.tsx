import React from 'react';
import { Clipboard, RefreshCw } from 'lucide-react';

export interface MobileHeaderProps {
  connected: boolean;
  onRefresh: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ connected, onRefresh }) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-4 py-3.5 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
          <Clipboard className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-zinc-100 leading-tight">LocalDrop</h1>
          <p className="text-[11px] text-zinc-400">Прямая связь с Windows</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            connected
              ? 'bg-zinc-800 text-zinc-200 border-zinc-700/60'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/40'
          }`}
        >
          {connected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)] shrink-0"></span>
              <span>На связи</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Офлайн</span>
            </>
          )}
        </div>

        <button
          onClick={onRefresh}
          title="Обновить"
          className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700/60 text-zinc-300 active:bg-zinc-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
