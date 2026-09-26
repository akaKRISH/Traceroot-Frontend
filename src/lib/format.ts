// Deterministic PRNG (mulberry32) so mock data is stable across reloads.
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatErrorRate(n: number): string {
  return `${n.toFixed(2)}%`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function formatThroughput(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k/s`;
  return `${Math.round(n)}/s`;
}

export function formatTime(t: number): string {
  const d = new Date(t);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export function formatDelta(n: number): { text: string; positive: boolean } {
  const sign = n >= 0 ? "+" : "";
  return { text: `${sign}${n.toFixed(1)}%`, positive: n >= 0 };
}
