/**
 * Cryptographic utility for e-Rapor data encryption & integrity verification
 * Uses browser-native Web Crypto API (AES-GCM + PBKDF2)
 */

const DEFAULT_SALT = 'erapor-pintar-merdeka-security-salt-2024';

// Helper to hash password using SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + DEFAULT_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive AES-GCM Key from a Passphrase
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPackage {
  version: string;
  timestamp: string;
  iv: string; // Base64
  salt: string; // Base64
  cipherText: string; // Base64
  checksum: string; // SHA-256 of plain text
}

// Encrypt arbitrary data object with AES-GCM
export async function encryptData(data: unknown, passphrase = 'ERAPOR_SECURE_STORAGE_KEY_2025'): Promise<EncryptedPackage> {
  const text = JSON.stringify(data);
  const enc = new TextEncoder();
  const plainBytes = enc.encode(text);

  // Compute checksum
  const checkBuf = await crypto.subtle.digest('SHA-256', plainBytes);
  const checksum = Array.from(new Uint8Array(checkBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    plainBytes
  );

  const toB64 = (arr: Uint8Array) => btoa(String.fromCharCode(...arr));

  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    iv: toB64(iv),
    salt: toB64(salt),
    cipherText: toB64(new Uint8Array(cipherBuffer)),
    checksum,
  };
}

// Decrypt encrypted package
export async function decryptData<T>(pkg: EncryptedPackage, passphrase = 'ERAPOR_SECURE_STORAGE_KEY_2025'): Promise<T> {
  const fromB64 = (str: string) => new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
  const iv = fromB64(pkg.iv);
  const salt = fromB64(pkg.salt);
  const cipherBytes = fromB64(pkg.cipherText);

  const key = await deriveKey(passphrase, salt);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    cipherBytes
  );

  const dec = new TextDecoder();
  const plainText = dec.decode(decryptedBuffer);

  // Validate checksum
  const enc = new TextEncoder();
  const checkBuf = await crypto.subtle.digest('SHA-256', enc.encode(plainText));
  const calcCheck = Array.from(new Uint8Array(checkBuf)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (calcCheck !== pkg.checksum) {
    throw new Error('Integritas data gagal: data terkorupsi atau telah dimodifikasi secara ilegal!');
  }

  return JSON.parse(plainText) as T;
}
