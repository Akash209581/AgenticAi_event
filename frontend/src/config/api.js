/**
 * API & Asset Base URL Configuration
 */

// If VITE_API_BASE_URL is set in environment, use that; otherwise fallback to 'https://vucse.app/cseAI'
const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://vucse.app/cseAI').trim();

// Ensure no trailing slash
export const API_BASE_URL = RAW_API_BASE.replace(/\/+$/, '');

// Get absolute backend domain/origin if VITE_API_BASE_URL contains full protocol/host
export const BACKEND_ORIGIN = (() => {
  if (RAW_API_BASE.startsWith('http://') || RAW_API_BASE.startsWith('https://')) {
    try {
      const u = new URL(RAW_API_BASE);
      return u.origin;
    } catch {
      return '';
    }
  }
  return '';
})();

import { secureStorage } from '../utils/secureStorage';

/**
 * Universal safe API fetch wrapper
 * Prevents HTML 404 / 500 error pages from breaking JSON parsing,
 * throwing user-friendly error messages instead of SyntaxError: Unexpected token '<'
 */
export async function apiFetch(endpoint, options = {}) {
  let url;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    url = endpoint;
  } else {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (cleanEndpoint.startsWith(API_BASE_URL)) {
      url = cleanEndpoint;
    } else {
      url = `${API_BASE_URL}${cleanEndpoint}`;
    }
  }

  // Automatic JWT Header Injection
  const headers = { ...(options.headers || {}) };
  const userToken = secureStorage.getItem('vucse_auth_token') || secureStorage.getItem('vucse_auth_token', true);
  const adminToken = secureStorage.getItem('vucse_admin_token', true) || secureStorage.getItem('vucse_admin_token');

  if (adminToken && !headers['x-admin-token'] && !headers['Authorization']) {
    headers['x-admin-token'] = adminToken;
    headers['Authorization'] = `Bearer ${adminToken}`;
  } else if (userToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${userToken}`;
  }

  const fetchOptions = { ...options, headers };

  // 15-second timeout: prevents login/register from hanging indefinitely
  // when the server is slow, overloaded, or unreachable.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  fetchOptions.signal = controller.signal;

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out (15s). The server may be busy — please try again.');
    }
    throw new Error(`Unable to connect to backend server (${url}). Please check network or server status.`);
  } finally {
    clearTimeout(timeoutId);
  }

  const contentType = response.headers.get('content-type') || '';
  
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    if (response.status === 413) {
      throw new Error(
        `File / Payload size exceeds server limits (Status 413: Request Entity Too Large). ` +
        `Nginx blocked the upload. Please add 'client_max_body_size 50M;' inside your Nginx server block.`
      );
    }
    if (text.trim().startsWith('<')) {
      throw new Error(
        `Server configuration error: Received HTML page instead of JSON API response (Status ${response.status}). ` +
        `Please ensure backend server is running and reverse proxy route '${API_BASE_URL}' is configured.`
      );
    }
    throw new Error(`Unexpected server response (Status ${response.status}): ${text.slice(0, 150)}`);
  }

  const data = await response.json();
  return { response, data };
}

/**
 * Resolves static image & public asset paths based on Vite base URL
 */
export function getAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  
  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Resolves server upload paths (/uploads/posters/...)
 */
export function getUploadUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (BACKEND_ORIGIN) {
    return `${BACKEND_ORIGIN}${cleanPath}`;
  }
  return cleanPath;
}
