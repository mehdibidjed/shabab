"use client";

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
