export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type DemoUserKey = "djs_director" | "opow_director" | "odej_director" | "dc_director" | "wali_inspector";

export type DemoUser = {
  key: DemoUserKey;
  role: string;
  scope: string;
  name_ar: string;
  name_fr: string;
  read_only: boolean;
};

export type Kpis = {
  facilities: number;
  facilities_active: number;
  active_members: number;
  new_members_this_month: number;
  activities_this_month: number;
  activities_last_month_same_period: number;
  occupancy_pct: number;
  occupancy_last_month_pct: number;
};

export type Trends = {
  months: { month: string; new_members: number; total_members: number; activities: number }[];
  activities_by_category: { category: string; activities: number; attendees: number }[];
  facilities_by_type: { type: string; count: number }[];
};

export type OrgNode = {
  id: number;
  code: string;
  name_ar: string;
  name_fr: string;
  type: string;
  path: string;
  facility_id: number | null;
  status: FacilityStatus | null;
  members: number;
  children: OrgNode[];
};

export type FacilityStatus = "active" | "maintenance" | "closed";

export type Facility = {
  id: number;
  code: string;
  name_ar: string;
  name_fr: string;
  type: string;
  office: "opow" | "odej";
  path: string;
  status: FacilityStatus;
  capacity: number;
  commune_ar: string;
  commune_fr: string;
  lat: number;
  lng: number;
  members: number;
  activities_30d: number;
  occupancy_30d: number;
};

export type StaffMember = {
  id: number;
  full_name_ar: string;
  full_name_fr: string;
  position: string;
  reports_to_id: number | null;
};

export type FacilityDetail = Facility & {
  office_name_ar: string;
  office_name_fr: string;
  staff: StaffMember[];
  member_stats: { total: number; active: number; male: number; female: number; age_bands: Record<string, number> };
  recent_activities: { id: number; title_ar: string; title_fr: string; category: string; date: string; attendees: number }[];
  upcoming_bookings: { id: number; space: string; date: string; slot: string; requester: string }[];
};

export type Insights = {
  source: "deepseek" | "demo";
  model: string | null;
  notice: string | null;
  insights: { title: string; text: string; tone: "positive" | "warning" | "info" }[];
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, user: DemoUserKey, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Demo-User": user, ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json() as Promise<T>;
}
