import { useSyncExternalStore } from "react";

export type ConnStatus = "live" | "retry" | "offline";

type Listener = () => void;

// Tiny external store (Layer 3 §13). Every usePolling tick reports its
// outcome here; the Topbar subscribes via useConnectionStatus(). An
// external store instead of React context: pollers live on many pages,
// and the indicator must survive page switches without a provider.
let status: ConnStatus = "live";
let firstFailAt: number | null = null;
const listeners = new Set<Listener>();

const OFFLINE_AFTER_MS = 10_000;

function emit() {
  listeners.forEach((l) => l());
}

function setStatus(next: ConnStatus) {
  if (next !== status) {
    status = next;
    emit();
  }
}

/** Called by usePolling after every fetch attempt. */
export function reportPoll(success: boolean): void {
  if (success) {
    firstFailAt = null;
    setStatus("live");
    return;
  }
  const now = Date.now();
  if (firstFailAt === null) firstFailAt = now;
  setStatus(now - firstFailAt > OFFLINE_AFTER_MS ? "offline" : "retry");
}

export function getConnectionStatus(): ConnStatus {
  return status;
}

export function useConnectionStatus(): ConnStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getConnectionStatus
  );
}
