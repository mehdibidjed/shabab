"use client";

import { CalendarCheck, Lock, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { StatusPill } from "@/components/psych/common";
import { UpcomingPrevention } from "@/components/psych/upcoming";
import { fmtDateTime, fmtDay, fmtTime } from "@/lib/format";
import { useApi, useSend } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function YouthSpace() {
  const t = useTranslations("youth");
  const locale = useLocale();
  const send = useSend();
  const { data: slots, error, isLoading, mutate: refreshSlots } = useApi("/psych/youth/slots");
  const { data: mine, mutate } = useApi("/psych/youth/appointments");
  const [chosen, setChosen] = useState(null);
  const [showDays, setShowDays] = useState(4);

  const days = Object.entries(
    (slots ?? []).reduce((acc, s) => {
      (acc[s.slice(0, 10)] ??= []).push(s);
      return acc;
    }, {}),
  );

  return (
    <div className="stagger grid items-start gap-4 md:gap-5 lg:grid-cols-3">
      <div className="flex flex-col gap-4 md:gap-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("bookTitle")}</CardTitle>
            <CardDescription>{t("bookSub")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="flex items-start gap-2 rounded-lg bg-violet-500/10 p-3 text-sm">
              <Lock className="mt-0.5 size-4 shrink-0 text-violet-700 dark:text-violet-300" />
              {t("privacy")}
            </p>
            {error ? (
              <ErrorState onRetry={() => refreshSlots()} />
            ) : isLoading ? (
              <LoadingBlock className="h-40" />
            ) : (
              <>
                {days.slice(0, showDays).map(([day, list]) => (
                  <section key={day} className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium">{fmtDay(day, locale)}</h3>
                    <div className="flex flex-wrap gap-2">
                      {list.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setChosen(s)}
                          aria-pressed={chosen === s}
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-sm tabular-nums transition-colors hover:bg-muted",
                            chosen === s && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                          )}
                        >
                          {fmtTime(s, locale)}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
                {showDays < days.length && (
                  <Button variant="ghost" className="w-fit" onClick={() => setShowDays(days.length)}>
                    {t("moreDays")}
                  </Button>
                )}
                <Button
                  disabled={!chosen}
                  onClick={async () => {
                    await send("/psych/youth/appointments", "POST", { starts_at: chosen });
                    setChosen(null);
                    mutate();
                    refreshSlots();
                  }}
                >
                  <CalendarCheck />
                  {chosen ? t("confirmSlot", { slot: fmtDateTime(chosen, locale) }) : t("pickSlot")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("myAppointments")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(mine ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noAppointments")}</p>
            ) : (
              <ul className="flex flex-col divide-y">
                {mine.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="flex-1">{fmtDateTime(a.starts_at, locale)}</span>
                    <StatusPill status={a.status} />
                    {(a.status === "requested" || a.status === "confirmed") && (
                      <Button size="sm" variant="ghost"
                        onClick={async () => {
                          await send(`/psych/youth/appointments/${a.id}/cancel`);
                          mutate();
                          refreshSlots();
                        }}
                      >
                        <X />
                        {t("cancel")}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <UpcomingPrevention limit={6} />
    </div>
  );
}
