"use client";

import { CircleCheck, Info, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pill } from "@/components/shared/pill";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { fmtDate, pick } from "@/lib/format";
import { useApi, useSend } from "@/lib/hooks";
import { PersonName, StatusPill } from "./common";
import { MemberPicker } from "./member-picker";
import { UpcomingPrevention } from "./upcoming";

const CATEGORIES = ["behavior", "isolation", "school", "family", "stress", "other"];
const EMPTY = { member: null, category: "behavior", observation: "", aggressive_behavior: false };

export function EducatorReferrals() {
  return (
    <div className="stagger grid items-start gap-4 md:gap-5 lg:grid-cols-5">
      <div className="flex flex-col gap-4 md:gap-5 lg:col-span-2">
        <ReferralForm />
        <UpcomingPrevention limit={5} />
      </div>
      <MyReferrals className="lg:col-span-3" />
    </div>
  );
}

function ReferralForm() {
  const t = useTranslations("educator");
  const tc = useTranslations("referralCategories");
  const send = useSend();
  const { mutate } = useApi("/psych/referrals");
  const [form, setForm] = useState(EMPTY);
  const [sent, setSent] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("referTitle")}</CardTitle>
        <CardDescription>{t("referSub")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const { member, ...rest } = form;
            await send("/psych/referrals", "POST", { ...rest, member_id: member.id });
            setForm(EMPTY);
            setSent(true);
            mutate();
          }}
        >
          <div className="flex flex-col gap-1 text-sm font-medium">
            {t("youngPerson")}
            <MemberPicker value={form.member} onChange={(m) => { setForm({ ...form, member: m }); setSent(false); }} />
          </div>
          <div className="flex flex-col gap-1 text-sm font-medium">
            {t("category")}
            <FilterSelect label={t("category")} value={form.category} onChange={(v) => setForm({ ...form, category: v })}
              items={CATEGORIES.map((c) => [c, tc(c)])} className="sm:w-full" />
          </div>
          <Label className="flex flex-col items-start gap-1">
            {t("observation")}
            <Textarea rows={4} value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })}
              placeholder={t("observationPlaceholder")} />
          </Label>
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={form.aggressive_behavior} onCheckedChange={(v) => setForm({ ...form, aggressive_behavior: !!v })} />
            {t("aggressive")}
          </Label>
          <p className="flex items-start gap-1.5 rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {t("privacyNote")}
          </p>
          <Button type="submit" disabled={!form.member || form.observation.trim().length < 10}>
            <Send />
            {t("send")}
          </Button>
          {sent && (
            <p className="flex items-center gap-1.5 text-sm text-success-text">
              <CircleCheck className="size-4" />
              {t("sentOk")}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function MyReferrals({ className }) {
  const t = useTranslations("educator");
  const tc = useTranslations("referralCategories");
  const locale = useLocale();
  const { data, error, isLoading, mutate } = useApi("/psych/referrals");
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t("myReferrals")}</CardTitle>
        <CardDescription>{t("myReferralsSub")}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <LoadingBlock />
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {data.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PersonName person={r.member} />
                  <Pill>{tc(r.category)}</Pill>
                  <StatusPill status={r.status} />
                  <span className="ms-auto text-xs text-muted-foreground">{fmtDate(r.created_at, locale)}</span>
                </div>
                <p className="text-sm text-muted-foreground">{r.observation}</p>
                {r.guidance.length > 0 ? (
                  r.guidance.map((g) => (
                    <div key={g.id} className="rounded-lg border-s-4 border-primary bg-primary/5 p-3 text-sm">
                      <p className="mb-1 text-xs font-medium text-primary">
                        {t("guidanceFrom", { name: pick(g, "from_name", locale), date: fmtDate(g.created_at, locale) })}
                      </p>
                      {g.text}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">{t(`statusHint_${r.status}`)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
