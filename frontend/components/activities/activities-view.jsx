"use client";

import { CalendarDays, CalendarRange, Search, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartCard } from "@/components/shared/chart-card";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { Delta, StatTile, StatTilesSkeleton } from "@/components/shared/stat-tile";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { BarList, C, MonthlyColumns, TooltipBox } from "@/components/shared/viz";
import { TypeIcon } from "@/components/dashboard/type-icon";
import { useDemoUser } from "@/lib/demo-user";
import { fmtDate, fmtMonth, fmtNumber, pick } from "@/lib/format";
import { useApi, useDebounced, withQuery } from "@/lib/hooks";

const PAGE_SIZE = 20;
const TOP_FACILITIES = 8;
const CATEGORIES = ["sport", "culture", "science", "scouting", "environment", "digital"];

export function ActivitiesView({ initialFacility, initialCategory }) {
  const { user } = useDemoUser();
  // Remount on role change so filters never carry over to another scope.
  return <ActivitiesContent key={user} initialFacility={initialFacility} initialCategory={initialCategory} />;
}

function ActivitiesContent({ initialFacility, initialCategory }) {
  const [facility, setFacility] = useState(initialFacility ?? "all");
  const [category, setCategory] = useState(CATEGORIES.includes(initialCategory) ? initialCategory : "all");
  const scrollToList = () =>
    document.getElementById("activities-list")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="stagger flex flex-col gap-4 md:gap-5">
      <ActivitiesStats
        category={category}
        facility={facility}
        onCategory={(c) => {
          setCategory((cur) => (cur === c ? "all" : c));
          scrollToList();
        }}
        onFacility={(f) => {
          setFacility((cur) => (cur === f ? "all" : f));
          scrollToList();
        }}
      />
      <ActivitiesTable facility={facility} onFacility={setFacility} category={category} onCategory={setCategory} />
    </div>
  );
}

function ActivitiesStats({ category, facility, onCategory, onFacility }) {
  const t = useTranslations("activitiesPage");
  const tk = useTranslations("kpi");
  const tAll = useTranslations();
  const locale = useLocale();
  const { data, error, isLoading, mutate } = useApi("/activities/stats");

  if (error) return <ErrorState onRetry={() => mutate()} />;
  if (isLoading || !data) {
    return (
      <>
        <StatTilesSkeleton />
        <LoadingBlock className="h-72" />
      </>
    );
  }

  const total6m = data.months.reduce((s, m) => s + m.activities, 0);
  const months = data.months.map((m) => ({ ...m, value: m.activities }));

  return (
    <>
      <div className="stagger grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatTile
          icon={CalendarDays}
          label={t("thisMonth")}
          count={data.this_month}
          sub={
            <Delta
              diff={data.this_month - data.last_month_same_period}
              hint={tk("vsLastMonthShort")}
            />
          }
        />
        <StatTile
          icon={UsersRound}
          label={t("attendeesThisMonth")}
          count={data.attendees_this_month}
          sub={t("monthToDate")}
        />
        <StatTile
          icon={UsersRound}
          label={t("medianAttendees")}
          count={data.median_attendees}
          sub={t("medianAttendeesSub")}
        />
        <StatTile
          icon={CalendarRange}
          label={t("total6m")}
          count={total6m}
          sub={t("categoriesCount", { n: data.by_category.length })}
        />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title={t("perMonth")}
          description={t("perMonthSub")}
          table={{
            columns: [t("month"), t("activities"), t("attendees")],
            rows: data.months.map((m) => [
              fmtMonth(m.month, locale, "long"),
              fmtNumber(m.activities, locale),
              fmtNumber(m.attendees, locale),
            ]),
          }}
        >
          <MonthlyColumns
            rows={months}
            tooltipRows={(p) => [
              { label: t("activities"), value: fmtNumber(p.activities, locale), color: C.s1 },
              { label: t("attendees"), value: fmtNumber(p.attendees, locale) },
            ]}
          />
        </ChartCard>

        <ChartCard title={t("byCategory")} description={t("clickToFilter")}>
          <BarList
            selectedKey={category}
            onSelect={onCategory}
            rows={data.by_category.map((c) => ({
              key: c.category,
              label: tAll(`categories.${c.category}`),
              value: c.activities,
              color: C.s1,
              tooltip: (
                <TooltipBox
                  title={tAll(`categories.${c.category}`)}
                  rows={[
                    { label: t("activities"), value: fmtNumber(c.activities, locale), color: C.s1 },
                    { label: t("attendees"), value: fmtNumber(c.attendees, locale) },
                  ]}
                />
              ),
            }))}
          />
        </ChartCard>
      </div>

      {data.by_facility.length > 1 && (
        <ChartCard title={t("topFacilities")} description={t("topFacilitiesSub")}>
          <BarList
            selectedKey={facility}
            onSelect={onFacility}
            rows={data.by_facility.slice(0, TOP_FACILITIES).map((f) => ({
              key: String(f.facility_id),
              label: pick(f, "name", locale),
              value: f.activities,
              color: C.s1,
              tooltip: (
                <TooltipBox
                  title={pick(f, "name", locale)}
                  rows={[{ label: t("activities"), value: fmtNumber(f.activities, locale), color: C.s1 }]}
                />
              ),
            }))}
          />
        </ChartCard>
      )}
    </>
  );
}

