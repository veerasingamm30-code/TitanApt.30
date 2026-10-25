import { useCallback, useEffect, useState } from 'react';
import { apiData, messageFromError } from '../lib/api';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    apiData<T>(path)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(messageFromError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, tick]);

  return { data, loading, error, reload, setData };
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | TitanApt`;
  }, [title]);
}
