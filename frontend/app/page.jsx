import { MANAGEMENT_USERS } from "@/lib/demo-users";
import { requireUsers } from "@/lib/guard";
import { getTranslations } from "next-intl/server";
import { Overview } from "@/components/dashboard/overview";
import { PageHeader } from "@/components/shared/page-header";
import { ScopeLine } from "@/components/shared/scope-line";

export default async function Home() {
  await requireUsers(MANAGEMENT_USERS);
  const t = await getTranslations("overview");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={<ScopeLine prefix={t("subtitle")} />} />
      <Overview />
    </div>
  );
}
