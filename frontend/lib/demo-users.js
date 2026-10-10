// Shared by server (layout and page guards read the cookie) and client (role switcher).
export const DEMO_USER_COOKIE = "demo_user";

export const MANAGEMENT_USERS = ["djs_director", "opow_director", "odej_director", "dc_director", "wali_inspector"];
// Grouped as in the role switcher. Module 2 roles have their own workspaces.
export const USER_GROUPS = [
  ["management", MANAGEMENT_USERS],
  ["care", ["psychologist", "educator"]],
  ["family", ["parent", "young_member"]],
];
export const DEMO_USERS = USER_GROUPS.flatMap(([, users]) => users);

const HOME = { psychologist: "/psych", educator: "/referrals", parent: "/family", young_member: "/youth" };

export function isDemoUser(value) {
  return !!value && DEMO_USERS.includes(value);
}

export function isManagement(user) {
  return MANAGEMENT_USERS.includes(user);
}

/** Landing page of a demo user (management roles land on the DJS overview). */
export function homeOf(user) {
  return HOME[user] ?? "/";
}
