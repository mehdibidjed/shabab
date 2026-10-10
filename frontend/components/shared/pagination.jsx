"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { fmtNumber } from "@/lib/format";

export function Pagination({ page, pageSize, total, onPage }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-3 text-sm text-muted-foreground">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {/* "Previous" points to the reading start: right in Arabic, left in fr/en. */}
        <ChevronLeft className="rtl:-scale-x-100" />
        {t("prev")}
      </Button>
      <span className="tabular-nums">
        {t("pageOf", { page: fmtNumber(page, locale), pages: fmtNumber(pages, locale) })}
      </span>
      <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t("next")}
        <ChevronRight className="rtl:-scale-x-100" />
      </Button>
    </div>
  );
}
