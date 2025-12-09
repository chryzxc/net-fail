import { useCallback, useEffect, useState } from "react";
import { getUrl, setUrl as storageSetUrl, onUrlChanged } from "@/lib/storage";

export function usePersistedUrl(initial = "") {
  const [url, setUrlState] = useState<string>(initial);

  useEffect(() => {
    let mounted = true;
    getUrl().then((stored) => {
      if (!mounted) return;
      if (stored != null) setUrlState(stored);
    });

    const unsub = onUrlChanged((newUrl) => {
      setUrlState(newUrl ?? "");
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const setUrl = useCallback(async (newUrl: string) => {
    setUrlState(newUrl);
    try {
      await storageSetUrl(newUrl);
    } catch (e) {
      // silent
    }
  }, []);

  const clear = useCallback(async () => {
    setUrlState("");
    try {
      await storageSetUrl(null);
    } catch (e) {
      // silent
    }
  }, []);

  return { url, setUrl, clear } as const;
}
