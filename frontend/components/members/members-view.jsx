"use client";

import { CircleCheck, CircleMinus, Search, UserPlus, Users, Venus, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartCard } from "@/components/shared/chart-card";
import { FilterSelect } from "@/components/shared/filter-select";
import { AgeBands, GenderSplit } from "@/components/shared/gender-split";
import { Pagination } from "@/components/shared/pagination";
import { StatTile, StatTilesSkeleton } from "@/components/shared/stat-tile";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { BarList, C, MonthlyColumns, TooltipBox } from "@/components/shared/viz";
import { TypeIcon } from "@/components/dashboard/type-icon";
import { useDemoUser } from "@/lib/demo-user";
import { fmtDate, fmtMonth, fmtNumber, fmtPct, pick } from "@/lib/format";
import { useApi, useDebounced, withQuery } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const AGE_BANDS = ["12-15", "16-18", "19-24", "25-30"];

export function MembersView({ initialFacility }) {
  const { user } = useDemoUser();
  // Remount on role change so filters never carry over to another scope.
  return <MembersContent key={user} initialFacility={initialFacility} />;
}

function MembersContent({ initialFacility }) {
  const [facility, setFacility] = useState(initialFacility ?? "all");

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <MembersStats
        facility={facility}
        onFacility={(id) => {
          setFacility((cur) => (cur === id ? "all" : id));
          document.getElementById("members-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
      <MembersTable facility={facility} onFacility={setFacility} />
    </div>
  );
}

function MembersStats({ facility, onFacility }) {
  const t = useTranslations("membersPage");
  const tf = useTranslations("facility");
  const locale = useLocale();
  const { data, error, isLoading, mutate } = useApi("/members/stats");

  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (isLoading || !data) {
    return (
      <>
        <StatTilesSkeleton />
        <LoadingBlock className="h-72" />
      </>
    );
  }

  const minors = (data.age_bands["12-15"] ?? 0) + (data.age_bands["16-18"] ?? 0);
  const pct = (n) => fmtPct(data.active ? (100 * n) / data.active : 0, locale);
  const months = data.new_per_month.map((m) => ({ month: m.month, value: m.count }));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Users}
          label={t("registered")}
          value={fmtNumber(data.total, locale)}
          sub={t("activeOf", { active: fmtNumber(data.active, locale) })}
        />
        <StatTile
          icon={UserPlus}
          label={t("newThisMonth")}
          value={fmtNumber(data.new_this_month, locale)}
          sub={t("monthToDate")}
        />
        <StatTile
          icon={Venus}
          label={t("femaleShare")}
          value={pct(data.female)}
          sub={`${tf("female")} ${fmtNumber(data.female, locale)} · ${tf("male")} ${fmtNumber(data.male, locale)}`}
        />
        <StatTile
          icon={Users}
          label={t("minorsShare")}
          value={pct(minors)}
          sub={t("minorsCount", { n: fmtNumber(minors, locale) })}
        />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={t("newPerMonth")}
          description={t("newPerMonthSub")}
          table={{
            columns: [t("month"), t("newMembers")],
            rows: data.new_per_month.map((m) => [fmtMonth(m.month, locale, "long"), fmtNumber(m.count, locale)]),
          }}
        >
          <MonthlyColumns
            rows={months}
            tooltipRows={(p) => [{ label: t("newMembers"), value: fmtNumber(p.value, locale), color: C.s1 }]}
          />
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle>{t("composition")}</CardTitle>
            <CardDescription>{t("compositionSub")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <GenderSplit male={data.male} female={data.female} />
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">{tf("ageBands")}</span>
              <AgeBands bands={data.age_bands} />
            </div>
          </CardContent>
        </Card>
      </div>

      {data.by_facility.length > 1 && (
        <ChartCard title={t("byFacility")} description={t("byFacilitySub")}>
          <BarList
            selectedKey={facility}
            onSelect={onFacility}
            rows={data.by_facility.map((f) => ({
              key: String(f.facility_id),
              label: pick(f, "name", locale),
              value: f.count,
              color: C.s1,
              tooltip: (
                <TooltipBox
                  title={pick(f, "name", locale)}
                  rows={[{ label: t("activeMembers"), value: fmtNumber(f.count, locale), color: C.s1 }]}
                />
              ),
            }))}
          />
        </ChartCard>
      )}
    </>
  );
}

function MembersTable({ facility, onFacility }) {
  const t = useTranslations("membersPage");
  const tf = useTranslations("facility");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("all");
  const [ageBand, setAgeBand] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const query = useDebounced(q.trim());

  // Facility options are the user's scoped facilities; an unknown id (e.g. from a link
  // opened under another role) falls back to "all".
  const { data: facilities } = useApi("/facilities");
  const facilityItems = [
    ["all", t("allFacilities")],
    ...(facilities ?? []).filter((f) => f.members > 0).map((f) => [String(f.id), pick(f, "name", locale)]),
  ];
  const activeFacility = facilityItems.some(([v]) => v === facility) ? facility : "all";

  const path = withQuery("/members", {
    facility_id: activeFacility,
    gender,
    age_band: ageBand,
    status,
    q: query,
    page,
    page_size: PAGE_SIZE,
  });
  const { data, error, isLoading, mutate } = useApi(facilities ? path : null);
  const filtered = activeFacility !== "all" || gender !== "all" || ageBand !== "all" || status !== "all" || q;

  // Any filter change goes back to page 1.
  const set = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  return (
    <Card id="members-list" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{t("listTitle")}</CardTitle>
        <CardDescription>{data ? t("count", { n: fmtNumber(data.total, locale) }) : " "}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => set(setQ)(e.target.value)}
              placeholder={t("search")}
              aria-label={t("search")}
              className="h-8 ps-8"
            />
          </div>
          <FilterSelect
            label={t("facility")}
            value={activeFacility}
            onChange={set(onFacility)}
            items={facilityItems}
            className="sm:w-56"
          />
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <FilterSelect
              label={t("gender")}
              value={gender}
              onChange={set(setGender)}
              items={[["all", t("allGenders")], ["m", tf("male")], ["f", tf("female")]]}
              className="sm:w-32"
            />
            <FilterSelect
              label={tf("ageBands")}
              value={ageBand}
              onChange={set(setAgeBand)}
              items={[["all", t("allAges")], ...AGE_BANDS.map((b) => [b, t("ageBand", { band: b })])]}
              className="sm:w-32"
            />
            <FilterSelect
              label={t("status")}
              value={status}
              onChange={set(setStatus)}
              items={[["all", t("allStatuses")], ["active", t("active")], ["inactive", t("inactive")]]}
              className="sm:w-32"
            />
          </div>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setGender("all");
                setAgeBand("all");
                setStatus("all");
                onFacility("all");
                setPage(1);
              }}
            >
              <X />
              {t("reset")}
            </Button>
          )}
        </div>

        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading || !data ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            {/* Phone: cards */}
            <ul className="flex flex-col gap-2 md:hidden">
              {data.items.map((m) => (
                <li key={m.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{pick(m, "full_name", locale)}</span>
                    <MemberStatus active={m.active} />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <bdi dir="ltr" className="font-mono">{m.member_no}</bdi>
                    <span>{t("years", { n: m.age })}</span>
                    <span>{m.gender === "m" ? t("genderM") : t("genderF")}</span>
                    <span>{fmtDate(m.joined_at, locale, true)}</span>
                  </div>
                  <Link href={`/facilities/${m.facility_id}`} className="flex items-center gap-1.5 text-xs hover:underline">
                    <TypeIcon type={m.facility_type} className="size-3.5 text-muted-foreground" />
                    {pick(m, "facility_name", locale)}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Tablet / desktop: table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead className="text-end">{t("age")}</TableHead>
                  <TableHead>{t("gender")}</TableHead>
                  <TableHead>{t("facility")}</TableHead>
                  <TableHead>{t("joined")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <span className="flex flex-col">
                        <span className="font-medium">{pick(m, "full_name", locale)}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          <bdi dir="ltr">{m.member_no}</bdi>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{fmtNumber(m.age, locale)}</TableCell>
                    <TableCell>{m.gender === "m" ? t("genderM") : t("genderF")}</TableCell>
                    <TableCell className="whitespace-normal">
                      <Link href={`/facilities/${m.facility_id}`} className="flex items-center gap-1.5 hover:underline">
                        <TypeIcon type={m.facility_type} className="size-4 shrink-0 text-muted-foreground" />
                        {pick(m, "facility_name", locale)}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{fmtDate(m.joined_at, locale, true)}</TableCell>
                    <TableCell>
                      <MemberStatus active={m.active} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
          </>
        )}
        <p className="text-[11px] text-muted-foreground">{tc("fictionalNames")}</p>
      </CardContent>
    </Card>
  );
}

function MemberStatus({ active }) {
  const t = useTranslations("membersPage");
  const Icon = active ? CircleCheck : CircleMinus;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border bg-background px-2 py-0.5 text-xs">
      <Icon className={cn("size-3.5", active ? "text-status-good" : "text-muted-foreground")} aria-hidden />
      {active ? t("active") : t("inactive")}
    </span>
  );
}
