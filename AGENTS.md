# AGENTS.md — Traceroot Frontend

Vite + React 18 + Tailwind dashboard for TraceRoot. Dev server on **5173**.

## API

The dashboard talks to Traceroot-Backend v1 at **http://localhost:4848/api/v1**
(override the host with `VITE_API_URL`). Every fetcher lives in `src/lib/api.ts`.

- List endpoints return `{ items, nextCursor, hasMore }`; `fetchIncidents()`
  unwraps to `items` (there is no pagination UI yet).
- `/metrics/errors`, `/metrics/latency` and `/metrics/throughput` each return
  the full `MetricPoint` series — `fetchMetrics()` uses one of them.
- Failures throw `ApiError`; pages render the **API OFFLINE** panel when the
  initial load fails, and keep the last good data on later transient errors.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | typecheck (`tsc`) + production build |
| `npm run preview` | serve the production build |

Start Traceroot-Backend on 4848 first — the dashboard renders empty/offline
states without it.
