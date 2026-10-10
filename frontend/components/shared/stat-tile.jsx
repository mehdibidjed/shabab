"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <Card size="sm" className="gap-2">
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="line-clamp-2">{label}</span>
          <Icon className="size-4 shrink-0" aria-hidden />
        </div>
        <div className="text-2xl font-semibold tracking-tight md:text-3xl">{value}</div>
        <div className="min-h-4 text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

export function StatTilesSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}

/** Signed change with icon + colour (never colour alone). `label` wraps the signed value in a sentence. */
export function Delta({ diff, label }) {
  const locale = useLocale();
  const t = useTranslations("kpi");
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1">
        <Minus className="size-3" aria-hidden />
        {t("noChange")}
      </span>
    );
  }
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  const signed = `${diff > 0 ? "+" : "−"}${fmtNumber(Math.abs(diff), locale)}`;
  return (
    <span className={cn("inline-flex items-center gap-1", diff > 0 ? "text-success-text" : "text-status-critical")}>
      <Icon className="size-3 shrink-0 rtl:-scale-x-100" aria-hidden />
      <span>{label(signed)}</span>
    </span>
  );
}
