import test from 'node:test';
import assert from 'node:assert/strict';
import { initCryptoSession } from '../src/services/crypto.ts';

test('initCryptoSession generates valid 32-byte X25519 public key base64', () => {
  const session = initCryptoSession();
  assert.ok(session.clientPublicKeyB64);
  const bytes = Buffer.from(session.clientPublicKeyB64, 'base64');
  assert.equal(bytes.length, 32);
});

test('X25519 ECDH + XChaCha20-Poly1305 encrypts and decrypts round-trip', () => {
  const client = initCryptoSession();
  const server = initCryptoSession();

  const saltB64 = Buffer.from('0123456789abcdef').toString('base64');

  client.deriveSharedKey(server.clientPublicKeyB64, saltB64);
  server.deriveSharedKey(client.clientPublicKeyB64, saltB64);

  const originalMessage = 'Confidential LocalDrop payload 🚀';
  const { nonce, ciphertext } = client.encrypt(originalMessage);

  assert.ok(nonce);
  assert.ok(ciphertext);

  const decrypted = server.decrypt(nonce, ciphertext);
  assert.equal(decrypted, originalMessage);
});

test('XChaCha20-Poly1305 rejects tampered ciphertext', () => {
  const client = initCryptoSession();
  const server = initCryptoSession();

  const saltB64 = Buffer.from('fedcba9876543210').toString('base64');
  client.deriveSharedKey(server.clientPublicKeyB64, saltB64);
  server.deriveSharedKey(client.clientPublicKeyB64, saltB64);

  const { nonce, ciphertext } = client.encrypt('unaltered text');

  const buf = Buffer.from(ciphertext, 'base64');
  buf[0] ^= 0xff; // corrupt first byte
  const tamperedCiphertext = buf.toString('base64');

  assert.throws(() => {
    server.decrypt(nonce, tamperedCiphertext);
  });
});
