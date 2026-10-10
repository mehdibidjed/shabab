"use client";

import { Check, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterSelect } from "@/components/shared/filter-select";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { fmtDay, fmtTime } from "@/lib/format";
import { useApi, useSend } from "@/lib/hooks";
import { PersonName, StatusPill } from "./common";
import { MemberPicker } from "./member-picker";

export function Agenda() {
  const t = useTranslations("psych");
  const ta = useTranslations("appointmentTypes");
  const locale = useLocale();
  const send = useSend();
  const { data, error, isLoading, mutate } = useApi("/psych/appointments?days=21");
  const [form, setForm] = useState(null);

  const setStatus = async (id, status) => {
    await send(`/psych/appointments/${id}`, "PATCH", { status });
    mutate();
  };
  const days = Object.entries(
    (data ?? []).reduce((acc, a) => {
      (acc[a.starts_at.slice(0, 10)] ??= []).push(a);
      return acc;
    }, {}),
  );

  return (
    <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("agendaTitle")}</CardTitle>
          <CardDescription>{t("agendaSub")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <ErrorState onRetry={() => mutate()} />
          ) : isLoading ? (
            <LoadingBlock />
          ) : days.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noAppointments")}</p>
          ) : (
            days.map(([day, items]) => (
              <section key={day} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">{fmtDay(day, locale)}</h3>
                <ul className="flex flex-col gap-2">
                  {items.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3">
                      <span className="w-14 font-medium tabular-nums">{fmtTime(a.starts_at, locale)}</span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        {a.with_person ? <PersonName person={a.with_person} /> : <span>—</span>}
                        <span className="text-xs text-muted-foreground">
                          {ta(a.type)} · {t(`requestedBy_${a.requested_by}`)}
                        </span>
                      </span>
                      <StatusPill status={a.status} />
                      <span className="flex gap-1">
                        {a.status === "requested" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "confirmed")}>
                            <Check />
                            {t("confirm")}
                          </Button>
                        )}
                        {a.status === "confirmed" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "done")}>
                            <Check />
                            {t("markDone")}
                          </Button>
                        )}
                        {(a.status === "requested" || a.status === "confirmed") && (
                          <Button size="sm" variant="ghost" onClick={() => setStatus(a.id, "cancelled")} aria-label={t("cancelAppointment")}>
                            <X />
                          </Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("newAppointment")}</CardTitle>
        </CardHeader>
        <CardContent>
          {form ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                await send("/psych/appointments", "POST", {
                  member_id: form.member.id,
                  type: form.type,
                  starts_at: form.starts_at,
                  note: form.note || null,
                });
                setForm(null);
                mutate();
              }}
            >
              <MemberPicker value={form.member} onChange={(m) => setForm({ ...form, member: m })} />
              <FilterSelect
                label={t("type")}
                value={form.type}
                onChange={(v) => setForm({ ...form, type: v })}
                items={["follow_up", "listening", "parent_meeting"].map((k) => [k, ta(k)])}
                className="sm:w-full"
              />
              <Label className="flex flex-col items-start gap-1">
                {t("dateTime")}
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </Label>
              <Label className="flex flex-col items-start gap-1">
                {t("logisticsNote")}
                <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={300} />
              </Label>
              <p className="text-[11px] text-muted-foreground">{t("logisticsHint")}</p>
              <div className="flex gap-2">
                <Button type="submit" disabled={!form.member || !form.starts_at}>
                  {t("save")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setForm(null)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setForm({ member: null, type: "follow_up", starts_at: "", note: "" })}>
              <Plus />
              {t("newAppointment")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
