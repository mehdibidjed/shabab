"use client";

import { useLocale } from "next-intl";
import { useEffect, useState } from "react";
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

/** Horizontal bars in HTML rather than SVG: RTL-native, labels wrap on phones.
 *  Each row: label and value on one line, a thin rounded bar underneath that grows
 *  in on mount (staggered). With `onSelect`, rows become buttons (click to filter). */
export function BarList({ rows, onSelect, selectedKey }) {
  const locale = useLocale();
  const max = Math.max(1, ...rows.map((r) => r.value));
  const grown = useGrowIn();
  const rowClass = "flex w-full flex-col gap-1.5 rounded-xl px-2 py-1.5 text-start text-sm transition-colors";
  return (
    <ul className="-mx-2 flex flex-col gap-0.5">
      {rows.map((r, i) => (
        <li key={r.key}>
          <Tooltip>
            <TooltipTrigger
              render={
                onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(r.key)}
                    aria-pressed={selectedKey === r.key}
                    className={cn(rowClass, "cursor-pointer hover:bg-muted/70", selectedKey === r.key && "bg-accent hover:bg-accent")}
                  />
                ) : (
                  <div className={cn(rowClass, "hover:bg-muted/50")} />
                )
              }
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-foreground/80">{r.label}</span>
                <span className="shrink-0 font-medium tabular-nums">{fmtNumber(r.value, locale)}</span>
              </span>
              <span className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                <span
                  className="block h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: grown ? `${Math.max(1.5, (100 * r.value) / max)}%` : "0%",
                    background: r.color,
                    transitionDelay: `${i * 45}ms`,
                  }}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent className="p-0">{r.tooltip}</TooltipContent>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}

/** false on the first frame, then true: lets CSS transitions animate from zero. */
export function useGrowIn() {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return grown;
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
          <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 4" />
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
              const r = Math.min(6, width / 2, h);
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
