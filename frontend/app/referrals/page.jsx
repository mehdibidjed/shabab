import { getTranslations } from "next-intl/server";
import { EducatorReferrals } from "@/components/psych/educator";
import { PageHeader } from "@/components/shared/page-header";
import { requireUsers } from "@/lib/guard";

export default async function Page() {
  await requireUsers(["educator"]);
  const t = await getTranslations("educatorPage");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <EducatorReferrals />
    </div>
  );
}
