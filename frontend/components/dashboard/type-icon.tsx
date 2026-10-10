import {
  Building,
  Building2,
  Dumbbell,
  FlaskConical,
  Goal,
  House,
  Landmark,
  Tent,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
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

export function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? Building;
  return <Icon className={className} aria-hidden />;
}
