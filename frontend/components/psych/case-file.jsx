"use client";

import {
  ArrowLeft,
  ClipboardList,
  FileText,
  History,
  ListChecks,
  MessageSquareText,
  Plus,
  Save,
  SearchX,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Confidential, ConfidentialTag } from "@/components/shared/confidential";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pill } from "@/components/shared/pill";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { Tabs } from "@/components/shared/tabs";
import { ApiError } from "@/lib/api";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { useApi, useSend } from "@/lib/hooks";
import { PersonName, StatusPill } from "./common";

const today = () => new Date().toISOString().slice(0, 10);

export function CaseFile({ id }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  const ts = useTranslations("psychStatus");
  const { data: c, error, isLoading, mutate } = useApi(`/psych/cases/${id}`);
  const send = useSend();
  const [tab, setTab] = useState("sessions");

  if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <SearchX className="size-8 text-muted-foreground" />
          <p className="font-medium">{t("caseNotFound")}</p>
          <p className="text-sm text-muted-foreground">{t("caseNotFoundHint")}</p>
        </CardContent>
      </Card>
    );
  }
  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (isLoading || !c) return <LoadingBlock className="h-96" />;

  const locked = c.is_minor && !c.consent_recorded;
  const tabs = [
    { key: "sessions", label: t("tabSessions"), icon: MessageSquareText },
    { key: "assessments", label: t("tabAssessments"), icon: ClipboardList },
    { key: "plan", label: t("tabPlan"), icon: ListChecks },
    ...(c.subject.kind === "member" ? [{ key: "reports", label: t("tabReports"), icon: FileText }] : []),
    { key: "log", label: t("tabLog"), icon: History },
  ];

  return (
    <div className="stagger flex flex-col gap-4 md:gap-5">
      <Link href="/psych/cases" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:-scale-x-100" />
        {t("backToCases")}
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold">
                <PersonName person={c.subject} />
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <bdi dir="ltr" className="font-mono">{c.code}</bdi>
                <span>· {t(`origin_${c.origin}`)}</span>
                <span>· {t("openedOn", { date: fmtDate(c.opened_at, locale, true) })}</span>
              </div>
              <ConfidentialTag className="mt-1 w-fit" />
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={c.status} />
              <FilterSelect
                label={t("changeStatus")}
                value={c.status}
                onChange={async (v) => {
                  await send(`/psych/cases/${id}`, "PATCH", { status: v });
                  mutate();
                }}
                items={["open", "follow_up", "closed"].map((s) => [s, ts(s)])}
                className="sm:w-36"
              />
            </div>
          </div>
          {c.is_minor && <ConsentBlock caseData={c} onSaved={mutate} />}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          {tab === "sessions" && <SessionsTab id={id} locked={locked} />}
          {tab === "assessments" && <AssessmentsTab id={id} locked={locked} />}
          {tab === "plan" && <PlanTab id={id} locked={locked} />}
          {tab === "reports" && <ReportsTab id={id} />}
          {tab === "log" && <AccessLogTab id={id} />}
        </CardContent>
      </Card>
    </div>
  );
}

function ConsentBlock({ caseData: c, onSaved }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  const send = useSend();
  const [name, setName] = useState("");
  if (c.consent_recorded) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-status-good/10 p-2.5 text-sm">
        <ShieldCheck className="size-4 shrink-0 text-status-good" />
        {t("consentRecorded", { name: c.guardian_name, date: fmtDate(c.guardian_consent_at, locale, true) })}
      </p>
    );
  }
  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-status-warning/50 bg-status-warning/10 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await send(`/psych/cases/${c.id}/consent`, "POST", { guardian_name: name });
        onSaved();
      }}
    >
      <p className="flex items-start gap-2 text-sm font-medium">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-status-warning" />
        {t("consentRequired")}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("guardianName")} aria-label={t("guardianName")} />
        <Button type="submit" disabled={name.trim().length < 3}>
          {t("recordConsent")}
        </Button>
      </div>
    </form>
  );
}

