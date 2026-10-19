"use client";

import { useLocale, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { ChartCard, LegendItem } from "@/components/shared/chart-card";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { BarList, C, TooltipBox, tick, useRtl } from "@/components/shared/viz";

import { fmtMonth, fmtNumber } from "@/lib/format";
import { useApi } from "@/lib/hooks";

const OPOW_TYPES = new Set(["hall", "proximity_field", "stadium"]);

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
            <AreaChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: 12 }}>
              <defs>
                <linearGradient id="membersFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.s1} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={C.s1} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 4" />
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
              <Area
                type="monotone"
                dataKey="total_members"
                stroke={C.s1}
                strokeWidth={2.5}
                fill="url(#membersFill)"
                dot={false}
                activeDot={{ r: 5, stroke: C.surface, strokeWidth: 2 }}
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
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
