"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { setPreferenceCookie } from "./cookies";
import { DEMO_USER_COOKIE } from "./demo-users";

const DemoUserContext = createContext(null);

// The selected demo user is kept in a cookie so the server-rendered shell
// already knows it (no flash), and sent to the API as X-Demo-User.
export function DemoUserProvider({ initial, children }) {
  const [user, setUserState] = useState(initial);
  const setUser = useCallback((u) => {
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