function LockedNotice() {
  const t = useTranslations("psych");
  return <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{t("lockedUntilConsent")}</p>;
}

function SessionsTab({ id, locked }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  const send = useSend();
  const { data, mutate } = useApi(`/psych/cases/${id}/sessions`);
  const [form, setForm] = useState(null);

  return (
    <div className="flex flex-col gap-3">
      {locked ? (
        <LockedNotice />
      ) : form ? (
        <form
          className="flex flex-col gap-2 rounded-xl border border-border/60 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await send(`/psych/cases/${id}/sessions`, "POST", form);
            setForm(null);
            mutate();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <Label className="flex flex-col items-start gap-1">
              {t("date")}
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Label>
            <Label className="flex flex-col items-start gap-1">
              {t("durationMin")}
              <Input type="number" min={10} max={180} value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} />
            </Label>
          </div>
          <Confidential>
            <Textarea rows={5} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={t("notesPlaceholder")} aria-label={t("notes")} />
          </Confidential>
          <div className="flex gap-2">
            <Button type="submit" disabled={form.notes.trim().length < 3}>
              <Save />
              {t("save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button className="w-fit" onClick={() => setForm({ date: today(), duration_min: 45, notes: "" })}>
          <Plus />
          {t("addSession")}
        </Button>
      )}
      {(data ?? []).map((s) => (
        <div key={s.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{fmtDate(s.date, locale, true)}</span>
            <span className="text-xs text-muted-foreground">{t("minutes", { n: s.duration_min })}</span>
          </div>
          <Confidential>
            <p className="whitespace-pre-line text-sm leading-relaxed">{s.notes}</p>
          </Confidential>
        </div>
      ))}
      {data?.length === 0 && !locked && <p className="text-sm text-muted-foreground">{t("noSessions")}</p>}
    </div>
  );
}

function AssessmentsTab({ id, locked }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  const send = useSend();
  const { data, mutate } = useApi(`/psych/cases/${id}/assessments`);
  const [form, setForm] = useState(null);

  return (
    <div className="flex flex-col gap-3">
      {locked ? (
        <LockedNotice />
      ) : form ? (
        <form
          className="flex flex-col gap-2 rounded-xl border border-border/60 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await send(`/psych/cases/${id}/assessments`, "POST", form);
            setForm(null);
            mutate();
          }}
        >
          <div className="grid gap-2 sm:grid-cols-4">
            <Label className="flex flex-col items-start gap-1 sm:col-span-2">
              {t("formName")}
              <Input value={form.form_name} onChange={(e) => setForm({ ...form, form_name: e.target.value })} />
            </Label>
            <Label className="flex flex-col items-start gap-1">
              {t("score")}
              <Input type="number" min={0} value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} />
            </Label>
            <Label className="flex flex-col items-start gap-1">
              {t("maxScore")}
              <Input type="number" min={1} value={form.max_score} onChange={(e) => setForm({ ...form, max_score: Number(e.target.value) })} />
            </Label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={!form.form_name || form.score > form.max_score}>
              <Save />
              {t("save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button className="w-fit" onClick={() => setForm({ date: today(), form_name: "", score: 0, max_score: 40, answers: "{}" })}>
          <Plus />
          {t("addAssessment")}
        </Button>
      )}
      {(data ?? []).map((a) => (
        <Confidential key={a.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{a.form_name}</span>
            <span className="text-xs text-muted-foreground">{fmtDate(a.date, locale, true)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 flex-1 rounded-full bg-muted">
              <span className="block h-full rounded-full bg-series-1" style={{ width: `${(100 * a.score) / a.max_score}%` }} />
            </span>
            <span dir="ltr" className="text-sm tabular-nums">{a.score} / {a.max_score}</span>
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">{t("answers")}</summary>
            <pre dir="ltr" className="mt-1 overflow-x-auto rounded bg-muted p-2 text-start">{JSON.stringify(JSON.parse(a.answers), null, 1)}</pre>
          </details>
        </Confidential>
      ))}
    </div>
  );
}

function PlanTab({ id, locked }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  const send = useSend();
  const { data, mutate } = useApi(`/psych/cases/${id}/plan`);
  const [draft, setDraft] = useState(null);

  if (!data) return <LoadingBlock className="h-40" />;
  if (locked) return <LockedNotice />;
  const value = draft ?? { content: data.content, review_date: data.review_date ?? "" };
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        await send(`/psych/cases/${id}/plan`, "PUT", { content: value.content, review_date: value.review_date || null });
        setDraft(null);
        mutate();
      }}
    >
      <Confidential>
        <Textarea rows={9} value={value.content} onChange={(e) => setDraft({ ...value, content: e.target.value })}
          aria-label={t("tabPlan")} className="leading-relaxed" />
      </Confidential>
      <div className="flex flex-wrap items-end gap-3">
        <Label className="flex flex-col items-start gap-1">
          {t("reviewDate")}
          <Input type="date" value={value.review_date} onChange={(e) => setDraft({ ...value, review_date: e.target.value })} />
        </Label>
        <Button type="submit" disabled={!draft}>
          <Save />
          {t("save")}
        </Button>
        {data.updated_at && (
          <span className="text-xs text-muted-foreground">{t("updatedAt", { date: fmtDateTime(data.updated_at, locale) })}</span>
        )}
      </div>
    </form>
  );
}

