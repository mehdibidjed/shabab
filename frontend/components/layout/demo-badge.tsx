"use client";

import { FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DemoBadge({ className }: { className?: string }) {
  const t = useTranslations("app");
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge
            variant="outline"
            className={`gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 ${className ?? ""}`}
          />
        }
      >
        <FlaskConical className="size-3" />
        {t("demoBadge")}
      </TooltipTrigger>
      <TooltipContent>{t("demoBadgeHint")}</TooltipContent>
    </Tooltip>
  );
}
