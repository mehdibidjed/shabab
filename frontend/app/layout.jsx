import { Readex_Pro } from "next/font/google";
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

// Readex Pro: a modern, open typeface drawn for Arabic and Latin together, so
// ar/fr/en share one voice. Variable font: one file covers every weight.
const font = Readex_Pro({
  subsets: ["arabic", "latin"],
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
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
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
