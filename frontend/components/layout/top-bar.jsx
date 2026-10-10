"use client";

import { Check, Eye, Languages, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
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
import { DEMO_USERS } from "@/lib/demo-users";
import { useApi } from "@/lib/hooks";
import { DemoBadge } from "./demo-badge";

const noopSubscribe = () => () => {};
const LANGUAGE_NAMES = { ar: "العربية", fr: "Français", en: "English" };

export function TopBar({ menuButton }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-6">
      {menuButton}
      <div className="flex-1" />
      <DemoBadge className="hidden sm:inline-flex" />
      <RoleSwitcher />
      <LanguageSwitcher />
      <ThemeSwitcher />
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
            variant="outline"
            size="sm"
            className="max-w-[11rem] gap-2 sm:max-w-xs"
            aria-label={t("topbar.switchRole")}
          />
        }
      >
        {user === "wali_inspector" ? <Eye className="size-4" /> : <UserRound className="size-4" />}
        <span className="truncate">{t(`roles.${user}`)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("topbar.role")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={user}
            onValueChange={(v) => {
              setUser(v);
              // A facility page may be out of the new scope; go back to the overview.
              if (pathname !== "/") router.push("/");
            }}
          >
            {DEMO_USERS.map((k) => (
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
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("language")} />}>
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
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("theme")} />}>
        <Icon />
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
