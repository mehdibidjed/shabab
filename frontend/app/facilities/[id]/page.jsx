import { MANAGEMENT_USERS } from "@/lib/demo-users";
import { requireUsers } from "@/lib/guard";
import { FacilityView } from "@/components/facility/facility-view";

export default async function FacilityPage({ params }) {
  await requireUsers(MANAGEMENT_USERS);
  const { id } = await params;
  return <FacilityView id={id} />;
}
