import { getTranslations } from "next-intl/server";
import { Agenda } from "@/components/psych/agenda";
import { PageHeader } from "@/components/shared/page-header";
import { requireUsers } from "@/lib/guard";

export default async function Page() {
  await requireUsers(["psychologist"]);
  const t = await getTranslations("psychAgendaPage");
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Agenda />
    </div>
  );
}
