import { useSyncExternalStore } from "react";

// Command rail event feed (Layer 3 §3). A tiny external store: pages push
// events derived from their existing polling loops; the CommandRail
// subscribes and merges them with its own SIM generator. Display-only —
// nothing here touches the incident store.
// Snapshot discipline: every push produces a NEW array — useSyncExternalStore
// compares by identity, and a mutated-in-place buffer would never re-render.

export type RailEventType = "ERR" | "OK" | "SPAN" | "WARN";

export interface RailEvent {
  key: number;
  at: number; // epoch ms (for EVT/MIN + enter-animation gating)
  time: string; // HH:MM:SS.mmm
  type: RailEventType;
  id: string;
  delta: string;
  sim: boolean;
}

interface RailEventInput {
  type: RailEventType;
  id: string;
  delta: string;
  sim?: boolean;
}

const CAP = 200;
let seq = 0;
let buf: RailEvent[] = [];
const listeners = new Set<() => void>();

export function stampNow(): string {
  const d = new Date();
  const p = (v: number, l = 2) => String(v).padStart(l, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export function pushRailEvent(e: RailEventInput): void {
  const next = [...buf, { key: ++seq, at: Date.now(), time: stampNow(), sim: false, ...e }];
  buf = next.length > CAP ? next.slice(next.length - CAP) : next;
  listeners.forEach((l) => l());
}

export function railSnapshot(): RailEvent[] {
  return buf;
}

export function subscribeRail(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useRailFeed(): RailEvent[] {
  return useSyncExternalStore(subscribeRail, railSnapshot);
}
