import { getTranslations } from "next-intl/server";
import { YouthSpace } from "@/components/family/youth";
import { PageHeader } from "@/components/shared/page-header";
import { requireUsers } from "@/lib/guard";

export default async function Page() {
  await requireUsers(["young_member"]);
  const t = await getTranslations("youthPage");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <YouthSpace />
    </div>
  );
}
