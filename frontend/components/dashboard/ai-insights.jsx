"use client";

import { AlertTriangle, Info, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { api } from "@/lib/api";
import { useDemoUser } from "@/lib/demo-user";
import { cn } from "@/lib/utils";

const TONE = {
  positive: { icon: TrendingUp, className: "text-status-good" },
  warning: { icon: AlertTriangle, className: "text-status-warning" },
  info: { icon: Info, className: "text-series-1" },
};

export function AiInsights({ className }) {
  const t = useTranslations("ai");
  const locale = useLocale();
  const { user } = useDemoUser();
  const [state, setState] = useState({ status: "idle" });

  async function generate() {
    setState({ status: "loading" });
    try {
      const data = await api("/ai/insights", user, { method: "POST", body: JSON.stringify({ locale }) });
      setState({ status: "done", data });
    } catch {
      setState({ status: "error" });
    }
  }

  const data = state.data;
  return (
    <Card className={cn("bg-gradient-to-b from-primary/5 to-card", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {state.status === "idle" && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
        {state.status === "error" && <p className="text-sm text-status-critical">{t("error")}</p>}
        {state.status === "loading" &&
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        {state.status === "done" && data && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={data.source === "deepseek" ? "secondary" : "outline"}>
                {data.source === "deepseek" ? t("sourceDeepseek") : t("sourceDemo")}
              </Badge>
            </div>
            {data.notice && <p className="text-xs text-muted-foreground">{t("unavailable")}</p>}
            <ol className="flex flex-col gap-2">
              {data.insights.map((ins, i) => {
                const tone = TONE[ins.tone] ?? TONE.info;
                const Icon = tone.icon;
                return (
                  <li key={i} className="flex gap-3 rounded-lg border bg-background/60 p-3">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", tone.className)} aria-hidden />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{ins.title}</span>
                      <span className="text-sm leading-relaxed text-muted-foreground">{ins.text}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2">
        <Button onClick={generate} disabled={state.status === "loading"}>
          {state.status === "loading" ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {state.status === "loading" ? t("loading") : state.status === "done" ? t("regenerate") : t("generate")}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">{t("disclaimer")}</p>
      </CardFooter>
    </Card>
  );
}
