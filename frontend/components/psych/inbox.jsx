"use client";

import { ArrowLeft, CalendarClock, FolderOpen, FolderPlus, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/shared/pill";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { fmtDate, fmtDateTime, pick } from "@/lib/format";
import { useApi, useSend } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { ALERT_META, PersonName, StatusPill, useAlertDetails } from "./common";

export function PsychInbox() {
  return (
    <div className="grid items-start gap-4 md:gap-6 xl:grid-cols-3">
      <div className="flex flex-col gap-4 md:gap-6 xl:col-span-2">
        <AlertsCard />
        <ReferralsCard />
      </div>
      <AgendaPreview />
    </div>
  );
}

function useOpenCase() {
  const send = useSend();
  const router = useRouter();
  return async (body) => {
    const c = await send("/psych/cases", "POST", body);
    router.push(`/psych/cases/${c.id}`);
  };
}

function AlertsCard() {
  const t = useTranslations("psych");
  const tt = useTranslations("alertTypes");
  const locale = useLocale();
  const details = useAlertDetails();
  const send = useSend();
  const openCase = useOpenCase();
  const { data, error, isLoading, mutate } = useApi("/psych/alerts?status=open");

  const setStatus = async (id, status) => {
    await send(`/psych/alerts/${id}`, "PATCH", { status });
    mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("alertsTitle")}</CardTitle>
        <CardDescription>{t("alertsSub")}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <LoadingBlock className="h-48" />
        ) : data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noAlerts")}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {data.map((a) => {
              const meta = ALERT_META[a.type];
              return (
                <li key={a.id} className={cn("flex flex-col gap-2 py-3", a.status === "new" && "")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={meta.tone} icon={meta.icon}>
                      {tt(a.type)}
                    </Pill>
                    <PersonName person={a.member} />
                    <span className="ms-auto text-xs text-muted-foreground">{fmtDate(a.created_at, locale)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{details(a)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={a.status} />
                    <span className="flex-1" />
                    {a.open_case_id ? (
                      <Link href={`/psych/cases/${a.open_case_id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        <FolderOpen />
                        {t("viewCase")}
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCase({ member_id: a.member.id, origin: a.type === "parent_request" ? "parent" : "alert", alert_id: a.id })}
                      >
                        <FolderPlus />
                        {t("openCase")}
                      </Button>
                    )}
                    {a.status === "new" ? (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "acknowledged")}>
                        {t("acknowledge")}
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "closed")}>
                        {t("closeAlert")}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ReferralsCard() {
  const t = useTranslations("psych");
  const tc = useTranslations("referralCategories");
  const locale = useLocale();
  const send = useSend();
  const openCase = useOpenCase();
  const { data, error, isLoading, mutate } = useApi("/psych/referrals/received");
  const [replying, setReplying] = useState(null);
  const [text, setText] = useState("");

  const sendGuidance = async (id) => {
    await send(`/psych/referrals/${id}/guidance`, "POST", { text });
    setReplying(null);
    setText("");
    mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("referralsReceived")}</CardTitle>
        <CardDescription>{t("referralsReceivedSub")}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <LoadingBlock className="h-48" />
        ) : (
          <ul className="flex flex-col divide-y">
            {data.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PersonName person={r.member} />
                  <Pill>{tc(r.category)}</Pill>
                  {r.aggressive_behavior && <Pill tone="bad">{t("aggressiveFlag")}</Pill>}
                  <span className="ms-auto text-xs text-muted-foreground">{fmtDate(r.created_at, locale)}</span>
                </div>
                <p className="text-sm">{r.observation}</p>
                <p className="text-xs text-muted-foreground">
                  {t("fromEducator", { name: pick(r, "from_name", locale) })}
                </p>
                {r.guidance.map((g) => (
                  <p key={g.id} className="rounded-md bg-primary/5 p-2 text-sm">
                    <span className="me-1 font-medium">{t("guidanceSent")}:</span>
                    {g.text}
                  </p>
                ))}
                {replying === r.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={t("guidancePlaceholder")}
                      rows={3}
                    />
                    <p className="text-[11px] text-muted-foreground">{t("guidanceHint")}</p>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={text.trim().length < 3} onClick={() => sendGuidance(r.id)}>
                        <Send />
                        {t("sendGuidance")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplying(null)}>
                        {t("cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={r.status} />
                    <span className="flex-1" />
                    {r.status === "sent" && (
                      <Button size="sm" variant="ghost" onClick={() => send(`/psych/referrals/${r.id}/received`).then(() => mutate())}>
                        {t("markReceived")}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setReplying(r.id)}>
                      <Send />
                      {t("writeGuidance")}
                    </Button>
                    {r.case_id ? (
                      <Link href={`/psych/cases/${r.case_id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                        <FolderOpen />
                        {t("viewCase")}
                      </Link>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openCase({ member_id: r.member.id, origin: "referral", referral_id: r.id })}>
                        <FolderPlus />
                        {t("openCase")}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AgendaPreview() {
  const t = useTranslations("psych");
  const ta = useTranslations("appointmentTypes");
  const locale = useLocale();
  const { data, isLoading } = useApi("/psych/appointments?days=7");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" />
          {t("next7days")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading ? (
          <LoadingBlock className="h-40" />
        ) : (
          <ul className="flex flex-col divide-y">
            {data.filter((a) => a.status !== "cancelled").map((a) => (
              <li key={a.id} className="flex flex-col gap-1 py-2 text-sm">
                <span className="text-xs text-muted-foreground">{fmtDateTime(a.starts_at, locale)}</span>
                <span className="flex flex-wrap items-center gap-2">
                  {a.with_person ? <PersonName person={a.with_person} showAge={false} /> : "—"}
                  <span className="text-xs text-muted-foreground">· {ta(a.type)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/psych/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          {t("openAgenda")}
          <ArrowLeft className="size-4 ltr:rotate-180" />
        </Link>
      </CardContent>
    </Card>
  );
}
