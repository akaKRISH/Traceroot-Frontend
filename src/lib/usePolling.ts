import { useEffect, useRef, useState } from "react";
import { reportPoll } from "./connection";

export interface PollingState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Fetches immediately, then every intervalMs. Errors after the first
// successful load are swallowed — a transient blip must NOT wipe the UI
// (only the initial load can surface API OFFLINE).
// Layer 3: every tick reports its outcome to the connection store
// (topbar LIVE/RETRY/OFFLINE) and to the optional onStatusChange callback.
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  onStatusChange?: (ok: boolean) => void
): PollingState<T> {
  const statusCb = useRef(onStatusChange);
  statusCb.current = onStatusChange;
  const [state, setState] = useState<PollingState<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const everLoaded = useRef(false);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const data = await fetcher();
        if (!alive) return;
        everLoaded.current = true;
        reportPoll(true);
        statusCb.current?.(true);
        setState({ data, error: null, loading: false });
      } catch (err) {
        if (!alive) return;
        reportPoll(false);
        statusCb.current?.(false);
        if (!everLoaded.current) {
          setState({ data: null, error: err instanceof Error ? err.message : String(err), loading: false });
        }
        // already-loaded: keep last good data, stay silent
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // ponytail: fetcher identity assumed stable per call site (module fns).
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
