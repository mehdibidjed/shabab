"use client";

import { ArrowDownRight, ArrowUpRight, Building2, CalendarDays, Minus, Percent, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Locale } from "@/i18n/config";
import type { Kpis } from "@/lib/api";
import { fmtNumber, fmtPct } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { ErrorState } from "@/components/shared/states";

function Tile({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub: React.ReactNode }) {
  return (
    <Card size="sm" className="gap-2">
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="truncate">{label}</span>
          <Icon className="size-4 shrink-0" aria-hidden />
        </div>
        <div className="text-2xl font-semibold tracking-tight md:text-3xl">{value}</div>
        <div className="min-h-4 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Delta({ diff, label }: { diff: number; label: (d: string) => string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("kpi");
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1">
        <Minus className="size-3" aria-hidden />
        {t("noChange")}
      </span>
    );
  }
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  const signed = `${diff > 0 ? "+" : "−"}${fmtNumber(Math.abs(diff), locale)}`;
  return (
    <span className={cn("inline-flex items-center gap-1", diff > 0 ? "text-success-text" : "text-status-critical")}>
      <Icon className="size-3 shrink-0 rtl:-scale-x-100" aria-hidden />
      <span>{label(signed)}</span>
    </span>
  );
}

export function KpiCards() {
  const t = useTranslations("kpi");
  const locale = useLocale() as Locale;
  const { data, error, isLoading, mutate } = useApi<Kpis>("/dashboard/kpis");

  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        icon={Building2}
        label={t("facilities")}
        value={fmtNumber(data.facilities, locale)}
        sub={t("facilitiesActive", { active: fmtNumber(data.facilities_active, locale) })}
      />
      <Tile
        icon={Users}
        label={t("activeMembers")}
        value={fmtNumber(data.active_members, locale)}
        sub={<span className="text-success-text">{t("newThisMonth", { n: fmtNumber(data.new_members_this_month, locale) })}</span>}
      />
      <Tile
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
      <Tile
        icon={Percent}
        label={t("occupancy")}
        value={fmtPct(data.occupancy_pct, locale)}
        sub={t("occupancyLast", { pct: fmtPct(data.occupancy_last_month_pct, locale) })}
      />
    </div>
  );
}
