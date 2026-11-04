import { useState, useEffect, useCallback, useRef } from 'react';
import type { ServerStatus, HistoryItem, WsEvent } from '../types';
import {
  fetchServerStatus,
  fetchHistory,
  clearHistoryApi,
  copyToClipboardApi,
  sendClipboardTextApi,
  toggleFavoriteApi,
  disconnectClientApi,
  disconnectAllClientsApi,
  setServerIpApi,
  pasteFromClipboardApi,
  generateQrSvgApi,
  openDownloadDirApi,
  openFileInExplorerApi,
  addDroppedFilesApi,
  uploadFilesApi,
  openExternalUrl,
  isTauri,
} from '../services/api';
import { createEncryptedWebSocket, type EncryptedWsClient } from '../services/encryptedWs';

export interface PreviewImage {
  url: string;
  title: string;
  size?: number;
  filePath?: string;
}

export function useDashboardState() {
  const [status, setStatus] = useState<ServerStatus>({
    ip: '127.0.0.1',
    available_ips: [],
    port: 52025,
    active_clipboard: '',
    connected_clients: 0,
    clients: [],
    download_dir: '',
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [manualText, setManualText] = useState('');
  const [filter, setFilter] = useState<'all' | 'clipboard' | 'file'>('all');
  const [search, setSearch] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showIpDropdown, setShowIpDropdown] = useState(false);
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
  const [isEncrypted, setIsEncrypted] = useState(false);

  const statusRef = useRef(status);
  const isMountedRef = useRef(true);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const s = await fetchServerStatus();
      if (s) {
        setStatus(s);
        const mobileUrl = `http://${s.ip}:${s.port}`;
        if (isTauri) {
          const svg = await generateQrSvgApi(mobileUrl);
          setQrSvg(svg);
        }
      }

      const h = await fetchHistory();
      if (h) {
        setHistory(h);
      }
    } catch (e) {
      console.error('Failed to load server data:', e);
    }
  }, []);

  // WebSocket real-time subscription
  useEffect(() => {
    const init = async () => {
      try {
        const s = await fetchServerStatus();
        if (!isMountedRef.current) return;
        if (s) {
          setStatus(s);
          const mobileUrl = `http://${s.ip}:${s.port}`;
          if (isTauri) {
            const svg = await generateQrSvgApi(mobileUrl);
            if (isMountedRef.current) setQrSvg(svg);
          }
        }

        const h = await fetchHistory();
        if (isMountedRef.current && h) {
          setHistory(h);
        }
      } catch (e) {
        console.error('Failed to load server data:', e);
      }
    };

    init();

    let encryptedClient: EncryptedWsClient | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const setupWs = () => {
      if (!isMountedRef.current) return;
      const port = statusRef.current.port || 52025;
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = isTauri ? `127.0.0.1:${port}` : (window.location.host || `127.0.0.1:${port}`);
      const wsUrl = `${protocol}//${host}/ws?client_type=desktop`;

      try {
        encryptedClient = createEncryptedWebSocket(
          wsUrl,
          (data: WsEvent) => {
            if (!isMountedRef.current) return;
            if (data.type === 'clipboard_update') {
              setStatus((prev) => ({
                ...prev,
                active_clipboard: data.payload.content,
              }));
              loadData();
            } else if (data.type === 'file_received' || data.type === 'history_updated') {
              loadData();
            } else if (data.type === 'client_count') {
              setStatus((prev) => ({
                ...prev,
                connected_clients: data.payload.count,
              }));
            } else if (data.type === 'clients_updated') {
              setStatus((prev) => ({
                ...prev,
                clients: data.payload.clients,
                connected_clients: data.payload.clients.length,
              }));
            }
          },
          () => {
            if (isMountedRef.current) {
              setIsEncrypted(false);
              reconnectTimeout = setTimeout(setupWs, 2000);
            }
          },
          (enc: boolean) => {
            if (isMountedRef.current) {
              setIsEncrypted(enc);
            }
          }
        );
      } catch {
        if (isMountedRef.current) {
          reconnectTimeout = setTimeout(setupWs, 2000);
        }
      }
    };

    setupWs();

    return () => {
      if (encryptedClient) encryptedClient.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [loadData, status.port]);

  // Actions
  const handleCopyText = async (id: string, text: string) => {
    await copyToClipboardApi(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const handleCopyLink = () => {
    const url = `http://${status.ip}:${status.port}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendManualText = async () => {
    if (!manualText.trim()) return;
    await sendClipboardTextApi(manualText.trim());
    setManualText('');
    await loadData();
  };

  const handleToggleFavorite = useCallback(async (id: string) => {
    setHistory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_favorite: !item.is_favorite } : item))
    );
    try {
      await toggleFavoriteApi(id);
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
      loadData();
    }
  }, [loadData]);

  const handleClearHistory = async () => {
    if (confirm('Очистить всю историю обмена?')) {
      await clearHistoryApi();
      setHistory([]);
    }
  };

  const handleOpenFolder = async () => {
    await openDownloadDirApi();
  };

  const handleOpenFile = async (filePath?: string) => {
    if (!filePath) return;
    await openFileInExplorerApi(filePath);
  };

  const handleOpenLink = async (url: string) => {
    await openExternalUrl(url);
  };

  const handleSelectIp = async (newIp: string) => {
    setShowIpDropdown(false);
    await setServerIpApi(newIp);
    setStatus((prev) => ({ ...prev, ip: newIp }));
    const mobileUrl = `http://${newIp}:${status.port}`;
    if (isTauri) {
      const svg = await generateQrSvgApi(mobileUrl);
      setQrSvg(svg);
    }
  };

  const handleDisconnectClient = async (id: string) => {
    await disconnectClientApi(id);
    loadData();
  };

  const handleDisconnectAll = async () => {
    await disconnectAllClientsApi();
    loadData();
  };

  const handleFileUpload = useCallback(async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    setUploadStatus(`Отправка ${files.length} файл(ов)...`);
    try {
      const ok = await uploadFilesApi(files, statusRef.current.port);
      if (ok) {
        setUploadStatus('Файлы успешно сохранены и отправлены!');
        loadData();
      } else {
        setUploadStatus('Ошибка загрузки файлов');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadStatus('Ошибка сети при загрузке');
    }

    setTimeout(() => {
      setUploadStatus(null);
    }, 3000);
  }, [loadData]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      setUploadStatus('Вставка из буфера...');
      const item = await pasteFromClipboardApi();
      if (item) {
        if (item.item_type === 'file') {
          setUploadStatus(`Скриншот отправлен на iPhone (${item.content})`);
        } else {
          setUploadStatus('Текст из буфера отправлен на iPhone');
        }
        await loadData();
      } else {
        setUploadStatus('Буфер обмена пуст (сделайте скриншот Win+Shift+S)');
      }
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err) {
      console.error('Paste error:', err);
      setUploadStatus('Не удалось прочитать буфер обмена');
      setTimeout(() => setUploadStatus(null), 3000);
    }
  }, [loadData]);

  const handleNativeDroppedFiles = useCallback(async (paths: string[]) => {
    if (!paths || paths.length === 0) return;
    setUploadStatus(`Отправка ${paths.length} файл(ов)...`);
    try {
      const items = await addDroppedFilesApi(paths);
      if (items && items.length > 0) {
        setUploadStatus(`Файлы успешно сохранены и отправлены (${items.length})!`);
      } else {
        setUploadStatus('Файлы успешно сохранены!');
      }
      await loadData();
    } catch (err) {
      console.error('Failed to add dropped files:', err);
      setUploadStatus('Ошибка сохранения файлов');
    }
    setTimeout(() => {
      setUploadStatus(null);
    }, 3000);
  }, [loadData]);

  return {
    status,
    history,
    qrSvg,
    manualText,
    setManualText,
    filter,
    setFilter,
    search,
    setSearch,
    copiedLink,
    copiedItem,
    uploadStatus,
    showDevicesModal,
    setShowDevicesModal,
    showIpDropdown,
    setShowIpDropdown,
    previewImage,
    setPreviewImage,
    loadData,
    isEncrypted,
    handleToggleFavorite,
    handleCopyText,
    handleCopyLink,
    handleSendManualText,
    handleClearHistory,
    handleOpenFolder,
    handleOpenFile,
    handleOpenLink,
    handleSelectIp,
    handleDisconnectClient,
    handleDisconnectAll,
    handleFileUpload,
    handlePasteFromClipboard,
    handleNativeDroppedFiles,
  };
}
