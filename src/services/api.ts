import type { HistoryItem, ServerStatus } from '../types';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function fetchServerStatus(apiBase: string = ''): Promise<ServerStatus> {
  if (isTauri) {
    return tauriInvoke<ServerStatus>('get_server_status');
  }
  const res = await fetch(`${apiBase}/api/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchHistory(apiBase: string = ''): Promise<HistoryItem[]> {
  if (isTauri) {
    const items = await tauriInvoke<HistoryItem[]>('get_history');
    return items ? [...items].reverse() : [];
  }
  const res = await fetch(`${apiBase}/api/history`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items: HistoryItem[] = await res.json();
  return items ? [...items].reverse() : [];
}

export async function clearHistoryApi(): Promise<boolean> {
  if (isTauri) {
    return tauriInvoke<boolean>('clear_history');
  }
  const res = await fetch('/api/history/clear', { method: 'POST' });
  return res.ok;
}

export async function toggleFavoriteApi(id: string): Promise<boolean> {
  const res = await fetch('/api/history/favorite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.is_favorite ?? false;
}

export async function copyToClipboardApi(text: string): Promise<boolean> {
  if (isTauri) {
    return tauriInvoke<boolean>('copy_to_clipboard', { text });
  }
  await navigator.clipboard.writeText(text);
  return true;
}

export async function disconnectClientApi(id: string): Promise<boolean> {
  if (isTauri) {
    return tauriInvoke<boolean>('disconnect_client', { id });
  }
  const res = await fetch(`/api/clients/disconnect/${id}`, { method: 'POST' });
  return res.ok;
}

export async function disconnectAllClientsApi(): Promise<boolean> {
  if (isTauri) {
    return tauriInvoke<boolean>('disconnect_all_clients');
  }
  const res = await fetch('/api/clients/disconnect_all', { method: 'POST' });
  return res.ok;
}

export async function setServerIpApi(ip: string): Promise<boolean> {
  if (isTauri) {
    return tauriInvoke<boolean>('set_server_ip', { ip });
  }
  const res = await fetch('/api/set_ip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip }),
  });
  return res.ok;
}

export async function pasteFromClipboardApi(): Promise<HistoryItem | null> {
  if (isTauri) {
    return tauriInvoke<HistoryItem | null>('paste_from_clipboard');
  }
  const res = await fetch('/api/paste', { method: 'POST' });
  const data = await res.json();
  return data.success ? data.item : null;
}

export async function generateQrSvgApi(url: string): Promise<string> {
  if (isTauri) {
    return tauriInvoke<string>('generate_qr_svg', { url });
  }
  return '';
}

export async function openDownloadDirApi(): Promise<boolean> {
  if (isTauri) {
    return tauriInvoke<boolean>('open_download_dir');
  }
  return false;
}

export async function openFileInExplorerApi(filePath: string): Promise<boolean> {
  if (isTauri) {
    return tauriInvoke<boolean>('open_file_in_explorer', { filePath });
  }
  return false;
}

export async function addDroppedFilesApi(paths: string[]): Promise<HistoryItem[]> {
  if (isTauri) {
    return tauriInvoke<HistoryItem[]>('add_dropped_files', { paths });
  }
  return [];
}

export async function uploadFilesApi(files: FileList | File[], port: number): Promise<boolean> {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  const res = await fetch(`http://127.0.0.1:${port}/api/upload?source=windows`, {
    method: 'POST',
    body: formData,
  });
  return res.ok;
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri) {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
      return;
    } catch (err) {
      console.warn('Failed to open external URL with plugin-opener:', err);
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
