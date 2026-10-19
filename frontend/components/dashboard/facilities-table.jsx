"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, LoadingBlock } from "@/components/shared/states";
import { StatusChip } from "@/components/shared/status-chip";

import { fmtNumber, fmtPct, pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { TypeIcon } from "./type-icon";

const ALL = "all";

function OccupancyBar({ pct }) {
  const locale = useLocale();
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span className="block h-full rounded-full bg-series-1" style={{ width: `${Math.min(pct, 100)}%` }} />
      </span>
      <span className="w-9 text-end tabular-nums">{fmtPct(pct, locale)}</span>
    </span>
  );
}

export function FacilitiesTable({ officePath, onClearOffice, className }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [type, setType] = useState(ALL);
  // Fetch the whole scoped list once; type/office filters are applied client-side
  // so the type selector always lists every type the user can see.
  const { data, error, isLoading, mutate } = useApi("/facilities");

  const types = useMemo(() => [...new Set((data ?? []).map((f) => f.type))], [data]);
  const activeType = types.includes(type) ? type : ALL;
  const rows = (data ?? []).filter(
    (f) => (activeType === ALL || f.type === activeType) && (!officePath || f.path.startsWith(`${officePath}.`)),
  );
  const items = { [ALL]: t("table.allTypes"), ...Object.fromEntries(types.map((ty) => [ty, t(`types.${ty}`)])) };

  return (
    <Card id="facilities" className={`scroll-mt-20 ${className ?? ""}`}>
      <CardHeader>
        <CardTitle>{t("table.title")}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          {t("table.count", { n: fmtNumber(rows.length, locale) })}
          {officePath && (
            <Button variant="secondary" size="xs" onClick={onClearOffice} className="gap-1">
              {t(`offices.${officePath.split(".").pop()}Short`)}
              <X className="size-3" />
            </Button>
          )}
        </CardDescription>
        <CardAction>
          <Select items={items} value={activeType} onValueChange={(v) => setType(String(v ?? ALL))}>
            <SelectTrigger size="sm" className="w-40 sm:w-52" aria-label={t("table.filterType")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(items).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorState onRetry={() => mutate()} />
        ) : isLoading ? (
          <LoadingBlock className="h-72" />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("table.empty")}</p>
        ) : (
          <>
            {/* Phone: stacked cards */}
            <ul className="flex flex-col gap-2 md:hidden">
              {rows.map((f) => (
                <li key={f.id}>
                  <Link
                    href={`/facilities/${f.id}`}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 font-medium">
                        <TypeIcon type={f.type} className="size-4 shrink-0 text-muted-foreground" />
                        <span>{pick(f, "name", locale)}</span>
                      </span>
                      <StatusChip status={f.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{t(`types.${f.type}`)}</span>
                      <span>
                        {t("table.members")}:{" "}
                        <span className="tabular-nums text-foreground">{fmtNumber(f.members, locale)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {t("table.occupancy")}: <OccupancyBar pct={f.occupancy_30d} />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Tablet / desktop: table */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.name")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead className="text-end">{t("table.members")}</TableHead>
                  <TableHead className="text-end">{t("table.activities30d")}</TableHead>
                  <TableHead className="text-end">{t("table.occupancy")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id} className="cursor-pointer" onClick={() => router.push(`/facilities/${f.id}`)}>
                    <TableCell className="min-w-60 max-w-80">
                      <Link
                        href={`/facilities/${f.id}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <TypeIcon type={f.type} className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate" title={pick(f, "name", locale)}>{pick(f, "name", locale)}</span>
                          <span className="truncate text-xs font-normal text-muted-foreground">
                            {t(`types.${f.type}`)} · {pick(f, "commune", locale)} · {t(`offices.${f.office}Short`)}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={f.status} />
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{fmtNumber(f.members, locale)}</TableCell>
                    <TableCell className="text-end tabular-nums">{fmtNumber(f.activities_30d, locale)}</TableCell>
                    <TableCell className="text-end">
                      <OccupancyBar pct={f.occupancy_30d} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
