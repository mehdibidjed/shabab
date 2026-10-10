"use client";

import { useLocale } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { dirOf } from "@/i18n/config";
import { fmtMonth, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

// Colours come from CSS tokens so light/dark use their own validated steps.
export const C = {
  s1: "var(--series-1)",
  s2: "var(--series-2)",
  grid: "var(--grid)",
  axis: "var(--axis)",
  surface: "var(--card)",
};
export const tick = { fill: C.axis, fontSize: 12 };

/** SVG charts render LTR (avoids SVG text-anchor quirks under dir=rtl);
 *  for Arabic we mirror the axes instead so time flows right-to-left. */
export function useRtl() {
  return dirOf(useLocale()) === "rtl";
}

export function TooltipBox({ title, rows }) {
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

/** Horizontal bars in HTML rather than SVG: RTL-native, labels wrap on phones,
 *  and each row carries a direct value label plus a hover tooltip.
 *  With `onSelect`, rows become buttons (e.g. click a category to filter a table). */
export function BarList({ rows, onSelect, selectedKey }) {
  const locale = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.value));
  const rowClass =
    "grid w-full grid-cols-[minmax(5.5rem,10rem)_1fr] items-center gap-3 rounded-md px-1 py-1 text-start text-sm hover:bg-muted";
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((r) => (
        <li key={r.key}>
          <Tooltip>
            <TooltipTrigger
              render={
                onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(r.key)}
                    aria-pressed={selectedKey === r.key}
                    className={cn(rowClass, "cursor-pointer", selectedKey === r.key && "bg-primary/10 ring-1 ring-primary/30")}
                  />
                ) : (
                  <div className={rowClass} />
                )
              }
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span className="flex items-center gap-2">
                <span
                  className="h-5 rounded-e-[4px]"
                  style={{ width: `${(100 * r.value) / max}%`, minWidth: 2, background: r.color }}
                  aria-hidden
                />
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtNumber(r.value, locale)}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent className="p-0">{r.tooltip}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}

/** One column per month (single series). `rows`: [{ month: "YYYY-MM", value, ... }];
 *  `tooltipRows(row)` returns the TooltipBox rows. The current month is partial,
 *  so it is drawn lighter. */
export function MonthlyColumns({ rows, tooltipRows, height = 240 }) {
  const locale = useLocale();
  const rtl = useRtl();
  const last = rows.at(-1)?.month;
  return (
    <div dir="ltr" className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: 8 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis
            dataKey="month"
            reversed={rtl}
            tickFormatter={(m) => fmtMonth(m, locale)}
            tick={tick}
            tickLine={false}
            axisLine={{ stroke: C.grid }}
            interval="preserveStartEnd"
          />
          <YAxis
            orientation={rtl ? "right" : "left"}
            tick={tick}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
            tickFormatter={(v) => fmtNumber(v, locale)}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)" }}
            content={({ active, payload }) => {
              const p = active && payload?.[0]?.payload;
              if (!p) return null;
              return <TooltipBox title={fmtMonth(p.month, locale, "long")} rows={tooltipRows(p)} />;
            }}
          />
          <Bar
            dataKey="value"
            fill={C.s1}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            shape={(props) => {
              const { x, y, width, height: h, payload } = props;
              const r = Math.min(4, width / 2, h);
              return (
                <path
                  d={`M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + h}Z`}
                  fill={C.s1}
                  fillOpacity={payload.month === last ? 0.45 : 1}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
