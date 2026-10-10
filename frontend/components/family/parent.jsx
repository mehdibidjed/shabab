"use client";

import { CalendarHeart, FileText, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pill } from "@/components/shared/pill";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { fmtDate, pick } from "@/lib/format";
import { useApi, useSend } from "@/lib/hooks";

export function ParentSpace() {
  const t = useTranslations("parent");
  const locale = useLocale();
  const { data: child } = useApi("/psych/parent/child");
  const { data: reports, error, isLoading, mutate } = useApi("/psych/parent/reports");

  return (
    <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 md:gap-6 lg:col-span-2">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">{t("yourChild")}</span>
            <span className="text-lg font-semibold">{child ? pick(child, "first_name", locale) : "…"}</span>
            {child && <span className="text-sm text-muted-foreground">{pick(child, "facility_name", locale)}</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {t("reportsTitle")}
            </CardTitle>
            <CardDescription>{t("reportsSub")}</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <ErrorState onRetry={() => mutate()} />
            ) : isLoading ? (
              <LoadingBlock className="h-40" />
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noReports")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {reports.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{t("sharedBy", { name: pick(r, "psychologist_name", locale) })}</span>
                      <span>{fmtDate(r.shared_at, locale, true)}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{r.summary}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-status-good" />
              {t("privacyNote")}
            </p>
          </CardContent>
        </Card>
      </div>
      <MeetingRequest />
    </div>
  );
}

function MeetingRequest() {
  const t = useTranslations("parent");
  const tp = useTranslations("psych");
  const locale = useLocale();
  const send = useSend();
  const { data, mutate } = useApi("/psych/parent/meeting-requests");
  const [reason, setReason] = useState("follow_up");
  const [preferred, setPreferred] = useState("any");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarHeart className="size-4 text-primary" />
          {t("meetingTitle")}
        </CardTitle>
        <CardDescription>{t("meetingSub")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 text-sm font-medium">
          {t("reason")}
          <FilterSelect label={t("reason")} value={reason} onChange={setReason} className="sm:w-full"
            items={["worried", "follow_up", "other"].map((k) => [k, tp(`reason_${k}`)])} />
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium">
          {t("preferred")}
          <FilterSelect label={t("preferred")} value={preferred} onChange={setPreferred} className="sm:w-full"
            items={["any", "morning", "afternoon"].map((k) => [k, tp(`preferred_${k}`)])} />
        </div>
        <Button
          onClick={async () => {
            await send("/psych/parent/meeting-requests", "POST", { reason, preferred });
            mutate();
          }}
        >
          <CalendarHeart />
          {t("requestMeeting")}
        </Button>
        {(data ?? []).length > 0 && (
          <ul className="flex flex-col gap-1.5 border-t pt-3 text-sm">
            {data.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{fmtDate(r.created_at, locale, true)}</span>
                <Pill tone={r.status === "new" ? "warn" : "good"}>{t(`requestStatus_${r.status}`)}</Pill>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
