import { Building, Building2, Dumbbell, FlaskConical, Goal, House, Landmark, Tent, Trophy } from "lucide-react";

const ICONS = {
  djs: Landmark,
  opow: Building2,
  odej: Building,
  hall: Dumbbell,
  proximity_field: Goal,
  stadium: Trophy,
  youth_hostel: Tent,
  proximity_complex: Dumbbell,
  science_center: FlaskConical,
  dar_chabab: House,
};

export function TypeIcon({ type, className }) {
  const Icon = ICONS[type] ?? Building;
  return <Icon className={className} aria-hidden />;
}
