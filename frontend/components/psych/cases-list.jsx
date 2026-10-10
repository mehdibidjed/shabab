"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pill } from "@/components/shared/pill";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { Tabs } from "@/components/shared/tabs";
import { fmtDate } from "@/lib/format";
import { useApi, withQuery } from "@/lib/hooks";
import { PersonName, StatusPill } from "./common";

const FILTERS = ["all", "open", "follow_up", "closed", "consent_pending"];

export function CasesList() {
  const t = useTranslations("psych");
  const ts = useTranslations("psychStatus");
  const locale = useLocale();
  const [filter, setFilter] = useState("all");
  const { data, error, isLoading, mutate } = useApi(withQuery("/psych/cases", { status: filter }));

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={FILTERS.map((f) => ({ key: f, label: f === "all" ? t("allCases") : f === "consent_pending" ? t("consentPending") : ts(f) }))}
        />
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <LoadingBlock />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noCases")}</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {data.map((c) => (
              <li key={c.id}>
                <Link href={`/psych/cases/${c.id}`} className="flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted">
                  <div className="flex items-start justify-between gap-2">
                    <PersonName person={c.subject} />
                    <StatusPill status={c.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <bdi dir="ltr" className="font-mono">{c.code}</bdi>
                    {c.is_minor && (
                      c.consent_recorded ? (
                        <Pill>{t("minorConsentOk")}</Pill>
                      ) : (
                        <Pill tone="warn" icon={ShieldAlert}>
                          {t("consentPending")}
                        </Pill>
                      )
                    )}
                    <span>{t("sessionsCount", { n: c.sessions })}</span>
                    {c.last_session && <span>· {t("lastSession", { date: fmtDate(c.last_session, locale) })}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
