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
import { RoleAvatar } from "./role-avatar";

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
    <div className="flex h-full flex-col gap-8 px-4 py-5">
      <Link href={homeOf(user)} onClick={onNavigate} className="group flex items-center gap-3 px-2">
        <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-soft transition-transform duration-300 group-hover:-rotate-6">
          <Trophy className="size-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight">{t("app.name")}</span>
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
                className="flex h-10 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground/60"
              >
                <Icon className="size-[18px]" />
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
              aria-current={active ? "page" : undefined}
              className={cn(
                "group/nav relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-sidebar-foreground/80 transition-all duration-200",
                "hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-soft hover:bg-sidebar-accent",
              )}
            >
              <Icon
                className={cn(
                  "size-[18px] transition-transform duration-200 group-hover/nav:scale-110",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-sidebar-accent p-3 shadow-soft">
          <RoleAvatar user={user} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{t(`roles.${user}`)}</span>
            <span className="truncate text-xs text-muted-foreground">{t("app.wilaya")}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
