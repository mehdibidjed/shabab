"use client";

import { CircleCheck, CircleX, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

// Status colours are reserved for state and always paired with an icon + label.
export const STATUS_STYLE = {
  active: { icon: CircleCheck, className: "text-status-good" },
  maintenance: { icon: Wrench, className: "text-status-warning" },
  closed: { icon: CircleX, className: "text-status-critical" },
};

export function StatusChip({ status, className }) {
  const t = useTranslations("status");
  const { icon: Icon, className: color } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <Icon className={cn("size-3.5", color)} aria-hidden />
      {t(status)}
    </span>
  );
}

export function StatusIcon({ status }) {
  const t = useTranslations("status");
  const { icon: Icon, className } = STATUS_STYLE[status];
  return <Icon className={cn("size-3.5 shrink-0", className)} aria-label={t(status)} role="img" />;
}
