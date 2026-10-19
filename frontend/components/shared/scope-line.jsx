"use client";

import { Eye, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useDemoUser } from "@/lib/demo-user";
import { pick } from "@/lib/format";
import { useApi } from "@/lib/hooks";

/** Short page subtitle plus a chip naming the user's scope (the role is already in the top bar). */
export function ScopeLine({ prefix }) {
  const t = useTranslations();
  const locale = useLocale();
  const { user } = useDemoUser();
  const { data: root } = useApi("/org/tree");
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>{prefix}</span>
      {root && (
        <span className="fade-in inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
          <MapPin className="size-3" aria-hidden />
          {pick(root, "name", locale)}
        </span>
      )}
      {user === "wali_inspector" && (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
          <Eye className="size-3" aria-hidden />
          {t("topbar.readOnly")}
        </span>
      )}
    </span>
  );
}
