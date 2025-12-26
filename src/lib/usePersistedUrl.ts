/**
 * Hook for persisting URL filter across sessions
 * @module lib/usePersistedUrl
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { getUrl, setUrl as storageSetUrl, onUrlChanged } from '@/lib/storage';
import { debounce } from '@/lib/utils';

/**
 * Persists URL filter to storage and syncs across tabs
 * @param initial - Initial URL value
 * @returns URL state and handlers
 */
export function usePersistedUrl(initial = '') {
  const [url, setUrlState] = useState<string>(initial);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // Load initial value from storage
  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);

    getUrl()
      .then((stored) => {
        if (!mountedRef.current) return;
        if (stored !== null) {
          setUrlState(stored);
        }
      })
      .catch((error) => {
        console.error('Failed to load persisted URL:', error);
      })
      .finally(() => {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      });

    // Subscribe to changes from other tabs
    const unsubscribe = onUrlChanged((newUrl) => {
      if (mountedRef.current) {
        setUrlState(newUrl ?? '');
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  // Debounced storage update
  const debouncedSave = useCallback(
    debounce((value: string) => {
      storageSetUrl(value || null).catch((error) => {
        console.error('Failed to persist URL:', error);
      });
    }, 300),
    []
  );

  // Set URL with persistence
  const setUrl = useCallback(
    (newUrl: string) => {
      // Sanitize input
      const sanitized = newUrl.trim().slice(0, 2048);
      setUrlState(sanitized);
      debouncedSave(sanitized);
    },
    [debouncedSave]
  );

  // Clear URL
  const clear = useCallback(() => {
    setUrlState('');
    storageSetUrl(null).catch((error) => {
      console.error('Failed to clear URL:', error);
    });
  }, []);

  return {
    url,
    setUrl,
    clear,
    isLoading,
  } as const;
}
