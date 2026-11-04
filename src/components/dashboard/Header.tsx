import React from 'react';
import { Clipboard, Smartphone, RefreshCw } from 'lucide-react';
import { IpSelector } from './IpSelector';

interface HeaderProps {
  currentIp: string;
  port: number;
  availableIps: string[];
  connectedClients: number;
  isIpDropdownOpen: boolean;
  onToggleIpDropdown: () => void;
  onSelectIp: (ip: string) => void;
  onOpenDevicesModal: () => void;
  onRefresh: () => void;
  onSwitchToMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentIp,
  port,
  availableIps,
  connectedClients,
  isIpDropdownOpen,
  onToggleIpDropdown,
  onSelectIp,
  onOpenDevicesModal,
  onRefresh,
  onSwitchToMobile,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <Clipboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-zinc-100">LocalDrop</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-medium">
              Windows • Смартфоны • ПК-на-ПК
            </span>
          </div>
          <p className="text-xs text-zinc-400">Обмен буфером обмена и файлами в локальной сети</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {onSwitchToMobile && (
          <button
            onClick={onSwitchToMobile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 border border-zinc-700/70 text-xs font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer"
            title="Посмотреть, как интерфейс отображается на iPhone"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Вид iPhone</span>
          </button>
        )}

        <IpSelector
          currentIp={currentIp}
          port={port}
          availableIps={availableIps}
          isOpen={isIpDropdownOpen}
          onToggle={onToggleIpDropdown}
          onSelectIp={onSelectIp}
        />

        <button
          onClick={onOpenDevicesModal}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            connectedClients > 0
              ? 'bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-750'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850'
          }`}
          title="Управление подключенными устройствами"
        >
          <Smartphone className={`w-3.5 h-3.5 ${connectedClients > 0 ? 'text-blue-400' : 'text-zinc-500'}`} />
          <span>Устройств:</span>
          <span className={`font-semibold ${connectedClients > 0 ? 'text-zinc-100' : 'text-zinc-400'}`}>
            {connectedClients}
          </span>
        </button>

        <button
          onClick={onRefresh}
          title="Обновить данные"
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
