import React from "react";
import { ApiError } from "../../lib/api";

export type PageState<T> =
  | { phase: "loading" }
  | { phase: "error"; retry: () => void; message: string }
  | { phase: "loaded"; data: T };

// One owner of the three render states. No skeleton, no spinner, no shimmer.
export function AsyncPage<T>({ state, children }: { state: PageState<T>; children: (data: T) => React.ReactNode }) {
  if (state.phase === "loading") {
    return (
      <div className="h-full min-h-[320px] flex items-center justify-center">
        <span className="mono t-body text-muted tracking-[0.2em]">LOADING…</span>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="px-8 py-16 flex flex-col items-center">
        <div className="border-2 border-ink shadow-brut bg-panel w-full max-w-md">
          <div className="bg-danger border-b-2 border-ink px-4 py-2.5">
            <span className="label text-ink">API OFFLINE</span>
          </div>
          <div className="p-4">
            <div className="mono t-body text-ink break-all">{state.message}</div>
            <button
              type="button"
              onClick={state.retry}
              className="mt-4 border-2 border-ink bg-paper shadow-brut px-4 py-2 mono t-body font-bold uppercase tracking-[0.15em] text-ink transition-none hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              RETRY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(state.data)}</>;
}

// Runs an async loader on mount and on retry; keeps state in one place.
export function usePageData<T>(load: () => Promise<T>): PageState<T> {
  const [state, setState] = React.useState<PageState<T>>({ phase: "loading" });
  const run = React.useCallback(() => {
    setState({ phase: "loading" });
    load()
      .then((data) => setState({ phase: "loaded", data }))
      .catch((err: unknown) =>
        setState({
          phase: "error",
          retry: run,
          message: err instanceof ApiError ? `API error ${err.status}` : String(err),
        })
      );
    // ponytail: load identity assumed stable per page; retry closes over run.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    run();
  }, [run]);
  return state;
}
