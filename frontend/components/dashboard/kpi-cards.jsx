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
    <div className="stagger grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <StatTile
        icon={Building2}
        label={t("facilities")}
        count={data.facilities}
        sub={t("facilitiesActive", { active: fmtNumber(data.facilities_active, locale) })}
      />
      <StatTile
        icon={Users}
        label={t("activeMembers")}
        count={data.active_members}
        sub={
          <span className="text-success-text">
            {t("newThisMonth", { n: fmtNumber(data.new_members_this_month, locale) })}
          </span>
        }
      />
      <StatTile
        icon={CalendarDays}
        label={t("activitiesMonth")}
        count={data.activities_this_month}
        sub={
          <Delta
            diff={data.activities_this_month - data.activities_last_month_same_period}
            hint={t("vsLastMonthShort")}
          />
        }
      />
      <StatTile
        icon={Percent}
        label={t("occupancy")}
        count={data.occupancy_pct}
        format={(n) => fmtPct(n, locale)}
        sub={t("occupancyLast", { pct: fmtPct(data.occupancy_last_month_pct, locale) })}
      />
    </div>
  );
}
