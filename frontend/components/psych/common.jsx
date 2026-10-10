"use client";

import { CalendarCheck, CircleCheck, CircleDashed, CircleX, Clock, ShieldAlert, TrendingDown, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Pill } from "@/components/shared/pill";
import { pick } from "@/lib/format";

export const ALERT_META = {
  attendance_drop: { icon: TrendingDown, tone: "warn" },
  educator_flag: { icon: ShieldAlert, tone: "bad" },
  parent_request: { icon: Users, tone: "info" },
};

const STATUS_META = {
  // cases
  open: { tone: "info", icon: CircleDashed },
  follow_up: { tone: "good", icon: CircleCheck },
  closed: { tone: "neutral", icon: CircleX },
  // alerts / referrals
  new: { tone: "warn", icon: CircleDashed },
  acknowledged: { tone: "info", icon: CircleCheck },
  sent: { tone: "warn", icon: Clock },
  received: { tone: "good", icon: CircleCheck },
  // appointments
  requested: { tone: "warn", icon: Clock },
  confirmed: { tone: "good", icon: CalendarCheck },
  done: { tone: "neutral", icon: CircleCheck },
  cancelled: { tone: "neutral", icon: CircleX },
};

export function StatusPill({ status }) {
  const t = useTranslations("psychStatus");
  const meta = STATUS_META[status] ?? { tone: "neutral" };
  return (
    <Pill tone={meta.tone} icon={meta.icon}>
      {t(status)}
    </Pill>
  );
}

/** Human-readable, factual alert details (the API stores them as key:value pairs). */
export function useAlertDetails() {
  const t = useTranslations("psych");
  return (alert) => {
    const kv = Object.fromEntries(alert.details.split(";").map((p) => p.split(":")));
    if (alert.type === "attendance_drop") {
      const [pa, po] = kv.previous.split("/");
      const [ra, ro] = kv.recent.split("/");
      return t("attendanceDetail", { pa, po, ra, ro });
    }
    if (alert.type === "parent_request") {
      return t("parentRequestDetail", { reason: t(`reason_${kv.reason}`), preferred: t(`preferred_${kv.preferred}`) });
    }
    return t("educatorFlagDetail");
  };
}

export function PersonName({ person, showAge = true }) {
  const t = useTranslations("psych");
  const locale = useLocale();
  return (
    <span>
      <span className="font-medium">{pick(person, "name", locale)}</span>
      {showAge && person.age != null && (
        <span className="ms-1.5 text-xs text-muted-foreground">{t("yearsOld", { n: person.age })}</span>
      )}
      {person.kind === "staff" && <span className="ms-1.5 text-xs text-muted-foreground">({t("staffSubject")})</span>}
    </span>
  );
}
