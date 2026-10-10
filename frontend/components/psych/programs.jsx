"use client";

import { CalendarPlus, Pencil, Plus, Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pill } from "@/components/shared/pill";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { fmtDate, pick } from "@/lib/format";
import { useApi, useSend } from "@/lib/hooks";
import { UpcomingPrevention } from "./upcoming";

const EMPTY = { theme: "stress", title_ar: "", title_fr: "", description_ar: "", start_date: "", sessions_count: 4, every_days: 7 };

export function Programs() {
  const t = useTranslations("psych");
  const th = useTranslations("programThemes");
  const locale = useLocale();
  const send = useSend();
  const { data, error, isLoading, mutate } = useApi("/psych/programs");
  const { mutate: refreshCalendar } = useApi("/psych/calendar");
  const [editing, setEditing] = useState(null); // { id?: number, ...fields }

  const save = async (e) => {
    e.preventDefault();
    const { id, ...body } = editing;
    await send(id ? `/psych/programs/${id}` : "/psych/programs", id ? "PUT" : "POST", body);
    setEditing(null);
    mutate();
  };
  const publish = async (id) => {
    await send(`/psych/programs/${id}/publish`);
    mutate();
    refreshCalendar();
  };

  return (
    <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 md:gap-6 lg:col-span-2">
        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>{editing.id ? t("editProgram") : t("newProgram")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-3" onSubmit={save}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Label className="flex flex-col items-start gap-1">
                    {t("titleAr")}
                    <Input value={editing.title_ar} onChange={(e) => setEditing({ ...editing, title_ar: e.target.value })} />
                  </Label>
                  <Label className="flex flex-col items-start gap-1">
                    {t("titleFr")}
                    <Input dir="ltr" value={editing.title_fr} onChange={(e) => setEditing({ ...editing, title_fr: e.target.value })} />
                  </Label>
                </div>
                <Label className="flex flex-col items-start gap-1">
                  {t("description")}
                  <Textarea rows={3} value={editing.description_ar}
                    onChange={(e) => setEditing({ ...editing, description_ar: e.target.value })} />
                </Label>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="flex flex-col gap-1 text-sm font-medium">
                    {t("theme")}
                    <FilterSelect label={t("theme")} value={editing.theme} onChange={(v) => setEditing({ ...editing, theme: v })}
                      items={["addiction", "stress", "behavior"].map((k) => [k, th(k)])} className="sm:w-full" />
                  </div>
                  <Label className="flex flex-col items-start gap-1">
                    {t("startDate")}
                    <Input type="date" value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
                  </Label>
                  <Label className="flex flex-col items-start gap-1">
                    {t("sessionsNumber")}
                    <Input type="number" min={1} max={20} value={editing.sessions_count}
                      onChange={(e) => setEditing({ ...editing, sessions_count: Number(e.target.value) })} />
                  </Label>
                  <Label className="flex flex-col items-start gap-1">
                    {t("everyDays")}
                    <Input type="number" min={1} max={31} value={editing.every_days}
                      onChange={(e) => setEditing({ ...editing, every_days: Number(e.target.value) })} />
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={editing.title_ar.length < 3 || editing.title_fr.length < 3 || !editing.start_date}>
                    <Save />
                    {t("saveDraft")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Button className="w-fit" onClick={() => setEditing({ ...EMPTY })}>
            <Plus />
            {t("newProgram")}
          </Button>
        )}

        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <LoadingBlock />
        ) : (
          data.map((p) => (
            <Card key={p.id} size="sm">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {pick(p, "title", locale)}
                  <Pill tone="info">{th(p.theme)}</Pill>
                  {p.status === "published" ? (
                    <Pill tone="good">{t("published")}</Pill>
                  ) : (
                    <Pill>{t("draft")}</Pill>
                  )}
                </CardTitle>
                <CardDescription>
                  {t("schedule", { n: p.sessions_count, every: p.every_days, date: fmtDate(p.start_date, locale, true) })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {p.description_ar && <p className="text-sm text-muted-foreground">{p.description_ar}</p>}
                {p.status === "draft" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => publish(p.id)}>
                      <CalendarPlus />
                      {t("publish")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...p })}>
                      <Pencil />
                      {t("edit")}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("publishedHint")}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <UpcomingPrevention />
    </div>
  );
}
