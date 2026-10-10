"use client";

import { useTranslations } from "next-intl";
import { useDemoUser } from "@/lib/demo-user";

/** "Indicators within your scope — <role>": makes the role switch visible in the header too. */
export function ScopeLine({ prefix }: { prefix: string }) {
  const t = useTranslations();
  const { user } = useDemoUser();
  return (
    <span>
      {prefix} · <span className="font-medium text-foreground">{t(`roles.${user}`)}</span>
      {user === "wali_inspector" && <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs">{t("topbar.readOnly")}</span>}
    </span>
  );
}
