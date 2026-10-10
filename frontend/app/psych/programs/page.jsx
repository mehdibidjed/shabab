import { getTranslations } from "next-intl/server";
import { Programs } from "@/components/psych/programs";
import { PageHeader } from "@/components/shared/page-header";
import { requireUsers } from "@/lib/guard";

export default async function Page() {
  await requireUsers(["psychologist"]);
  const t = await getTranslations("psychProgramsPage");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Programs />
    </div>
  );
}
