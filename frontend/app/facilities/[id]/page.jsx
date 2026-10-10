import { FacilityView } from "@/components/facility/facility-view";

export default async function FacilityPage({ params }) {
  const { id } = await params;
  return <FacilityView id={id} />;
}
