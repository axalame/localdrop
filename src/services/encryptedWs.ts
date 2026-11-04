import { initCryptoSession, type CryptoSession } from './crypto';
import type { WsEvent } from '../types';

export interface EncryptedWsClient {
  send: (payload: unknown) => void;
  close: () => void;
  isEncrypted: () => boolean;
}

export function createEncryptedWebSocket(
  url: string,
  onEvent: (event: WsEvent) => void,
  onClose?: () => void,
  onEncryptionStateChange?: (encrypted: boolean) => void
): EncryptedWsClient {
  const crypto: CryptoSession = initCryptoSession();
  let ws: WebSocket | null = null;
  let isEncrypted = false;

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      // Send handshake initiation with client's ephemeral public key
      const initFrame = {
        type: 'handshake_init',
        client_pk: crypto.clientPublicKeyB64,
      };
      ws?.send(JSON.stringify(initFrame));
    };

    ws.onmessage = (msgEvent) => {
      try {
        const raw = typeof msgEvent.data === 'string' ? msgEvent.data : '';
        const parsed = JSON.parse(raw);

        // 1. Handshake response
        if (parsed.type === 'handshake_ack' && parsed.server_pk && parsed.salt) {
          crypto.deriveSharedKey(parsed.server_pk, parsed.salt);
          isEncrypted = true;
          onEncryptionStateChange?.(true);
          return;
        }

        // 2. Encrypted envelope
        if (parsed.type === 'encrypted_envelope' && parsed.nonce && parsed.ciphertext) {
          if (crypto.isReady()) {
            const decryptedJson = crypto.decrypt(parsed.nonce, parsed.ciphertext);
            const event: WsEvent = JSON.parse(decryptedJson);
            onEvent(event);
          }
          return;
        }

        // 3. Fallback unencrypted message (e.g. legacy or pre-handshake clipboard update)
        onEvent(parsed as WsEvent);
      } catch (err) {
        console.warn('Failed to process WebSocket frame:', err);
      }
    };

    ws.onclose = () => {
      isEncrypted = false;
      onEncryptionStateChange?.(false);
      onClose?.();
    };

    ws.onerror = () => {
      ws?.close();
    };
  } catch {
    onClose?.();
  }

  return {
    send: (payload: unknown) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const str = JSON.stringify(payload);
      if (isEncrypted && crypto.isReady()) {
        const { nonce, ciphertext } = crypto.encrypt(str);
        ws.send(JSON.stringify({ type: 'encrypted_envelope', nonce, ciphertext }));
      } else {
        ws.send(str);
      }
    },
    close: () => {
      if (ws) ws.close();
    },
    isEncrypted: () => isEncrypted,
  };
}
