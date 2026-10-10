import { getTranslations } from "next-intl/server";
import { ParentSpace } from "@/components/family/parent";
import { PageHeader } from "@/components/shared/page-header";
import { requireUsers } from "@/lib/guard";

export default async function Page() {
  await requireUsers(["parent"]);
  const t = await getTranslations("parentPage");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <ParentSpace />
    </div>
  );
}
