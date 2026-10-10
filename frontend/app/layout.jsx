import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { dirOf } from "@/i18n/config";
import { DemoUserProvider } from "@/lib/demo-user";
import { DEMO_USER_COOKIE, isDemoUser } from "@/lib/demo-users";
import "./globals.css";

// One family covering Arabic and Latin keeps ar/fr/en visually consistent.
const font = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-app",
});

export async function generateMetadata() {
  const t = await getTranslations("app");
  return { title: `${t("name")} · ${t("wilaya")}`, description: t("demoBadgeHint") };
}

export default async function RootLayout({ children }) {
  const locale = await getLocale();
  const demoUser = (await cookies()).get(DEMO_USER_COOKIE)?.value;

  return (
    <html lang={locale} dir={dirOf(locale)} className={font.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-muted/40 font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <DemoUserProvider initial={isDemoUser(demoUser) ? demoUser : "djs_director"}>
              <TooltipProvider>
                <AppShell>{children}</AppShell>
              </TooltipProvider>
            </DemoUserProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
