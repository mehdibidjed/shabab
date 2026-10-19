"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./animated-number";

/** KPI tile. Pass `count` (+ optional `format`) to animate the number, or a ready `value`. */
export function StatTile({ icon: Icon, label, value, count, format, sub }) {
  const locale = useLocale();
  return (
    <Card size="sm" className="gap-0">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-[13px] text-muted-foreground">{label}</span>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Icon className="size-[18px]" aria-hidden />
          </span>
        </div>
        <div className="text-[28px] font-semibold leading-none tracking-tight md:text-[32px]">
          {count !== undefined ? <AnimatedNumber value={count} format={format ?? ((n) => fmtNumber(n, locale))} /> : value}
        </div>
        <div className="min-h-5 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

export function StatTilesSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[132px] rounded-2xl" />
      ))}
    </div>
  );
}

/** Signed change as a small pill (icon + colour + sign: never colour alone), then a short hint. */
export function Delta({ diff, hint }) {
  const locale = useLocale();
  const t = useTranslations("kpi");
  const up = diff > 0;
  const Icon = diff === 0 ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
          diff === 0 ? "bg-muted text-muted-foreground" : up ? "bg-status-good/12 text-success-text" : "bg-status-critical/10 text-status-critical",
        )}
      >
        <Icon className="size-3 shrink-0 rtl:-scale-x-100" aria-hidden />
        {diff === 0 ? t("noChange") : `${up ? "+" : "−"}${fmtNumber(Math.abs(diff), locale)}`}
      </span>
      {diff !== 0 && hint && <span>{hint}</span>}
    </span>
  );
}
