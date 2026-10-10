"use client";

import { ArrowLeft, CalendarClock, MapPin, SearchX, Users } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LegendItem } from "@/components/shared/chart-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusChip } from "@/components/shared/status-chip";
import { TypeIcon } from "@/components/dashboard/type-icon";
import type { Locale } from "@/i18n/config";
import { ApiError, type FacilityDetail } from "@/lib/api";
import { fmtDate, fmtNumber, fmtPct, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { StaffOrgChart } from "./staff-org-chart";

function BackLink() {
  const t = useTranslations("facility");
  return (
    <Link href="/" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4 rtl:-scale-x-100" />
      {t("back")}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}

export function FacilityView({ id }: { id: string }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const { data: f, error, isLoading, mutate } = useApi<FacilityDetail>(`/facilities/${id}`);

  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <SearchX className="size-8 text-muted-foreground" />
            <p className="font-medium">{t("facility.notFound")}</p>
            <p className="text-sm text-muted-foreground">{t("facility.notFoundHint")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (isLoading || !f) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-2/3" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const ms = f.member_stats;
  const maxBand = Math.max(1, ...Object.values(ms.age_bands));
  const genderTotal = Math.max(1, ms.male + ms.female);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader
        title={pick(f, "name", locale)}
        subtitle={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <StatusChip status={f.status} />
            <Badge variant="secondary" className="gap-1">
              <TypeIcon type={f.type} className="size-3" />
              {t(`types.${f.type}`)}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {pick(f, "commune", locale)}
            </span>
            <span>· {pick(f, "office_name", locale)}</span>
          </span>
        }
      >
        <BackLink />
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("facility.capacity")} value={fmtNumber(f.capacity, locale)} />
        <Stat label={t("facility.members")} value={fmtNumber(ms.active, locale)} />
        <Stat label={t("facility.activities30d")} value={fmtNumber(f.activities_30d, locale)} />
        <Stat label={t("facility.occupancy30d")} value={fmtPct(f.occupancy_30d, locale)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("facility.staffStructure")}</CardTitle>
          <CardDescription>{t("facility.staffStructureSub", { n: f.staff.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <StaffOrgChart staff={f.staff} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              {t("facility.members")}
            </CardTitle>
            <CardDescription>{t("facility.activeOf", { active: fmtNumber(ms.active, locale), total: fmtNumber(ms.total, locale) })}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {ms.total === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img"
                    aria-label={`${t("facility.male")} ${ms.male}, ${t("facility.female")} ${ms.female}`}>
                    <span className="bg-series-1" style={{ width: `${(100 * ms.male) / genderTotal}%` }} />
                    <span className="bg-series-2" style={{ width: `${(100 * ms.female) / genderTotal}%` }} />
                  </div>
                  <div className="flex gap-4">
                    <LegendItem color="var(--series-1)" label={`${t("facility.male")} · ${fmtNumber(ms.male, locale)}`} />
                    <LegendItem color="var(--series-2)" label={`${t("facility.female")} · ${fmtNumber(ms.female, locale)}`} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{t("facility.ageBands")}</span>
                  {Object.entries(ms.age_bands).map(([band, n]) => (
                    <div key={band} className="flex items-center gap-2 text-xs">
                      <span dir="ltr" className="w-12 shrink-0 text-start tabular-nums text-muted-foreground">{band}</span>
                      <span className="h-2 flex-1 rounded-full bg-muted">
                        <span className="block h-full rounded-full bg-series-1" style={{ width: `${(100 * n) / maxBand}%` }} />
                      </span>
                      <span className="w-8 text-end tabular-nums">{fmtNumber(n, locale)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("facility.recentActivities")}</CardTitle>
          </CardHeader>
          <CardContent>
            {f.recent_activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("facility.noActivities")}</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {f.recent_activities.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2">
                    <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(a.date, locale)}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{pick(a, "title", locale)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(`categories.${a.category}`)} · {t("facility.attendees", { n: fmtNumber(a.attendees, locale) })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              {t("facility.upcomingBookings")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {f.upcoming_bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("facility.noBookings")}</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {f.upcoming_bookings.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2">
                    <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(b.date, locale)}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm">{b.requester}</span>
                      <span className="text-xs text-muted-foreground">
                        {b.space} · {t(`slots.${b.slot}`)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
