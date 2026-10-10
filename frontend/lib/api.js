export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Response shapes of the backend (kept as JSDoc for documentation and editor hints).
 *
 * @typedef {"djs_director" | "opow_director" | "odej_director" | "dc_director" | "wali_inspector"} DemoUserKey
 * @typedef {"active" | "maintenance" | "closed"} FacilityStatus
 *
 * @typedef {object} DemoUser
 * @property {DemoUserKey} key
 * @property {string} role
 * @property {string} scope  dotted org path, e.g. "djs.odej"
 * @property {string} name_ar
 * @property {string} name_fr
 * @property {boolean} read_only
 *
 * @typedef {object} Kpis
 * @property {number} facilities
 * @property {number} facilities_active
 * @property {number} active_members
 * @property {number} new_members_this_month
 * @property {number} activities_this_month
 * @property {number} activities_last_month_same_period
 * @property {number} occupancy_pct  month to date, 0..100
 * @property {number} occupancy_last_month_pct
 *
 * @typedef {object} Trends
 * @property {{ month: string, new_members: number, total_members: number, activities: number }[]} months
 * @property {{ category: string, activities: number, attendees: number }[]} activities_by_category
 * @property {{ type: string, count: number }[]} facilities_by_type
 *
 * @typedef {object} OrgNode
 * @property {number} id
 * @property {string} code
 * @property {string} name_ar
 * @property {string} name_fr
 * @property {string} type
 * @property {string} path
 * @property {number | null} facility_id
 * @property {FacilityStatus | null} status
 * @property {number} members
 * @property {OrgNode[]} children
 *
 * @typedef {object} Facility
 * @property {number} id
 * @property {string} code
 * @property {string} name_ar
 * @property {string} name_fr
 * @property {string} type
 * @property {"opow" | "odej"} office
 * @property {string} path
 * @property {FacilityStatus} status
 * @property {number} capacity
 * @property {string} commune_ar
 * @property {string} commune_fr
 * @property {number} lat
 * @property {number} lng
 * @property {number} members
 * @property {number} activities_30d
 * @property {number} occupancy_30d
 *
 * @typedef {object} StaffMember
 * @property {number} id
 * @property {string} full_name_ar
 * @property {string} full_name_fr
 * @property {string} position
 * @property {number | null} reports_to_id
 *
 * @typedef {Facility & {
 *   office_name_ar: string,
 *   office_name_fr: string,
 *   staff: StaffMember[],
 *   member_stats: { total: number, active: number, male: number, female: number, age_bands: Record<string, number> },
 *   recent_activities: { id: number, title_ar: string, title_fr: string, category: string, date: string, attendees: number }[],
 *   upcoming_bookings: { id: number, space: string, date: string, slot: string, requester: string }[],
 * }} FacilityDetail
 *
 * @typedef {object} Insights
 * @property {"deepseek" | "demo"} source
 * @property {string | null} model
 * @property {string | null} notice
 * @property {{ title: string, text: string, tone: "positive" | "warning" | "info" }[]} insights
 */

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Call the backend as the given demo user.
 * @param {string} path  e.g. "/dashboard/kpis"
 * @param {DemoUserKey} user  sent as X-Demo-User
 * @param {RequestInit} [init]
 */
export async function api(path, user, init) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Demo-User": user, ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
