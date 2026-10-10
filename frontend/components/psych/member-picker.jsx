"use client";

import { Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pick } from "@/lib/format";
import { useApi, useDebounced, withQuery } from "@/lib/hooks";

/** Search a member of the actor's own facility (psychologist / educator). */
export function MemberPicker({ value, onChange }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim());
  const { data } = useApi(value ? null : withQuery("/psych/members", { q: query }));

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{pick(value, "full_name", locale)}</span>
          <span className="ms-2 text-xs text-muted-foreground">
            {t("yearsOld", { n: value.age })} · <bdi dir="ltr">{value.member_no}</bdi>
          </span>
        </span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label={t("change")}>
          <X />
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchMember")} className="ps-8" />
      </div>
      <ul className="max-h-48 overflow-y-auto rounded-lg border">
        {(data ?? []).map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onChange(m)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-muted"
            >
              <span>{pick(m, "full_name", locale)}</span>
              <span className="text-xs text-muted-foreground">{t("yearsOld", { n: m.age })}</span>
            </button>
          </li>
        ))}
        {data && data.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t("noResults")}</li>}
      </ul>
    </div>
  );
}
