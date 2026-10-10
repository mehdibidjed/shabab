"use client";

import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartCard, LegendItem } from "@/components/shared/chart-card";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { dirOf } from "@/i18n/config";

import { fmtMonth, fmtNumber } from "@/lib/format";
import { useApi } from "@/lib/hooks";

// Colours come from CSS tokens so light/dark use their own validated steps.
const C = {
  s1: "var(--series-1)",
  s2: "var(--series-2)",
  grid: "var(--grid)",
  axis: "var(--axis)",
  surface: "var(--card)",
};
const OPOW_TYPES = new Set(["hall", "proximity_field", "stadium"]);
const tick = { fill: C.axis, fontSize: 12 };

/** The SVG line chart renders LTR (avoids SVG text-anchor quirks under dir=rtl);
 *  for Arabic we mirror the axes instead so time flows right-to-left. */
function useRtl() {
  return dirOf(useLocale()) === "rtl";
}

function TooltipBox({ title, rows }) {
  const locale = useLocale();
  return (
    <div
      dir={dirOf(locale)}
      className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
    >
      <div className="mb-1 font-medium">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {r.color && <span className="size-2 rounded-sm" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="font-medium tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function useTrends() {
  return useApi("/dashboard/trends");
}

export function MembersChart({ className }) {
  const t = useTranslations("charts");
  const locale = useLocale();
  const rtl = useRtl();
  const { data, error, isLoading, mutate } = useTrends();
  const rows = data?.months ?? [];

  return (
    <ChartCard
      className={className}
      title={t("members")}
      description={t("membersSub")}
      table={{
        columns: [t("month"), t("totalMembers"), t("newMembers")],
        rows: rows.map((m) => [
          fmtMonth(m.month, locale, "long"),
          fmtNumber(m.total_members, locale),
          fmtNumber(m.new_members, locale),
        ]),
      }}
    >
      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading ? (
        <LoadingBlock />
      ) : (
        <div dir="ltr" className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 12 }}>
              <CartesianGrid vertical={false} stroke={C.grid} />
              <XAxis
                dataKey="month"
                reversed={rtl}
                tickFormatter={(m) => fmtMonth(m, locale)}
                tick={tick}
                tickLine={false}
                axisLine={{ stroke: C.grid }}
              />
              <YAxis
                orientation={rtl ? "right" : "left"}
                tick={tick}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(v) => fmtNumber(v, locale)}
              />
              <ChartTooltip
                cursor={{ stroke: C.axis, strokeDasharray: "3 3" }}
                content={({ active, payload }) => {
                  const p = active && payload?.[0]?.payload;
                  if (!p) return null;
                  return (
                    <TooltipBox
                      title={fmtMonth(p.month, locale, "long")}
                      rows={[
                        { label: t("totalMembers"), value: fmtNumber(p.total_members, locale), color: C.s1 },
                        { label: t("newMembers"), value: `+${fmtNumber(p.new_members, locale)}` },
                      ]}
                    />
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="total_members"
                stroke={C.s1}
                strokeWidth={2}
                dot={{ r: 4, fill: C.s1, stroke: C.surface, strokeWidth: 2 }}
                activeDot={{ r: 6, stroke: C.surface, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

/** Horizontal bars in HTML rather than SVG: RTL-native, labels wrap on phones,
 *  and each row carries a direct value label plus a hover tooltip. */
function BarList({ rows }) {
  const locale = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((r) => (
        <li key={r.key}>
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="grid grid-cols-[minmax(5.5rem,10rem)_1fr] items-center gap-3 rounded-md px-1 py-1 text-sm hover:bg-muted" />
              }
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span className="flex items-center gap-2">
                <span
                  className="h-5 rounded-e-[4px]"
                  style={{ width: `${(100 * r.value) / max}%`, minWidth: 2, background: r.color }}
                  aria-hidden
                />
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {fmtNumber(r.value, locale)}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent className="p-0">{r.tooltip}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}

export function CategoryChart({ className }) {
  const t = useTranslations();
  const locale = useLocale();
  const { data, error, isLoading, mutate } = useTrends();
  const rows = (data?.activities_by_category ?? [])
    .filter((c) => c.activities > 0)
    .map((c) => ({ ...c, label: t(`categories.${c.category}`) }));

  return (
    <ChartCard
      className={className}
      title={t("charts.byCategory")}
      description={t("charts.byCategorySub")}
      table={{
        columns: [t("charts.category"), t("charts.activities"), t("charts.attendees")],
        rows: rows.map((r) => [r.label, fmtNumber(r.activities, locale), fmtNumber(r.attendees, locale)]),
      }}
    >
      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading ? (
        <LoadingBlock />
      ) : (
        <BarList
          rows={rows.map((r) => ({
            key: r.category,
            label: r.label,
            value: r.activities,
            color: C.s1,
            tooltip: (
              <TooltipBox
                title={r.label}
                rows={[
                  { label: t("charts.activities"), value: fmtNumber(r.activities, locale), color: C.s1 },
                  { label: t("charts.attendees"), value: fmtNumber(r.attendees, locale) },
                ]}
              />
            ),
          }))}
        />
      )}
    </ChartCard>
  );
}

export function FacilityTypeChart({ className }) {
  const t = useTranslations();
  const locale = useLocale();
  const { data, error, isLoading, mutate } = useTrends();
  const rows = (data?.facilities_by_type ?? []).map((r) => ({
    ...r,
    label: t(`types.${r.type}`),
    office: OPOW_TYPES.has(r.type) ? "opow" : "odej",
  }));
  const offices = [...new Set(rows.map((r) => r.office))];
  // Colour follows the entity (office), not its rank: OPOW is always slot 1, ODEJ slot 2.
  const color = (office) => (office === "opow" ? C.s1 : C.s2);

  return (
    <ChartCard
      className={className}
      title={t("charts.byType")}
      description={t("charts.byTypeSub")}
      legend={
        offices.length > 1 ? (
          <div className="flex flex-wrap gap-4">
            {offices.map((o) => (
              <LegendItem key={o} color={color(o)} label={t(`offices.${o}`)} />
            ))}
          </div>
        ) : undefined
      }
      table={{
        columns: [t("charts.type"), t("table.office"), t("charts.count")],
        rows: rows.map((r) => [r.label, t(`offices.${r.office}Short`), fmtNumber(r.count, locale)]),
      }}
    >
      {error ? (
        <ErrorState onRetry={() => mutate()} />
      ) : isLoading ? (
        <LoadingBlock />
      ) : (
        <BarList
          rows={rows.map((r) => ({
            key: r.type,
            label: r.label,
            value: r.count,
            color: color(r.office),
            tooltip: (
              <TooltipBox
                title={r.label}
                rows={[{ label: t(`offices.${r.office}`), value: fmtNumber(r.count, locale), color: color(r.office) }]}
              />
            ),
          }))}
        />
      )}
    </ChartCard>
  );
}
