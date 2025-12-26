/**
 * Storage utilities for persisting extension data
 * @module lib/storage
 */

import pkg from '../../package.json';

// ============================================================================
// Types
// ============================================================================

type StorageArea = chrome.storage.StorageArea | null;

interface StorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

type StorageChangeListener = (newValue: string | null) => void;

// ============================================================================
// Constants
// ============================================================================

const hasBrowser = typeof globalThis !== 'undefined' && 'browser' in globalThis;
const hasChrome = typeof globalThis !== 'undefined' && 'chrome' in globalThis;

const KEY = pkg?.name
  ? `${pkg.name}:persistedUrl`
  : 'net-fail:persistedUrl';

// ============================================================================
// Storage Area Detection
// ============================================================================

/**
 * Gets the appropriate storage area for the current environment
 */
function getStorageArea(): StorageArea {
  if (hasBrowser) {
    return (globalThis as unknown as { browser: { storage: { local: StorageArea } } })
      .browser.storage.local;
  }
  if (hasChrome && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

const storageArea = getStorageArea();

// ============================================================================
// URL Persistence
// ============================================================================

/**
 * Gets the persisted URL filter from storage
 * @returns Promise with the URL or null
 */
export async function getUrl(): Promise<string | null> {
  if (!storageArea) {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    storageArea.get([KEY], (items: Record<string, unknown>) => {
      if (chrome.runtime.lastError) {
        console.error('Storage get error:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      resolve((items?.[KEY] as string) ?? null);
    });
  });
}

/**
 * Sets the persisted URL filter in storage
 * @param url - URL to persist, or null to clear
 */
export async function setUrl(url: string | null): Promise<void> {
  // Validate URL before storing (basic sanitization)
  const sanitizedUrl = url?.trim().slice(0, 2048) ?? null;

  if (!storageArea) {
    try {
      if (sanitizedUrl === null) {
        localStorage.removeItem(KEY);
      } else {
        localStorage.setItem(KEY, sanitizedUrl);
      }
    } catch (error) {
      console.error('LocalStorage error:', error);
    }
    return;
  }

  return new Promise((resolve, reject) => {
    if (sanitizedUrl === null) {
      storageArea.remove(KEY, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    } else {
      storageArea.set({ [KEY]: sanitizedUrl }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    }
  });
}

/**
 * Subscribes to URL changes in storage
 * @param callback - Function to call when URL changes
 * @returns Unsubscribe function
 */
export function onUrlChanged(callback: StorageChangeListener): () => void {
  // Try browser API first, then chrome
  const api = hasBrowser
    ? (globalThis as unknown as { browser: typeof chrome }).browser
    : hasChrome
      ? chrome
      : null;

  if (!api?.storage?.onChanged) {
    return () => { };
  }

  const listener = (
    changes: Record<string, StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'local') return;
    if (KEY in changes) {
      callback((changes[KEY].newValue as string) ?? null);
    }
  };

  api.storage.onChanged.addListener(listener);
  return () => api.storage.onChanged.removeListener(listener);
}

// ============================================================================
// Generic Storage Utilities
// ============================================================================

/**
 * Gets a value from storage
 * @param key - Storage key
 * @returns Promise with the value or null
 */
export async function getValue<T>(key: string): Promise<T | null> {
  if (!storageArea) {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    storageArea.get([key], (items: Record<string, unknown>) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve((items?.[key] as T) ?? null);
    });
  });
}

/**
 * Sets a value in storage
 * @param key - Storage key
 * @param value - Value to store
 */
export async function setValue<T>(key: string, value: T): Promise<void> {
  if (!storageArea) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('LocalStorage error:', error);
    }
    return;
  }

  return new Promise((resolve, reject) => {
    storageArea.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Removes a value from storage
 * @param key - Storage key
 */
export async function removeValue(key: string): Promise<void> {
  if (!storageArea) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage error:', error);
    }
    return;
  }

  return new Promise((resolve, reject) => {
    storageArea.remove(key, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}
