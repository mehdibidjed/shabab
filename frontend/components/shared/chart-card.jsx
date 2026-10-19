"use client";

import { BarChart3, Table2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Card wrapping a chart with a chart/table toggle (the accessible view of the same data). */
export function ChartCard({ title, description, table, legend, children, className }) {
  const t = useTranslations("charts");
  const [asTable, setAsTable] = useState(false);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {table && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-muted-foreground"
              onClick={() => setAsTable((v) => !v)}
              aria-label={asTable ? t("showChart") : t("showTable")}
              title={asTable ? t("showChart") : t("showTable")}
            >
              {asTable ? <BarChart3 /> : <Table2 />}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {legend && !asTable && legend}
        {asTable && table ? (
          <Table className="fade-in">
            <TableHeader>
              <TableRow>
                {table.columns.map((c, i) => (
                  <TableHead key={c} className={i > 0 ? "text-end" : undefined}>
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((r, i) => (
                <TableRow key={i}>
                  {r.map((v, j) => (
                    <TableCell key={j} className={j > 0 ? "text-end tabular-nums" : undefined}>
                      {v}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function LegendItem({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}
