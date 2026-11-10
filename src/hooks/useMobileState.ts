import { useState, useEffect, useCallback, useRef } from 'react';
import type { HistoryItem, ServerStatus, WsEvent } from '../types';
import { createEncryptedWebSocket, type EncryptedWsClient } from '../services/encryptedWs';

export function useMobileState() {
  const [activeClipboard, setActiveClipboard] = useState<string>('');
  const [sendText, setSendText] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [wasKicked, setWasKicked] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [sentSuccess, setSentSuccess] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showShortcutGuide, setShowShortcutGuide] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok && isMountedRef.current) {
        const data: ServerStatus = await res.json();
        setActiveClipboard(data.active_clipboard);
        setConnected(true);
      }
      const histRes = await fetch('/api/history');
      if (histRes.ok && isMountedRef.current) {
        const histData: HistoryItem[] = await histRes.json();
        setHistory(histData.reverse());
      }
    } catch {
      if (isMountedRef.current) {
        setConnected(false);
      }
    }
  }, []);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch('/api/status');
        if (isMountedRef.current && res.ok) {
          const data: ServerStatus = await res.json();
          setActiveClipboard(data.active_clipboard);
          setConnected(true);
        }
        const histRes = await fetch('/api/history');
        if (isMountedRef.current && histRes.ok) {
          const histData: HistoryItem[] = await histRes.json();
          setHistory(histData.reverse());
        }
      } catch {
        if (isMountedRef.current) setConnected(false);
      }
    };

    fetchInitial();

    const host = window.location.host;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${host}/ws?client_type=mobile`;

    let client: EncryptedWsClient | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (!isMountedRef.current) return;
      try {
        client = createEncryptedWebSocket(
          wsUrl,
          (data: WsEvent) => {
            if (data.type === 'clipboard_update') {
              if (isMountedRef.current) {
                setActiveClipboard(data.payload.content);
              }
              loadInitialData();
            } else if (data.type === 'file_received' || data.type === 'history_updated') {
              loadInitialData();
            } else if (data.type === 'force_disconnect') {
              if (isMountedRef.current) {
                setWasKicked(true);
                setConnected(false);
              }
            }
          },
          () => {
            if (isMountedRef.current) {
              setConnected(false);
              if (!wasKicked) {
                reconnectTimer = setTimeout(connect, 3000);
              }
            }
          },
          () => {
            if (isMountedRef.current) {
              setConnected(true);
              setWasKicked(false);
            }
          }
        );
      } catch {
        if (isMountedRef.current) {
          setConnected(false);
          if (!wasKicked) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        }
      }
    };

    connect();

    return () => {
      if (client) client.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [loadInitialData, wasKicked]);

  const handleCopyToIphone = async () => {
    if (!activeClipboard) return;
    try {
      await navigator.clipboard.writeText(activeClipboard);
      setCopiedSuccess(true);
      setTimeout(() => {
        if (isMountedRef.current) setCopiedSuccess(false);
      }, 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = activeClipboard;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedSuccess(true);
      setTimeout(() => {
        if (isMountedRef.current) setCopiedSuccess(false);
      }, 2000);
    }
  };

  const handleSendToWindows = async () => {
    if (!sendText.trim()) return;

    try {
      const res = await fetch('/api/clipboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sendText.trim() }),
      });

      if (res.ok) {
        setSentSuccess(true);
        setSendText('');
        loadInitialData();
        setTimeout(() => {
          if (isMountedRef.current) setSentSuccess(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handlePasteFromIphone = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSendText(text);
      }
    } catch {
      alert('Разрешите вставку из буфера в браузере или вставьте вручную.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadMessage('Загрузка...');

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    e.target.value = '';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && isMountedRef.current) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (!isMountedRef.current) return;
      setUploading(false);
      if (xhr.status === 200) {
        setUploadMessage('Файлы успешно сохранены на ПК!');
        loadInitialData();
      } else {
        setUploadMessage('Ошибка загрузки файлов');
      }
      setTimeout(() => {
        if (isMountedRef.current) setUploadMessage(null);
      }, 3000);
    };

    xhr.onerror = () => {
      if (!isMountedRef.current) return;
      setUploading(false);
      setUploadMessage('Ошибка сети');
      setTimeout(() => {
        if (isMountedRef.current) setUploadMessage(null);
      }, 3000);
    };

    xhr.send(formData);
  };

  return {
    activeClipboard,
    sendText,
    setSendText,
    connected,
    wasKicked,
    setWasKicked,
    copiedSuccess,
    sentSuccess,
    uploading,
    uploadProgress,
    uploadMessage,
    history,
    showShortcutGuide,
    setShowShortcutGuide,
    previewImage,
    setPreviewImage,
    fileInputRef,
    loadInitialData,
    handleCopyToIphone,
    handleSendToWindows,
    handlePasteFromIphone,
    handleFileUpload,
  };
}
