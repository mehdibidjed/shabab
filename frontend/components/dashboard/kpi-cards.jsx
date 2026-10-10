"use client";

import { Building2, CalendarDays, Percent, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Delta, StatTile, StatTilesSkeleton } from "@/components/shared/stat-tile";

import { fmtNumber, fmtPct } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { ErrorState } from "@/components/shared/states";

export function KpiCards() {
  const t = useTranslations("kpi");
  const locale = useLocale();
  const { data, error, isLoading, mutate } = useApi("/dashboard/kpis");

  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (isLoading || !data) return <StatTilesSkeleton />;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        icon={Building2}
        label={t("facilities")}
        value={fmtNumber(data.facilities, locale)}
        sub={t("facilitiesActive", { active: fmtNumber(data.facilities_active, locale) })}
      />
      <StatTile
        icon={Users}
        label={t("activeMembers")}
        value={fmtNumber(data.active_members, locale)}
        sub={
          <span className="text-success-text">
            {t("newThisMonth", { n: fmtNumber(data.new_members_this_month, locale) })}
          </span>
        }
      />
      <StatTile
        icon={CalendarDays}
        label={t("activitiesMonth")}
        value={fmtNumber(data.activities_this_month, locale)}
        sub={
          <Delta
            diff={data.activities_this_month - data.activities_last_month_same_period}
            label={(d) => t("vsLastMonth", { delta: d })}
          />
        }
      />
      <StatTile
        icon={Percent}
        label={t("occupancy")}
        value={fmtPct(data.occupancy_pct, locale)}
        sub={t("occupancyLast", { pct: fmtPct(data.occupancy_last_month_pct, locale) })}
      />
    </div>
  );
}
