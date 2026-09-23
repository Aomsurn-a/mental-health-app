import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardError } from '../utils/dashboardError';

export type DashboardStatus = 'loading' | 'success' | 'error';

export function useDashboardResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{
    status: DashboardStatus; data: T | undefined; error: ReturnType<typeof dashboardError> | null;
  }>({ status: 'loading', data: undefined, error: null });
  const version = useRef(0);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reload = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    const request = ++version.current;
    setState({ status: 'loading', data: undefined, error: null });
    timer.current = setTimeout(() => {
      if (request !== version.current) return;
      ++version.current; // Ignore a late response after timeout or a newer retry.
      busy.current = false;
      setState({ status: 'error', data: undefined, error: dashboardError({ code: 'ETIMEDOUT' }) });
    }, 20000);
    void Promise.resolve().then(load).then(data => {
      if (request === version.current) setState({ status: 'success', data, error: null });
    }).catch((error: unknown) => {
      if (request === version.current) setState({ status: 'error', data: undefined, error: dashboardError(error) });
    }).finally(() => {
      if (request !== version.current) return;
      clearTimeout(timer.current);
      busy.current = false;
    });
  }, [load]);

  const cancel = useCallback(() => {
    ++version.current;
    busy.current = false;
    clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    reload();
    return cancel;
  }, [reload, cancel]);

  const updateData = useCallback((update: (value: T) => T) => {
    setState(previous => previous.status === 'success' && previous.data !== undefined
      ? { ...previous, data: update(previous.data) }
      : previous);
  }, []);

  return { ...state, reload, updateData, ready: state.status === 'success' };
}
