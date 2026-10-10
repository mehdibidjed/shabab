import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_USER_COOKIE, homeOf, isDemoUser } from "./demo-users";

export async function currentDemoUser() {
  const value = (await cookies()).get(DEMO_USER_COOKIE)?.value;
  return isDemoUser(value) ? value : "djs_director";
}

/** Server-side page guard: users not in `allowed` are sent to their own home.
 *  (The API enforces the same rules; this only avoids showing empty 403 pages.) */
export async function requireUsers(allowed) {
  const user = await currentDemoUser();
  if (!allowed.includes(user)) redirect(homeOf(user));
  return user;
}
