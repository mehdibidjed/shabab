"use client";

import { Eye, GraduationCap, HeartHandshake, Landmark, Sparkles, Stethoscope, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ICON = {
  djs_director: Landmark,
  opow_director: Landmark,
  odej_director: Landmark,
  dc_director: Landmark,
  wali_inspector: Eye,
  psychologist: Stethoscope,
  educator: GraduationCap,
  parent: HeartHandshake,
  young_member: Sparkles,
};

/** Round avatar for the current demo user (an icon per role; there are no photos). */
export function RoleAvatar({ user, className }) {
  const Icon = ICON[user] ?? Users;
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/15",
        className,
      )}
      aria-hidden
    >
      <Icon className="size-4" />
    </span>
  );
}
