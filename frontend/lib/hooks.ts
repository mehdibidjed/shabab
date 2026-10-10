"use client";

import useSWR from "swr";
import { api, type DemoUserKey } from "./api";
import { useDemoUser } from "./demo-user";

/** GET an API path as the current demo user; the user is part of the cache key,
 *  so switching role refetches everything automatically. */
export function useApi<T>(path: string | null) {
  const { user } = useDemoUser();
  return useSWR<T>(path ? [path, user] : null, ([p, u]: [string, DemoUserKey]) => api<T>(p, u), {
    keepPreviousData: false,
    revalidateOnFocus: false,
  });
}
