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
  const busy = state.status === "loading";
  return (
    <Card className={cn("relative isolate", className)}>
      {/* soft decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -end-16 -z-10 size-48 rounded-full bg-primary/15 blur-3xl"
      />
      <CardHeader>
        <CardTitle className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
            <Sparkles className={cn("size-4", busy && "animate-pulse")} />
          </span>
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {state.status === "idle" && (
          <div className="fade-in flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center">
            <Sparkles className="size-6 text-primary/70" aria-hidden />
            <p className="max-w-56 text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        )}
        {state.status === "error" && <p className="text-sm text-status-critical">{t("error")}</p>}
        {busy && (
          <div className="flex flex-col gap-2.5">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </span>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
        {state.status === "done" && data && (
          <>
            {data.notice && <p className="text-xs text-muted-foreground">{t("unavailable")}</p>}
            <ol className="stagger flex flex-col gap-2">
              {data.insights.map((ins, i) => {
                const tone = TONE[ins.tone] ?? TONE.info;
                const Icon = tone.icon;
                return (
                  <li key={i} className="flex gap-3 rounded-xl bg-muted/60 p-3">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", tone.className)} aria-hidden />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">{ins.title}</span>
                      <span className="text-[13px] leading-relaxed text-muted-foreground">{ins.text}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Badge variant="outline" className="w-fit text-[11px] font-normal text-muted-foreground">
              {data.source === "deepseek" ? t("sourceDeepseek") : t("sourceDemo")}
            </Badge>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-2 border-0 bg-transparent">
        <Button onClick={generate} disabled={busy} className="h-10 rounded-xl" variant={state.status === "done" ? "outline" : "default"}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {busy ? t("loading") : state.status === "done" ? t("regenerate") : t("generate")}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">{t("disclaimer")}</p>
      </CardFooter>
    </Card>
  );
}
