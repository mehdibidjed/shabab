"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { DemoUserKey } from "./api";
import { setPreferenceCookie } from "./cookies";
import { DEMO_USER_COOKIE } from "./demo-users";

type Ctx = { user: DemoUserKey; setUser: (u: DemoUserKey) => void };
const DemoUserContext = createContext<Ctx | null>(null);

// The selected demo user is kept in a cookie so the server-rendered shell
// already knows it (no flash), and sent to the API as X-Demo-User.
export function DemoUserProvider({ initial, children }: { initial: DemoUserKey; children: React.ReactNode }) {
  const [user, setUserState] = useState(initial);
  const setUser = useCallback((u: DemoUserKey) => {
    setPreferenceCookie(DEMO_USER_COOKIE, u);
    setUserState(u);
  }, []);
  return <DemoUserContext.Provider value={{ user, setUser }}>{children}</DemoUserContext.Provider>;
}

export function useDemoUser() {
  const ctx = useContext(DemoUserContext);
  if (!ctx) throw new Error("useDemoUser must be used inside DemoUserProvider");
  return ctx;
}
