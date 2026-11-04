use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use hkdf::Hkdf;
use sha2::Sha256;
use x25519_dalek::{PublicKey, StaticSecret};

pub struct CryptoSession {
    secret: StaticSecret,
    public_key: PublicKey,
    cipher: Option<XChaCha20Poly1305>,
}

impl CryptoSession {
    pub fn new() -> Self {
        let mut rng = rand::rngs::OsRng;
        let secret = StaticSecret::random_from_rng(&mut rng);
        let public_key = PublicKey::from(&secret);
        Self {
            secret,
            public_key,
            cipher: None,
        }
    }

    pub fn public_key_base64(&self) -> String {
        B64.encode(self.public_key.as_bytes())
    }

    pub fn derive_shared_key(
        &mut self,
        peer_public_key_b64: &str,
        salt: &[u8],
    ) -> Result<(), String> {
        let peer_bytes = B64
            .decode(peer_public_key_b64)
            .map_err(|e| format!("Invalid peer public key base64: {}", e))?;

        if peer_bytes.len() != 32 {
            return Err("Peer public key must be exactly 32 bytes".to_string());
        }

        let mut key_arr = [0u8; 32];
        key_arr.copy_from_slice(&peer_bytes);
        let peer_pk = PublicKey::from(key_arr);

        let shared_secret = self.secret.diffie_hellman(&peer_pk);

        let hk = Hkdf::<Sha256>::new(Some(salt), shared_secret.as_bytes());
        let mut session_key = [0u8; 32];
        hk.expand(b"localdrop-v1-xchacha20poly1305", &mut session_key)
            .map_err(|e| format!("HKDF expand failed: {}", e))?;

        let cipher = XChaCha20Poly1305::new_from_slice(&session_key)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;

        self.cipher = Some(cipher);
        Ok(())
    }

    pub fn encrypt(&self, plaintext: &[u8]) -> Result<(String, String), String> {
        let cipher = self
            .cipher
            .as_ref()
            .ok_or_else(|| "Crypto session key not derived yet".to_string())?;

        let mut nonce_bytes = [0u8; 24];
        rand::RngCore::fill_bytes(&mut rand::rngs::OsRng, &mut nonce_bytes);
        let nonce = XNonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| format!("Encryption error: {}", e))?;

        Ok((B64.encode(nonce_bytes), B64.encode(ciphertext)))
    }

    pub fn decrypt(&self, nonce_b64: &str, ciphertext_b64: &str) -> Result<Vec<u8>, String> {
        let cipher = self
            .cipher
            .as_ref()
            .ok_or_else(|| "Crypto session key not derived yet".to_string())?;

        let nonce_bytes = B64
            .decode(nonce_b64)
            .map_err(|e| format!("Invalid nonce base64: {}", e))?;

        if nonce_bytes.len() != 24 {
            return Err("XNonce must be exactly 24 bytes".to_string());
        }

        let ciphertext = B64
            .decode(ciphertext_b64)
            .map_err(|e| format!("Invalid ciphertext base64: {}", e))?;

        let nonce = XNonce::from_slice(&nonce_bytes);
        let plaintext = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .map_err(|e| format!("Decryption authentication failed: {}", e))?;

        Ok(plaintext)
    }

    pub fn is_initialized(&self) -> bool {
        self.cipher.is_some()
    }
}

impl Default for CryptoSession {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crypto_handshake_and_roundtrip() {
        let mut client = CryptoSession::new();
        let mut server = CryptoSession::new();

        let client_pk_b64 = client.public_key_base64();
        let server_pk_b64 = server.public_key_base64();

        let salt = [42u8; 16];

        assert!(server.derive_shared_key(&client_pk_b64, &salt).is_ok());
        assert!(client.derive_shared_key(&server_pk_b64, &salt).is_ok());

        let message = b"Confidential clipboard payload \xF0\x9F\x94\x90";
        let (nonce_b64, ciphertext_b64) = client.encrypt(message).expect("encryption failed");

        let decrypted = server
            .decrypt(&nonce_b64, &ciphertext_b64)
            .expect("decryption failed");

        assert_eq!(decrypted, message);
    }

    #[test]
    fn test_crypto_tampered_ciphertext_fails_auth() {
        let mut client = CryptoSession::new();
        let mut server = CryptoSession::new();

        let client_pk_b64 = client.public_key_base64();
        let server_pk_b64 = server.public_key_base64();
        let salt = [7u8; 16];

        server.derive_shared_key(&client_pk_b64, &salt).unwrap();
        client.derive_shared_key(&server_pk_b64, &salt).unwrap();

        let (nonce_b64, mut ciphertext_b64) = client.encrypt(b"hello world").unwrap();

        // Tamper with the base64 ciphertext
        let mut bytes = B64.decode(&ciphertext_b64).unwrap();
        if let Some(first) = bytes.first_mut() {
            *first ^= 0xFF;
        }
        ciphertext_b64 = B64.encode(&bytes);

        let result = server.decrypt(&nonce_b64, &ciphertext_b64);
        assert!(result.is_err(), "tampered ciphertext must fail authentication");
    }
}

