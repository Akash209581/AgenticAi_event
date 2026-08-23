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

/**
 * Recursively strips huge base64/file payload strings from objects before persisting to storage
 */
function sanitizeForStorage(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForStorage);

  const clean = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      // Omit/truncate massive base64 strings or fileData blobs (>20KB)
      if (val.length > 20000 || (val.startsWith('data:') && val.includes('base64,'))) {
        clean[key] = key === 'fileData' || key === 'posterFile' ? '[STORED_ON_SERVER]' : val.slice(0, 500) + '...[TRUNCATED]';
      } else {
        clean[key] = val;
      }
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeForStorage(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const secureStorage = {
  /**
   * Set item encrypted in storage with quota crash prevention & auto-sanitization
   */
  setItem(key, value, isSession = false) {
    const storage = isSession ? sessionStorage : localStorage;
    const encKey = '_v_enc_' + btoa(key).replace(/=/g, '');

    let processedValue = value;
    if (typeof value === 'object' && value !== null) {
      processedValue = sanitizeForStorage(value);
    }

    const stringVal = typeof processedValue === 'object' ? JSON.stringify(processedValue) : String(processedValue);
    const encVal = encrypt(stringVal);

    try {
      storage.setItem(encKey, encVal);
    } catch (e) {
      console.warn(`[secureStorage] Local storage setItem failed for key "${key}":`, e);
      // Fallback: try sessionStorage if localStorage fails (e.g. QuotaExceededError)
      try {
        sessionStorage.setItem(encKey, encVal);
      } catch (sessionErr) {
        console.warn(`[secureStorage] Session storage fallback also failed for key "${key}":`, sessionErr);
      }
    }

    // Clean up legacy unencrypted key if it exists
    try {
      if (storage.getItem(key)) {
        storage.removeItem(key);
      }
    } catch (_) {}
  },

  /**
   * Get decrypted item from storage
   */
  getItem(key, isSession = false) {
    try {
      const storage = isSession ? sessionStorage : localStorage;
      const encKey = '_v_enc_' + btoa(key).replace(/=/g, '');

      let raw = storage.getItem(encKey);
      if (!raw) {
        // Fallback check in sessionStorage
        try {
          raw = sessionStorage.getItem(encKey);
        } catch (_) {}
      }

      // Check legacy unencrypted fallback
      if (!raw) {
        try {
          const legacyRaw = storage.getItem(key);
          if (legacyRaw) return legacyRaw;
        } catch (_) {}
        return null;
      }

      return decrypt(raw);
    } catch (e) {
      console.warn(`[secureStorage] getItem failed for key "${key}":`, e);
      return null;
    }
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
    try {
      const storage = isSession ? sessionStorage : localStorage;
      const encKey = '_v_enc_' + btoa(key).replace(/=/g, '');
      storage.removeItem(encKey);
      storage.removeItem(key); // Also clear legacy unencrypted key
    } catch (_) {}
    try {
      const encKey = '_v_enc_' + btoa(key).replace(/=/g, '');
      sessionStorage.removeItem(encKey);
    } catch (_) {}
  }
};
