"use client";

import { Activity, Building2, CalendarCheck, HeartHandshake, LayoutDashboard, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./demo-badge";

const NAV = [
  { key: "overview", href: "/", icon: LayoutDashboard, match: (p) => p === "/" },
  { key: "facilities", href: "/#facilities", icon: Building2, match: (p) => p.startsWith("/facilities") },
  { key: "members", href: "/members", icon: Users, match: (p) => p.startsWith("/members") },
  { key: "activities", href: "/activities", icon: Activity, match: (p) => p.startsWith("/activities") },
  { key: "bookings", icon: CalendarCheck },
  { key: "psych", icon: HeartHandshake },
];

export function SidebarContent({ onNavigate }) {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Trophy className="size-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">{t("app.name")}</span>
          <span className="text-xs text-muted-foreground">{t("app.wilaya")}</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const label = t(`nav.${item.key}`);
          if (!("href" in item)) {
            return (
              <span
                key={item.key}
                aria-disabled
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/70"
              >
                <Icon className="size-4" />
                <span className="flex-1">{label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{t("nav.soon")}</span>
              </span>
            );
          }
          const active = item.match(pathname);
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2">
        <DemoBadge />
      </div>
    </div>
  );
}
