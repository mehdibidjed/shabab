"use client";

import { HeartHandshake, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { fmtMonth, fmtNumber } from "@/lib/format";
import { useApi } from "@/lib/hooks";

/** Counts from /psych/stats are either a number or "<5" (small-count suppression). */
export function useFmtCount() {
  const t = useTranslations("psych");
  const locale = useLocale();
  return (v) => (v === "<5" ? t("lessThan5") : fmtNumber(v, locale));
}

/** Management view of Module 2: aggregated, anonymous numbers only — never names or files. */
export function PsychSupportCard({ className }) {
  const t = useTranslations("psych");
  const tc = useTranslations("referralCategories");
  const locale = useLocale();
  const fmt = useFmtCount();
  const { data, error, isLoading, mutate } = useApi("/psych/stats");

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartHandshake className="size-4 text-primary" />
          {t("supportTitle")}
        </CardTitle>
        <CardDescription>{t("supportSub")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <LoadingBlock className="h-64" />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-2">
              {[
                ["activeCases", data.active_cases],
                ["newCases", data.new_cases_this_month],
                ["appointmentsMonth", data.appointments_this_month],
                ["openAlerts", data.open_alerts],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/50 p-2.5">
                  <dt className="text-xs text-muted-foreground">{t(k)}</dt>
                  <dd className="text-lg font-semibold">{fmt(v)}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">{t("sessionsPerMonth")}</span>
              <div className="grid grid-cols-6 gap-1 text-center">
                {data.sessions_per_month.map((m) => (
                  <div key={m.month} className="rounded-md border px-0.5 py-1">
                    <div className="text-[10px] text-muted-foreground">{fmtMonth(m.month, locale)}</div>
                    <div className="text-xs font-medium">{fmt(m.count)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t("referralsByCategory")}</span>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {data.referrals_by_category.map((c) => (
                  <li key={c.category} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{tc(c.category)}</span>
                    <span className="font-medium">{fmt(c.count)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("programsLine", { programs: data.programs_published, sessions: data.prevention_sessions_upcoming })}
            </p>
            <p className="flex items-start gap-1.5 rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-status-good" />
              {t("aggregatedOnly")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
