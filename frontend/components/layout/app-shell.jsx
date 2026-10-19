"use client";

import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { TopBar } from "./top-bar";

export function AppShell({ children }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar; on the start side, so right in Arabic and left in fr/en. */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side={locale === "ar" ? "right" : "left"} className="w-72 border-0 bg-sidebar p-0">
          <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          menuButton={
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label={t("openMenu")}
            >
              <Menu />
            </Button>
          }
        />
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 pb-10 pt-2 md:px-8 md:pt-4">{children}</main>
      </div>
    </div>
  );
}
