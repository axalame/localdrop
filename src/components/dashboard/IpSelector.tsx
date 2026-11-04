import React from 'react';
import { Wifi, ChevronDown, Check } from 'lucide-react';

interface IpSelectorProps {
  currentIp: string;
  port: number;
  availableIps: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectIp: (ip: string) => void;
}

export const IpSelector: React.FC<IpSelectorProps> = ({
  currentIp,
  port,
  availableIps,
  isOpen,
  onToggle,
  onSelectIp,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 transition-colors cursor-pointer"
        title="Выбрать сетевой адрес"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <Wifi className="w-3.5 h-3.5 text-zinc-400" />
        <span className="font-mono font-medium text-zinc-200">
          {currentIp}:{port}
        </span>
        {availableIps.length > 1 && <ChevronDown className="w-3 h-3 text-zinc-400" />}
      </button>

      {isOpen && availableIps.length > 1 && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl p-1.5 z-30 flex flex-col gap-1">
          <div className="text-[11px] font-semibold text-zinc-400 px-2 py-1 uppercase">
            Сетевые адаптеры:
          </div>
          {availableIps.map((ip) => (
            <button
              key={ip}
              onClick={() => onSelectIp(ip)}
              className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                ip === currentIp
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span>{ip}</span>
              {ip === currentIp && <Check className="w-3 h-3 text-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