function ActivitiesTable({ facility, onFacility, category, onCategory }) {
  const t = useTranslations("activitiesPage");
  const tAll = useTranslations();
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [month, setMonth] = useState("all");
  const [page, setPage] = useState(1);
  const query = useDebounced(q.trim());

  const { data: facilities } = useApi("/facilities");
  const { data: stats } = useApi("/activities/stats");
  const facilityItems = [["all", t("allFacilities")], ...(facilities ?? []).map((f) => [String(f.id), pick(f, "name", locale)])];
  // An id from another scope (link opened under another role) falls back to "all".
  const activeFacility = facilityItems.some(([v]) => v === facility) ? facility : "all";
  const monthItems = [
    ["all", t("allMonths")],
    ...(stats?.months ?? []).map((m) => [m.month, fmtMonth(m.month, locale, "long")]).reverse(),
  ];

  const path = withQuery("/activities", {
    facility_id: activeFacility,
    category,
    month,
    q: query,
    page,
    page_size: PAGE_SIZE,
  });
  const { data, error, isLoading, mutate } = useApi(facilities ? path : null);
  const filtered = activeFacility !== "all" || category !== "all" || month !== "all" || q;
  const set = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  return (
    <Card id="activities-list" className="scroll-mt-20">
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
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <FilterSelect
              label={t("category")}
              value={category}
              onChange={set(onCategory)}
              items={[["all", t("allCategories")], ...CATEGORIES.map((c) => [c, tAll(`categories.${c}`)])]}
              className="sm:w-36"
            />
            <FilterSelect label={t("month")} value={month} onChange={set(setMonth)} items={monthItems} className="sm:w-36" />
          </div>
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setMonth("all");
                onCategory("all");
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
              {data.items.map((a) => (
                <li key={a.id} className="flex gap-3 rounded-xl border border-border/60 p-3">
                  <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(a.date, locale)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="font-medium">{pick(a, "title", locale)}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{tAll(`categories.${a.category}`)}</Badge>
                      {t("attendeesN", { n: fmtNumber(a.attendees, locale) })}
                    </span>
                    <Link href={`/facilities/${a.facility_id}`} className="flex items-center gap-1.5 text-xs hover:underline">
                      <TypeIcon type={a.facility_type} className="size-3.5 text-muted-foreground" />
                      {pick(a, "facility_name", locale)}
                    </Link>
                  </span>
                </li>
              ))}
            </ul>

            {/* Tablet / desktop: table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("activity")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("facility")}</TableHead>
                  <TableHead className="text-end">{t("attendees")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="tabular-nums text-muted-foreground">{fmtDate(a.date, locale, true)}</TableCell>
                    <TableCell className="whitespace-normal font-medium">{pick(a, "title", locale)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{tAll(`categories.${a.category}`)}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Link href={`/facilities/${a.facility_id}`} className="flex items-center gap-1.5 hover:underline">
                        <TypeIcon type={a.facility_type} className="size-4 shrink-0 text-muted-foreground" />
                        {pick(a, "facility_name", locale)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{fmtNumber(a.attendees, locale)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPage={setPage} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
