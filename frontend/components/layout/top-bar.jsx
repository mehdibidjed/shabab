"use client";

import { Check, ChevronDown, Languages, Monitor, Moon, Sun } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Fragment, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_COOKIE, locales } from "@/i18n/config";

import { setPreferenceCookie } from "@/lib/cookies";
import { useDemoUser } from "@/lib/demo-user";
import { USER_GROUPS, homeOf, isManagement } from "@/lib/demo-users";
import { useApi } from "@/lib/hooks";
import { DemoBadge } from "./demo-badge";
import { RoleAvatar } from "./role-avatar";

const noopSubscribe = () => () => {};
const LANGUAGE_NAMES = { ar: "العربية", fr: "Français", en: "English" };

export function TopBar({ menuButton }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-1.5 bg-background/75 px-3 backdrop-blur-xl md:px-8">
      {menuButton}
      <div className="flex-1" />
      <DemoBadge className="hidden sm:inline-flex" />
      <div className="flex items-center gap-0.5 rounded-full bg-card p-1 shadow-soft">
        <LanguageSwitcher />
        <ThemeSwitcher />
        <RoleSwitcher />
      </div>
    </header>
  );
}

function RoleSwitcher() {
  const t = useTranslations();
  const { user, setUser } = useDemoUser();
  const router = useRouter();
  const pathname = usePathname();
  // Scopes come from the backend so there is a single source of truth.
  const { data } = useApi("/me");
  const scopeOf = (k) => data?.users.find((u) => u.key === k)?.scope;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-8 max-w-[12rem] gap-1.5 rounded-full ps-1 pe-2 sm:max-w-xs sm:gap-2 sm:pe-3"
            aria-label={t("topbar.switchRole")}
          />
        }
      >
        <RoleAvatar user={user} className="size-6" />
        <span className="hidden truncate text-[13px] font-medium sm:inline">{t(`roles.${user}`)}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[80dvh] w-72">
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={user}
            onValueChange={(v) => {
              const stay = isManagement(user) && isManagement(v) && !pathname.startsWith("/facilities/");
              setUser(v);
              // Management roles share the dashboards (they refetch in place); every other
              // switch lands on the new role's own home page.
              if (!stay) router.push(homeOf(v));
            }}
          >
            {USER_GROUPS.map(([group, keys]) => (
              <Fragment key={group}>
                <DropdownMenuLabel className="pt-2 text-[11px] font-normal text-muted-foreground">
                  {t(`topbar.group_${group}`)}
                </DropdownMenuLabel>
                {keys.map((k) => (
                  <DropdownMenuRadioItem key={k} value={k} className="items-start py-2">
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-2">
                        {t(`roles.${k}`)}
                        {k === "wali_inspector" && (
                          <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">
                            {t("topbar.readOnly")}
                          </span>
                        )}
                      </span>
                      <span dir="ltr" className="text-start font-mono text-[11px] text-muted-foreground">
                        {scopeOf(k) ?? "…"}
                      </span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </Fragment>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LanguageSwitcher() {
  const t = useTranslations("topbar");
  const locale = useLocale();
  const router = useRouter();

  const choose = (l) => {
    setPreferenceCookie(LOCALE_COOKIE, l);
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={t("language")} />}>
        <Languages />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
          {locales.map((l) => (
            <DropdownMenuItem key={l} onClick={() => choose(l)} lang={l}>
              <span className="flex-1">{LANGUAGE_NAMES[l]}</span>
              {l === locale && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeSwitcher() {
  const t = useTranslations("topbar");
  const { theme, resolvedTheme, setTheme } = useTheme();
  // false during SSR/hydration, true on the client: the theme is only known client-side.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const Icon = !mounted ? Sun : resolvedTheme === "dark" ? Moon : Sun;
  const options = [
    { value: "light", icon: Sun },
    { value: "dark", icon: Moon },
    { value: "system", icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="rounded-full" aria-label={t("theme")} />}>
        <Icon key={resolvedTheme} className="fade-in transition-transform duration-500 hover:rotate-45" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
          {options.map(({ value, icon: OptIcon }) => (
            <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
              <OptIcon className="size-4" />
              <span className="flex-1">{t(value)}</span>
              {mounted && theme === value && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
