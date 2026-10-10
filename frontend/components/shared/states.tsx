"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ErrorState({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  const t = useTranslations("common");
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-8 text-center text-sm text-muted-foreground", className)}>
      <AlertTriangle className="size-5 text-status-warning" />
      <p>{t("error")}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}

export function LoadingBlock({ className }: { className?: string }) {
  return <Skeleton className={cn("h-56 w-full", className)} />;
}
