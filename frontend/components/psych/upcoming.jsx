"use client";

import { Sprout } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingBlock } from "@/components/shared/states";
import { fmtDate, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";

/** Upcoming prevention sessions published to the Dar Chabab calendar (public information). */
export function UpcomingPrevention({ limit = 8, className }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  const { data, isLoading } = useApi("/psych/calendar");
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="size-4 text-primary" />
          {t("calendarTitle")}
        </CardTitle>
        <CardDescription>{t("calendarSub")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingBlock className="h-40" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("calendarEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {data.slice(0, limit).map((s) => (
              <li key={s.activity_id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-16 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(s.date, locale)}</span>
                <span>{pick(s, "title", locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
