export interface HistoryItem {
  id: string;
  item_type: 'clipboard' | 'file';
  content: string;
  size?: number;
  direction: 'win_to_ios' | 'ios_to_win';
  timestamp: number;
  file_path?: string;
}

export interface ConnectedClient {
  id: string;
  client_type: 'mobile' | 'desktop';
  ip: string;
  user_agent: string;
  device_name: string;
  connected_at: number;
}

export interface ServerStatus {
  ip: string;
  available_ips: string[];
  port: number;
  active_clipboard: string;
  connected_clients: number;
  clients: ConnectedClient[];
  download_dir: string;
}

export interface WsEvent {
  type: 'clipboard_update' | 'file_received' | 'client_count' | 'clients_updated' | 'history_updated' | 'force_disconnect';
  payload?: any;
}
