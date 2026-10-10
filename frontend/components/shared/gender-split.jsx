"use client";

import { useLocale, useTranslations } from "next-intl";
import { LegendItem } from "@/components/shared/chart-card";
import { fmtNumber } from "@/lib/format";

/** Two-segment bar (male / female) with a legend that carries the numbers. */
export function GenderSplit({ male, female }) {
  const t = useTranslations("facility");
  const locale = useLocale();
  const total = Math.max(1, male + female);
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${t("male")} ${male}, ${t("female")} ${female}`}
      >
        <span className="bg-series-1" style={{ width: `${(100 * male) / total}%` }} />
        <span className="bg-series-2" style={{ width: `${(100 * female) / total}%` }} />
      </div>
      <div className="flex gap-4">
        <LegendItem color="var(--series-1)" label={`${t("male")} · ${fmtNumber(male, locale)}`} />
        <LegendItem color="var(--series-2)" label={`${t("female")} · ${fmtNumber(female, locale)}`} />
      </div>
    </div>
  );
}

/** Horizontal bars for the age bands, labels in LTR (they are numeric ranges). */
export function AgeBands({ bands }) {
  const locale = useLocale();
  const max = Math.max(1, ...Object.values(bands));
  return (
    <div className="flex flex-col gap-2">
      {Object.entries(bands).map(([band, n]) => (
        <div key={band} className="flex items-center gap-2 text-xs">
          <span dir="ltr" className="w-12 shrink-0 text-start tabular-nums text-muted-foreground">
            {band}
          </span>
          <span className="h-2 flex-1 rounded-full bg-muted">
            <span className="block h-full rounded-full bg-series-1" style={{ width: `${(100 * n) / max}%` }} />
          </span>
          <span className="w-8 text-end tabular-nums">{fmtNumber(n, locale)}</span>
        </div>
      ))}
    </div>
  );
}
