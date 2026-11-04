import React from 'react';
import { Users, Smartphone, UserX, X } from 'lucide-react';
import type { ConnectedClient } from '../../types';
import { formatTime } from '../../utils/formatters';

interface DevicesModalProps {
  clients: ConnectedClient[];
  onClose: () => void;
  onDisconnectClient: (id: string) => void;
  onDisconnectAll: () => void;
}

export const DevicesModal: React.FC<DevicesModalProps> = ({
  clients,
  onClose,
  onDisconnectClient,
  onDisconnectAll,
}) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-100">Подключенные устройства</h3>
              <p className="text-xs text-zinc-400">Активные подключения по Wi-Fi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Devices list */}
        <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto">
          {clients.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center text-zinc-500 text-xs">
              <Smartphone className="w-8 h-8 mb-2 stroke-1 text-zinc-600" />
              <p className="font-medium text-zinc-300">Нет подключенных мобильных устройств</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                Отсканируйте QR-код на смартфоне для подключения
              </p>
            </div>
          ) : (
            clients.map((client: ConnectedClient) => (
              <div
                key={client.id}
                className="bg-zinc-950 p-3 rounded-xl border border-zinc-850 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-200 truncate">
                      {client.device_name}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono truncate">
                      IP: {client.ip} • с {formatTime(client.connected_at)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onDisconnectClient(client.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shrink-0 cursor-pointer"
                  title="Принудительно отключить это устройство"
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Отключить</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-zinc-800 text-xs">
          <span className="text-zinc-400">
            Всего: <b className="text-zinc-100">{clients.length}</b>
          </span>
          {clients.length > 0 && (
            <button
              onClick={onDisconnectAll}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium transition-colors cursor-pointer"
            >
              Отключить всех
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
