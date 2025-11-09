/**
 * Centralized feature flags for safe mode and preview environment
 * Prevents white screen issues by providing safe defaults
 */

// Detect if running in preview/iframe environment
const isPreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('lovable.dev') ||
  window.location.hostname.includes('gptengineer') ||
  window.top !== window // iframe detection
);

// Parse URL parameters
const getUrlParam = (name: string): boolean => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get(name) === '1' || params.get(name) === 'true';
};

// Parse localStorage flags
const getStorageFlag = (name: string, defaultValue: boolean): boolean => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(name);
    if (stored === null) return defaultValue;
    return stored === 'true' || stored === '1';
  } catch {
    return defaultValue;
  }
};

// Set storage flag
export const setStorageFlag = (name: string, value: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(name, value ? 'true' : 'false');
  } catch (e) {
    console.warn(`Failed to set storage flag ${name}:`, e);
  }
};

// Safe mode: disable all potentially problematic features
export const SAFE_MODE = getUrlParam('safe') || getStorageFlag('SAFE_MODE', false);

// Individual flags with preview-safe defaults
export const DISABLE_LAZY = SAFE_MODE || 
  getUrlParam('no-lazy') || 
  getStorageFlag('DISABLE_LAZY', isPreview); // true in preview by default

export const DISABLE_SW = SAFE_MODE || 
  getUrlParam('no-sw') || 
  getStorageFlag('DISABLE_SW', true); // always disabled by default

export const USE_HASH_ROUTER = SAFE_MODE || 
  getUrlParam('hash') || 
  getStorageFlag('USE_HASH_ROUTER', isPreview); // true in preview/iframe

export const LAYOUT_SAFE_MODE = SAFE_MODE || 
  getUrlParam('layout-safe') || 
  getStorageFlag('LAYOUT_SAFE_MODE', false);

export const ROUTE_SMOKE = getUrlParam('smoke') || 
  getStorageFlag('ROUTE_SMOKE', false);

export const SMOKE_MODE = ROUTE_SMOKE;

// Enable safe mode programmatically
export const enableSafeMode = () => {
  setStorageFlag('SAFE_MODE', true);
  setStorageFlag('DISABLE_LAZY', true);
  setStorageFlag('DISABLE_SW', true);
  setStorageFlag('USE_HASH_ROUTER', true);
  window.location.reload();
};

// Disable safe mode
export const disableSafeMode = () => {
  setStorageFlag('SAFE_MODE', false);
  setStorageFlag('DISABLE_LAZY', false);
  setStorageFlag('USE_HASH_ROUTER', false);
  window.location.reload();
};

// Debug info
export const getSafeFlagsInfo = () => ({
  isPreview,
  SAFE_MODE,
  DISABLE_LAZY,
  DISABLE_SW,
  USE_HASH_ROUTER,
  LAYOUT_SAFE_MODE,
  ROUTE_SMOKE,
  SMOKE_MODE,
});

// Log flags on startup
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('🚦 [SafeFlags]', getSafeFlagsInfo());
}
