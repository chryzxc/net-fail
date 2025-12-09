import pkg from "../../package.json";

type TStorageArea = typeof chrome extends undefined
  ? any
  : chrome.storage.StorageArea;

const hasBrowser = typeof (globalThis as any).browser !== "undefined";
const hasChrome = typeof (globalThis as any).chrome !== "undefined";
const KEY =
  pkg && (pkg as any).name
    ? (pkg as any).name + ":persistedUrl"
    : "persistedUrl";

const storageArea: TStorageArea | null = (() => {
  if (hasBrowser) return (globalThis as any).browser.storage.local;
  if (hasChrome) return (globalThis as any).chrome.storage.local;
  return null;
})();

export async function getUrl(): Promise<string | null> {
  if (!storageArea) {
    return Promise.resolve(localStorage.getItem(KEY));
  }
  return new Promise((resolve) => {
    storageArea.get([KEY], (items: any) => {
      resolve(items?.[KEY] ?? null);
    });
  });
}

export async function setUrl(url: string | null): Promise<void> {
  if (!storageArea) {
    if (url === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, url);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    if (url === null) {
      storageArea.remove(KEY, () => resolve());
    } else {
      storageArea.set({ [KEY]: url }, () => resolve());
    }
  });
}

export function onUrlChanged(callback: (newUrl: string | null) => void) {
  const api = (window as any).browser ?? (window as any).chrome;
  if (api?.storage?.onChanged) {
    const listener = (changes: any, areaName: string) => {
      if (areaName !== "local") return;
      if (changes[KEY]) {
        callback(changes[KEY].newValue ?? null);
      }
    };
    api.storage.onChanged.addListener(listener);
    return () => api.storage.onChanged.removeListener(listener);
  }
  return () => {};
}
