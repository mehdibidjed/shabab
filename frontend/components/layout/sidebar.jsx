"use client";

import {
  Activity,
  BellRing,
  Building2,
  CalendarCheck,
  CalendarClock,
  FolderLock,
  HeartHandshake,
  LayoutDashboard,
  MessageSquareHeart,
  Send,
  Sprout,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDemoUser } from "@/lib/demo-user";
import { homeOf } from "@/lib/demo-users";
import { cn } from "@/lib/utils";
import { DemoBadge } from "./demo-badge";

const MANAGEMENT_NAV = [
  { key: "overview", href: "/", icon: LayoutDashboard, match: (p) => p === "/" },
  { key: "facilities", href: "/#facilities", icon: Building2, match: (p) => p.startsWith("/facilities") },
  { key: "members", href: "/members", icon: Users, match: (p) => p.startsWith("/members") },
  { key: "activities", href: "/activities", icon: Activity, match: (p) => p.startsWith("/activities") },
  { key: "bookings", icon: CalendarCheck },
];
// Each Module 2 role sees only its own workspace.
const NAV = {
  psychologist: [
    { key: "psychInbox", href: "/psych", icon: BellRing, match: (p) => p === "/psych" },
    { key: "psychCases", href: "/psych/cases", icon: FolderLock, match: (p) => p.startsWith("/psych/cases") },
    { key: "psychAgenda", href: "/psych/agenda", icon: CalendarClock, match: (p) => p.startsWith("/psych/agenda") },
    { key: "psychPrograms", href: "/psych/programs", icon: Sprout, match: (p) => p.startsWith("/psych/programs") },
  ],
  educator: [{ key: "referrals", href: "/referrals", icon: Send, match: (p) => p.startsWith("/referrals") }],
  parent: [{ key: "family", href: "/family", icon: HeartHandshake, match: (p) => p.startsWith("/family") }],
  young_member: [{ key: "youth", href: "/youth", icon: MessageSquareHeart, match: (p) => p.startsWith("/youth") }],
};

export function SidebarContent({ onNavigate }) {
  const t = useTranslations();
  const pathname = usePathname();
  const { user } = useDemoUser();
  const items = NAV[user] ?? MANAGEMENT_NAV;

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href={homeOf(user)} onClick={onNavigate} className="flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Trophy className="size-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">{t("app.name")}</span>
          <span className="text-xs text-muted-foreground">{t("app.wilaya")}</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
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