function ReportsTab({ id }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  const send = useSend();
  const { data, mutate } = useApi(`/psych/cases/${id}/parent-reports`);
  const [form, setForm] = useState(null);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("reportsHint")}</p>
      {form ? (
        <form
          className="flex flex-col gap-2 rounded-xl border border-border/60 p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            await send(`/psych/cases/${id}/parent-reports`, "POST", form);
            setForm(null);
            mutate();
          }}
        >
          <Label className="flex flex-col items-start gap-1">
            {t("period")}
            <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="w-40" />
          </Label>
          <Textarea rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder={t("reportPlaceholder")} aria-label={t("reportSummary")} />
          <Label className="flex items-center gap-2 font-normal">
            <Checkbox checked={form.shared} onCheckedChange={(v) => setForm({ ...form, shared: !!v })} />
            {t("shareWithParent")}
          </Label>
          <div className="flex gap-2">
            <Button type="submit" disabled={form.summary.trim().length < 3}>
              <Save />
              {t("save")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Button className="w-fit" onClick={() => setForm({ period: today().slice(0, 7), summary: "", shared: false })}>
          <Plus />
          {t("newReport")}
        </Button>
      )}
      {(data ?? []).map((r) => (
        <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-border/60 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium"><bdi dir="ltr">{r.period}</bdi></span>
            {r.shared ? (
              <Pill tone="good" icon={ShieldCheck}>{t("sharedOn", { date: fmtDate(r.shared_at, locale) })}</Pill>
            ) : (
              <Pill>{t("draftNotShared")}</Pill>
            )}
          </div>
          {r.shared ? (
            <p className="text-sm">{r.summary}</p>
          ) : (
            <Confidential>
              <p className="text-sm">{r.summary}</p>
            </Confidential>
          )}
        </div>
      ))}
    </div>
  );
}

function AccessLogTab({ id }) {
  const t = useTranslations("psych");
  const tr = useTranslations("roles");
  const locale = useLocale();
  const { data } = useApi(`/psych/cases/${id}/access-log`);
  if (!data) return <LoadingBlock className="h-40" />;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t("accessLogHint")}</p>
      <ul className="flex flex-col divide-y text-sm">
        {data.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="w-36 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDateTime(e.at, locale)}</span>
            <span className="font-medium">{tr.has(e.user_key) ? tr(e.user_key) : e.user_key}</span>
            {e.action === "denied" ? (
              <Pill tone="bad" icon={ShieldAlert}>{t("accessDenied")}</Pill>
            ) : (
              <span className="text-muted-foreground">{t(`action_${e.action}`)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
