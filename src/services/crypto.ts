import { x25519 } from '@noble/curves/ed25519.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

export interface CryptoSession {
  clientPublicKeyB64: string;
  isReady: () => boolean;
  deriveSharedKey: (serverPublicKeyB64: string, saltB64: string) => void;
  encrypt: (plaintext: string) => { nonce: string; ciphertext: string };
  decrypt: (nonceB64: string, ciphertextB64: string) => string;
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

export function initCryptoSession(): CryptoSession {
  const privKey = x25519.utils.randomSecretKey();
  const pubKey = x25519.getPublicKey(privKey);
  const clientPublicKeyB64 = bytesToBase64(pubKey);

  let sessionCipherKey: Uint8Array | null = null;

  return {
    clientPublicKeyB64,

    isReady: () => sessionCipherKey !== null,

    deriveSharedKey: (serverPublicKeyB64: string, saltB64: string) => {
      const serverPubKey = base64ToBytes(serverPublicKeyB64);
      const salt = base64ToBytes(saltB64);

      const sharedSecret = x25519.getSharedSecret(privKey, serverPubKey);

      const derivedKey = hkdf(
        sha256,
        sharedSecret,
        salt,
        new TextEncoder().encode('localdrop-v1-xchacha20poly1305'),
        32
      );

      sessionCipherKey = derivedKey;
    },

    encrypt: (plaintext: string) => {
      if (!sessionCipherKey) {
        throw new Error('Crypto session is not initialized yet');
      }

      const nonce = new Uint8Array(24);
      if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(nonce);
      } else {
        for (let i = 0; i < 24; i++) {
          nonce[i] = Math.floor(Math.random() * 256);
        }
      }

      const cipher = xchacha20poly1305(sessionCipherKey, nonce);
      const plaintextBytes = new TextEncoder().encode(plaintext);
      const ciphertextBytes = cipher.encrypt(plaintextBytes);

      return {
        nonce: bytesToBase64(nonce),
        ciphertext: bytesToBase64(ciphertextBytes),
      };
    },

    decrypt: (nonceB64: string, ciphertextB64: string) => {
      if (!sessionCipherKey) {
        throw new Error('Crypto session is not initialized yet');
      }

      const nonce = base64ToBytes(nonceB64);
      const ciphertext = base64ToBytes(ciphertextB64);

      const cipher = xchacha20poly1305(sessionCipherKey, nonce);
      const decryptedBytes = cipher.decrypt(ciphertext);

      return new TextDecoder().decode(decryptedBytes);
    },
  };
}
