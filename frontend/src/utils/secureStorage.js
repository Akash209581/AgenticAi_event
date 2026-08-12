/**
 * Secure Storage Utility
 * Encrypts sensitive keys and values before persisting to localStorage / sessionStorage.
 * Prevents plain text exposure of Tokens, PII, and User objects in Browser DevTools.
 */

// Domain-bound secret encryption key
const STORAGE_KEY_SECRET = 'VUCSE_2026_SECURE_VAULT_KEY_@#$';

/**
 * Obfuscates / encrypts text using a UTF-8 aware XOR stream cipher and Base64
 */
function encrypt(text) {
  if (!text) return '';
  try {
    const textBytes = new TextEncoder().encode(String(text));
    const keyBytes = new TextEncoder().encode(STORAGE_KEY_SECRET);
    const encrypted = new Uint8Array(textBytes.length);

    for (let i = 0; i < textBytes.length; i++) {
      encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    // Convert binary array to base64 safely
    let binary = '';
    const len = encrypted.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(encrypted[i]);
    }
    return '_enc_sec_v1_' + btoa(binary);
  } catch (e) {
    console.error('Encryption failed:', e);
    return text;
  }
}

/**
 * Decrypts obfuscated / encrypted string
 */
function decrypt(cipherText) {
  if (!cipherText) return null;
  if (!cipherText.startsWith('_enc_sec_v1_')) {
    // Return legacy unencrypted text as fallback
    return cipherText;
  }

  try {
    const base64Data = cipherText.replace('_enc_sec_v1_', '');
    const binary = atob(base64Data);
    const encryptedBytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      encryptedBytes[i] = binary.charCodeAt(i);
    }

    const keyBytes = new TextEncoder().encode(STORAGE_KEY_SECRET);
    const decryptedBytes = new Uint8Array(encryptedBytes.length);

    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    return new TextDecoder().decode(decryptedBytes);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}

export const secureStorage = {
  /**
   * Set item encrypted in storage
   */
  setItem(key, value, isSession = false) {
    const storage = isSession ? sessionStorage : localStorage;
    const encKey = '_v_enc_' + btoa(key).replace(/=/g, '');
    const stringVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    const encVal = encrypt(stringVal);
    storage.setItem(encKey, encVal);

    // Clean up legacy unencrypted key if it exists
    if (storage.getItem(key)) {
      storage.removeItem(key);
    }
  },

  /**
   * Get decrypted item from storage
   */
  getItem(key, isSession = false) {
    const storage = isSession ? sessionStorage : localStorage;
    const encKey = '_v_enc_' + btoa(key).replace(/=/g, '');

    let raw = storage.getItem(encKey);
    
    // Check legacy unencrypted fallback
    if (!raw) {
      const legacyRaw = storage.getItem(key);
      if (legacyRaw) return legacyRaw;
      return null;
    }

    return decrypt(raw);
  },

  /**
   * Get decrypted JSON object from storage
   */
  getJSON(key, isSession = false) {
    const val = this.getItem(key, isSession);
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  },

  /**
   * Remove item from storage
   */
  removeItem(key, isSession = false) {
    const storage = isSession ? sessionStorage : localStorage;
    const encKey = '_v_enc_' + btoa(key).replace(/=/g, '');
    storage.removeItem(encKey);
    storage.removeItem(key); // Also clear legacy unencrypted key
  }
};
