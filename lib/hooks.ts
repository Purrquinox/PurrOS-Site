"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Page, type Query } from "./api";

type State<T> = { data: T | undefined; error: unknown; loading: boolean };

/** GET a resource. Pass null as the path to skip the request. */
export function useApi<T>(path: string | null, query?: Query) {
  const [state, setState] = useState<State<T>>({ data: undefined, error: undefined, loading: path !== null });
  const [tick, setTick] = useState(0);
  const key = path === null ? null : `${path}?${JSON.stringify(query ?? {})}`;

  useEffect(() => {
    if (path === null) {
      setState({ data: undefined, error: undefined, loading: false });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: undefined }));
    api<T>(path, { query, signal: ctrl.signal })
      .then((data) => setState({ data, error: undefined, loading: false }))
      .catch((error) => {
        if (!ctrl.signal.aborted) setState({ data: undefined, error, loading: false });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** A cursor-paginated list. Moving forward pushes the cursor so "Previous" can go back. */
export function useList<T>(path: string | null, query?: Query, limit = 50) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const key = `${path}?${JSON.stringify(query ?? {})}`;
  const lastKey = useRef(key);
  if (lastKey.current !== key) {
    lastKey.current = key;
    if (cursors.length !== 1) setCursors([undefined]);
  }
  const cursor = cursors[cursors.length - 1];
  const res = useApi<Page<T>>(path, { ...query, limit, cursor });

  return {
    ...res,
    rows: res.data?.data ?? [],
    page: cursors.length,
    hasMore: Boolean(res.data?.hasMore && res.data?.nextCursor),
    next: () => res.data?.nextCursor && setCursors((c) => [...c, res.data!.nextCursor!]),
    prev: () => setCursors((c) => (c.length > 1 ? c.slice(0, -1) : c)),
  };
}

/** A value kept in localStorage (per-browser conveniences only). */
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw));
    } catch {}
  }, [key]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
    },
    [key],
  );
  return [value, set] as const;
}
