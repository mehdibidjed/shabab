"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { ApiError, api } from "./api";
import { useDemoUser } from "./demo-user";

/** GET an API path as the current demo user; the user is part of the cache key,
 *  so switching role refetches everything automatically. */
export function useApi(path) {
  const { user } = useDemoUser();
  return useSWR(path ? [path, user] : null, ([p, u]) => api(p, u), {
    keepPreviousData: false,
    revalidateOnFocus: false,
    // 4xx (unknown user, out-of-scope facility) won't change by retrying.
    shouldRetryOnError: (error) => !(error instanceof ApiError && error.status < 500),
  });
}

/** `value`, updated only after it stopped changing for `delay` ms (for search boxes). */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** "/path?a=1&b=x" from an object, skipping empty values and the "all" sentinel. */
export function withQuery(path, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

/** Returns `send(path, method, body)` calling the API as the current demo user (for mutations). */
export function useSend() {
  const { user } = useDemoUser();
  return (path, method = "POST", body) =>
    api(path, user, { method, body: body === undefined ? undefined : JSON.stringify(body) });
}
