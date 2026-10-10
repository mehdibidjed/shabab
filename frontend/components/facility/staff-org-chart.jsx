"use client";

import {
  Briefcase,
  Crown,
  GraduationCap,
  HandCoins,
  Handshake,
  Megaphone,
  NotebookPen,
  UserRound,
  Wrench,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { pick } from "@/lib/format";
import { cn } from "@/lib/utils";

const POSITION_ICON = {
  director: Crown,
  counselor: Megaphone,
  head_educator: GraduationCap,
  educator: GraduationCap,
  secretariat: NotebookPen,
  finance_admin: HandCoins,
  coordination_admin: Handshake,
  associations_admin: Handshake,
  activities_admin: Briefcase,
  professional_worker: Wrench,
};
const ORDER = Object.keys(POSITION_ICON);

function groupReports(staff, bossId) {
  const map = new Map();
  for (const s of staff.filter((x) => x.reports_to_id === bossId)) {
    map.set(s.position, [...(map.get(s.position) ?? []), s]);
  }
  return [...map.entries()]
    .map(([position, people]) => ({ position, people }))
    .sort((a, b) => ORDER.indexOf(a.position) - ORDER.indexOf(b.position));
}

/** Director on top, then one box per position (people of the same position are
 *  grouped). Nested reports (e.g. educators under the head educator) render inside
 *  their manager's box. Horizontal connectors on wide screens, a vertical spine on phones. */
export function StaffOrgChart({ staff }) {
  const t = useTranslations("positions");
  const locale = useLocale();
  const director = staff.find((s) => s.reports_to_id === null);
  if (!director) return null;
  const groups = groupReports(staff, director.id);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/10 px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
          <Crown className="size-4" />
        </span>
        <span className="flex flex-col">
          <span className="text-xs text-muted-foreground">{t("director")}</span>
          <span className="font-medium">{pick(director, "full_name", locale)}</span>
        </span>
      </div>
      <div className="h-5 w-0.5 bg-border" aria-hidden />

      <ul
        className={cn(
          "relative grid gap-3 self-stretch",
          // phone: vertical spine on the start side
          "ms-6 border-s-2 ps-5",
          // >= sm: horizontal bus line on top, boxes in a grid
          "sm:ms-0 sm:grid-cols-2 sm:border-s-0 sm:border-t-2 sm:ps-0 sm:pt-5 xl:grid-cols-4",
        )}
      >
        {groups.map((g, i) => (
          <li
            key={g.position}
            className={cn(
              "relative",
              "before:absolute before:top-5 before:-start-5 before:h-0.5 before:w-5 before:bg-border",
              "sm:before:-top-5 sm:before:start-1/2 sm:before:h-5 sm:before:w-0.5",
              // Only the first grid row hangs from the bus line (2 columns on sm, 4 on xl).
              i >= 2 && "sm:before:hidden",
              i >= 2 && i < 4 && "xl:before:block",
            )}
          >
            <GroupBox group={g} staff={staff} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function GroupBox({ group, staff }) {
  const t = useTranslations("positions");
  const locale = useLocale();
  const Icon = POSITION_ICON[group.position] ?? UserRound;

  return (
    <div className="h-full rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="flex-1">{t(group.position)}</span>
        {group.people.length > 1 && (
          <span className="rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">
            {group.people.length}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
        {group.people.map((p) => {
          const sub = groupReports(staff, p.id);
          return (
            <li key={p.id}>
              <span className="text-foreground">{pick(p, "full_name", locale)}</span>
              {sub.length > 0 && (
                <ul className="mt-2 flex flex-col gap-2 border-s-2 border-dashed ps-3">
                  {sub.map((sg) => (
                    <li key={sg.position}>
                      <span className="text-xs font-medium text-foreground">
                        {t(sg.position)} ({sg.people.length})
                      </span>
                      <ul className="text-xs">
                        {sg.people.map((sp) => (
                          <li key={sp.id}>{pick(sp, "full_name", locale)}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
