"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Inline marker: lock + "سري — مرئي للنفساني فقط". */
export function ConfidentialTag({ className }) {
  const t = useTranslations("psych");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-800 dark:text-violet-300",
        className,
      )}
    >
      <Lock className="size-3" aria-hidden />
      {t("confidential")}
    </span>
  );
}

/** Wraps a confidential field (notes, answers, plan, report draft) with the marker. */
export function Confidential({ children, className }) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border border-dashed border-violet-500/40 p-3", className)}>
      <ConfidentialTag className="w-fit" />
      {children}
    </div>
  );
}
