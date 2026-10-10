// Shared by server (layout reads the cookie) and client (role switcher).
export const DEMO_USER_COOKIE = "demo_user";
export const DEMO_USERS = ["djs_director", "opow_director", "odej_director", "dc_director", "wali_inspector"];

export function isDemoUser(value) {
  return !!value && DEMO_USERS.includes(value);
}
