import { FacilityView } from "@/components/facility/facility-view";

export default async function FacilityPage({ params }: PageProps<"/facilities/[id]">) {
  const { id } = await params;
  return <FacilityView id={id} />;
}
