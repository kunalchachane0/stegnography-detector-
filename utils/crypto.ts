
/**
 * StegnoSafe Encryption Module
 * Uses Web Crypto API (AES-GCM) with PBKDF2 key derivation.
 */

const ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string | Uint8Array, password: string): Promise<Uint8Array> {
  const payload = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
  const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));

  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    payload
  );

  const combined = new Uint8Array(SALT_SIZE + IV_SIZE + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_SIZE);
  combined.set(new Uint8Array(ciphertext), SALT_SIZE + IV_SIZE);

  return combined;
}

export async function decryptData(combined: Uint8Array, password: string): Promise<Uint8Array> {
  try {
    const salt = combined.slice(0, SALT_SIZE);
    const iv = combined.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const ciphertext = combined.slice(SALT_SIZE + IV_SIZE);

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new Uint8Array(decrypted);
  } catch (e) {
    throw new Error('Decryption failed. Incorrect password or corrupted data.');
  }
}
